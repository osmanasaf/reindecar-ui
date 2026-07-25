/**
 * Blok tabanlı belge editörünün veri modeli ve [[SECTION]] düz metin
 * formatıyla iki yönlü dönüşümü. Faz B ile backend PDF üretici bölümleri
 * yazım sırasıyla basar ve aynı tipten birden çok bölümü destekler:
 *
 * - Aynı tipten tekrar eden bloklar _n son ekiyle serileştirilir
 *   (TABLE, TABLE_2, BODY, BODY_2…); ayrıştırırken son ek atılarak tip
 *   çözülür ve sıralama korunur.
 * - Akıllı alanlar HTML'de `<span data-field="key">` olarak yaşar ve
 *   `{{key}}` token'ı olarak serileştirilir; belgelerde de kalıcıdır
 *   (PDF üretiminde backend değerleri çözer, imzada dondurur).
 */

import {
    miniMarkdownToHtml,
    htmlToMiniMarkdown,
    inlineMiniMarkdownToHtml,
    htmlToInlineMiniMarkdown,
    type FieldResolver,
} from './miniMarkdown'

export type TextBlockRole = 'HEADER' | 'TITLE' | 'RECIPIENT' | 'META' | 'INTRO' | 'BODY' | string

export interface TextDocBlock {
    id: string
    type: 'text'
    role: TextBlockRole
    html: string
}

export interface TableDocBlock {
    id: string
    type: 'table'
    /** rows[0] başlık satırıdır; hücreler inline HTML (çip içerebilir) */
    rows: string[][]
}

export interface ListDocBlock {
    id: string
    type: 'list'
    /** Madde inline HTML'leri; numaralar türetilir, saklanmaz */
    items: string[]
    /** İçerik '{{termsBlock}}' token'ından açıldıysa ve maddeler değişmediyse
     *  token olarak geri yazılır (şablon dinamikliği korunur) */
    fromTermsToken?: boolean
    originalItems?: string[]
}

export interface SignatureDocBlock {
    id: string
    type: 'signature'
    /** Her satır inline HTML; 3+ boşluk sol/sağ kolonu ayırır */
    lines: string[]
}

export interface DividerDocBlock {
    id: string
    type: 'divider'
}

export type DocBlock = TextDocBlock | TableDocBlock | ListDocBlock | SignatureDocBlock | DividerDocBlock

export type ChipMode = 'token' | 'resolve'

export interface ParseBlocksOptions {
    /** {{key}} token'ları çipe çevrilsin mi (şablon modu) */
    chips?: boolean
    /** TERMS bölümü '{{termsBlock}}' ise kullanılacak somut maddeler */
    termsFallback?: string[]
}

export interface SerializeBlocksOptions {
    chipMode: ChipMode
    /** chipMode 'resolve' iken kullanılacak değerler */
    placeholders?: Record<string, string>
}

const TEXT_ROLES = new Set(['HEADER', 'TITLE', 'RECIPIENT', 'META', 'INTRO', 'BODY'])
const TERMS_TOKEN = '{{termsBlock}}'
const SIGNATURE_COLUMN_SPLIT = /\s{3,}/

let blockIdCounter = 0
export function nextBlockId(): string {
    blockIdCounter += 1
    return `blk-${blockIdCounter}-${Date.now().toString(36)}`
}

interface RawSection {
    name: string
    body: string
}

/** [[SECTION]] içeriğini sıra ve tekrarları koruyarak ayrıştırır. */
export function parseOrderedSections(content: string): RawSection[] {
    const sections: RawSection[] = []
    if (!content || !content.trim()) return sections

    const prefix = '[['
    let index = 0
    while (index < content.length) {
        const start = content.indexOf(prefix, index)
        if (start < 0) break
        const nameStart = start + prefix.length
        const nameEnd = content.indexOf(']]', nameStart)
        if (nameEnd < 0) break
        const name = content.slice(nameStart, nameEnd).trim()
        const bodyStart = nameEnd + 2
        const next = content.indexOf(prefix, bodyStart)
        const body = next < 0 ? content.slice(bodyStart) : content.slice(bodyStart, next)
        sections.push({ name, body: body.trim() })
        index = next < 0 ? content.length : next
    }

    if (sections.length === 0) {
        sections.push({ name: 'BODY', body: content.trim() })
    }
    return sections
}

function parseTableRows(body: string, options?: ParseBlocksOptions): string[][] {
    const lines = body.split(/\r?\n/).filter((l) => l.trim().length > 0)
    const rows = lines.map((line) => line.split('|').map((cell) => inlineMiniMarkdownToHtml(cell.trim(), { chips: options?.chips })))
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
    return rows.map((row) => {
        while (row.length < width) row.push('')
        return row
    })
}

function parseListItems(body: string, options?: ParseBlocksOptions): string[] {
    return body
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(/^\d+[.)]\s*/, '').replace(/^-\s+/, ''))
        .map((line) => inlineMiniMarkdownToHtml(line, { chips: options?.chips }))
}

function parseSignatureLines(body: string, options?: ParseBlocksOptions): string[] {
    return body
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => inlineMiniMarkdownToHtml(line, { chips: options?.chips }))
}

/** "TABLE_2" → "TABLE": tip çözümü için sondaki _n eki atılır. */
export function sectionBaseName(name: string): string {
    return name.toUpperCase().replace(/_\d+$/, '')
}

/** Backend PDF üreticiyle aynı kural: sayısal/para hücreleri sağa yaslanır. */
const NUMERIC_CELL = /^[-%₺$€]?[\d.,]+ ?(TL|TRY|₺|%|EUR|USD)?$/

export function isNumericCellText(text: string): boolean {
    return NUMERIC_CELL.test(text.trim())
}

export function parseBlocks(content: string, options?: ParseBlocksOptions): DocBlock[] {
    const sections = parseOrderedSections(content)
    const blocks: DocBlock[] = []

    for (const section of sections) {
        const name = sectionBaseName(section.name)

        if (name === 'TABLE') {
            const rows = parseTableRows(section.body, options)
            if (rows.length > 0) blocks.push({ id: nextBlockId(), type: 'table', rows })
            continue
        }

        if (name === 'TERMS') {
            if (section.body === TERMS_TOKEN && options?.termsFallback) {
                const items = options.termsFallback.map((t) => inlineMiniMarkdownToHtml(t, { chips: options?.chips }))
                blocks.push({
                    id: nextBlockId(),
                    type: 'list',
                    items,
                    fromTermsToken: true,
                    originalItems: [...items],
                })
                continue
            }
            const items = parseListItems(section.body, options)
            blocks.push({ id: nextBlockId(), type: 'list', items: items.length > 0 ? items : [''] })
            continue
        }

        if (name === 'SIGNATURE') {
            blocks.push({ id: nextBlockId(), type: 'signature', lines: parseSignatureLines(section.body, options) })
            continue
        }

        if (name === 'DIVIDER') {
            blocks.push({ id: nextBlockId(), type: 'divider' })
            continue
        }

        blocks.push({
            id: nextBlockId(),
            type: 'text',
            role: name,
            html: miniMarkdownToHtml(section.body, { chips: options?.chips }),
        })
    }

    return blocks
}

function makeResolver(options: SerializeBlocksOptions): FieldResolver | undefined {
    if (options.chipMode === 'token') return undefined
    const values = options.placeholders ?? {}
    return (key) => values[key] ?? ''
}

function sanitizeCell(text: string): string {
    return text.replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim()
}

function listItemsEqual(a: string[], b: string[] | undefined): boolean {
    if (!b || a.length !== b.length) return false
    return a.every((item, i) => item === b[i])
}

export function serializeBlocks(blocks: DocBlock[], options: SerializeBlocksOptions): string {
    const resolver = makeResolver(options)
    const sections: Array<{ name: string; lines: string[] }> = []
    const nameCounts = new Map<string, number>()

    const uniqueName = (base: string): string => {
        const count = (nameCounts.get(base) ?? 0) + 1
        nameCounts.set(base, count)
        return count === 1 ? base : `${base}_${count}`
    }

    for (const block of blocks) {
        if (block.type === 'text') {
            const base = sectionBaseName(TEXT_ROLES.has(block.role) ? block.role : block.role || 'BODY')
            const md = htmlToMiniMarkdown(block.html, resolver)
            sections.push({ name: uniqueName(base), lines: md.trim() ? [md] : [] })
            continue
        }

        if (block.type === 'table') {
            const lines = block.rows
                .filter((row) => row.some((cell) => htmlToInlineMiniMarkdown(cell, resolver).trim().length > 0) || row === block.rows[0])
                .map((row) => row.map((cell) => sanitizeCell(htmlToInlineMiniMarkdown(cell, resolver))).join('|'))
            sections.push({ name: uniqueName('TABLE'), lines })
            continue
        }

        if (block.type === 'list') {
            if (block.fromTermsToken && listItemsEqual(block.items, block.originalItems) && options.chipMode === 'token') {
                sections.push({ name: uniqueName('TERMS'), lines: [TERMS_TOKEN] })
                continue
            }
            const lines = block.items
                .map((item) => htmlToInlineMiniMarkdown(item, resolver).trim())
                .filter((item) => item.length > 0)
                .map((item, i) => `${i + 1}. ${item}`)
            sections.push({ name: uniqueName('TERMS'), lines })
            continue
        }

        if (block.type === 'signature') {
            const lines = block.lines
                .map((line) => htmlToInlineMiniMarkdown(line, resolver).trim())
                .filter((line) => line.length > 0)
            sections.push({ name: uniqueName('SIGNATURE'), lines })
            continue
        }

        sections.push({ name: uniqueName('DIVIDER'), lines: [] })
    }

    return sections.map((s) => `[[${s.name}]]\n${s.lines.join('\n')}`).join('\n')
}

/** İmza satırını sol/sağ kolon parçalarına ayırır (3+ boşluk ayırıcı). */
export function splitSignatureLine(lineHtml: string): [string, string] | null {
    const container = document.createElement('div')
    container.innerHTML = lineHtml
    const text = container.textContent ?? ''
    if (!SIGNATURE_COLUMN_SPLIT.test(text)) return null
    const parts = lineHtml.split(SIGNATURE_COLUMN_SPLIT)
    const first = parts[0]
    if (parts.length < 2 || first === undefined) return null
    return [first.trim(), parts.slice(1).join(' ').trim()]
}

/** Yeni blok fabrikaları (blok ekleme menüsü) */
export function createTextBlock(role: TextBlockRole = 'BODY'): TextDocBlock {
    return { id: nextBlockId(), type: 'text', role, html: '<p></p>' }
}

export function createTableBlock(): TableDocBlock {
    return {
        id: nextBlockId(),
        type: 'table',
        rows: [
            ['Başlık 1', 'Başlık 2', 'Başlık 3'],
            ['', '', ''],
        ],
    }
}

export function createListBlock(): ListDocBlock {
    return { id: nextBlockId(), type: 'list', items: [''] }
}

export function createSignatureBlock(): SignatureDocBlock {
    return {
        id: nextBlockId(),
        type: 'signature',
        lines: ['Kiraya Veren: _________________________          Kiracı: _________________________'],
    }
}

export function createDividerBlock(): DividerDocBlock {
    return { id: nextBlockId(), type: 'divider' }
}

export const TEXT_ROLE_LABELS: Record<string, string> = {
    HEADER: 'Üst bilgi',
    TITLE: 'Başlık',
    RECIPIENT: 'Alıcı bilgileri',
    META: 'Belge bilgileri',
    INTRO: 'Giriş',
    BODY: 'Gövde metni',
}
