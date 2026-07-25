/**
 * Converts between the TipTap editor's HTML output and the small markdown subset
 * the backend's InlineMarkdownRenderer understands (**bold**, *italic*, "- " bullet
 * lines) — kept in sync with reindecar/service/contract/InlineMarkdownRenderer.java.
 * Backend only supports a single flat bullet syntax, so both bullet and numbered
 * lists round-trip through "- " lines.
 *
 * Akıllı alan desteği: `{{key}}` token'ları `<span data-field="key">` çipine,
 * çipler geri token'a (veya resolver ile gerçek değere) çevrilir.
 */

const INLINE_TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*/g
const FIELD_TOKEN = /\{\{([a-zA-Z0-9_]+)\}\}/g

export type FieldResolver = (key: string) => string

export interface MiniMarkdownOptions {
    /** {{key}} token'larını data-field çiplerine çevir */
    chips?: boolean
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function chipSpan(key: string): string {
    return `<span data-field="${key}" contenteditable="false"></span>`
}

function applyChips(html: string): string {
    return html.replace(FIELD_TOKEN, (_, key: string) => chipSpan(key))
}

function inlineToHtml(line: string, options?: MiniMarkdownOptions): string {
    let html = ''
    let lastEnd = 0
    for (const match of line.matchAll(INLINE_TOKEN)) {
        const start = match.index ?? 0
        if (start > lastEnd) {
            html += escapeHtml(line.slice(lastEnd, start))
        }
        if (match[1] !== undefined) {
            html += `<strong>${escapeHtml(match[1])}</strong>`
        } else {
            html += `<em>${escapeHtml(match[2] ?? '')}</em>`
        }
        lastEnd = start + match[0].length
    }
    html += escapeHtml(line.slice(lastEnd))
    return options?.chips ? applyChips(html) : html
}

/** Tek satırlık inline mini-markdown → HTML (tablo hücresi, madde, imza satırı). */
export function inlineMiniMarkdownToHtml(line: string, options?: MiniMarkdownOptions): string {
    return inlineToHtml(line ?? '', options)
}

export function miniMarkdownToHtml(text: string, options?: MiniMarkdownOptions): string {
    const lines = (text ?? '').split(/\r?\n/)
    const blocks: string[] = []
    let listBuffer: string[] = []

    const flushList = () => {
        if (listBuffer.length > 0) {
            blocks.push(`<ul>${listBuffer.map((item) => `<li><p>${inlineToHtml(item, options)}</p></li>`).join('')}</ul>`)
            listBuffer = []
        }
    }

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (line.startsWith('- ')) {
            listBuffer.push(line.slice(2))
            continue
        }
        flushList()
        if (line.length > 0) {
            blocks.push(`<p>${inlineToHtml(line, options)}</p>`)
        }
    }
    flushList()

    return blocks.join('') || '<p></p>'
}

function elementToMarkdownLine(el: Element, resolver?: FieldResolver): string {
    let text = ''
    for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent ?? ''
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const child = node as Element
            const fieldKey = child.getAttribute('data-field')
            if (fieldKey) {
                text += resolver ? resolver(fieldKey) : `{{${fieldKey}}}`
                continue
            }
            const tag = child.tagName.toLowerCase()
            const inner = elementToMarkdownLine(child, resolver)
            if (tag === 'strong' || tag === 'b') {
                text += `**${inner}**`
            } else if (tag === 'em' || tag === 'i') {
                text += `*${inner}*`
            } else {
                text += inner
            }
        }
    }
    return text
}

/** Tek satırlık HTML → inline mini-markdown; resolver verilirse çipler değere çözülür. */
export function htmlToInlineMiniMarkdown(html: string, resolver?: FieldResolver): string {
    const container = document.createElement('div')
    container.innerHTML = html ?? ''
    return elementToMarkdownLine(container, resolver).trim()
}

export function htmlToMiniMarkdown(html: string, resolver?: FieldResolver): string {
    const container = document.createElement('div')
    container.innerHTML = html ?? ''
    const lines: string[] = []

    for (const block of Array.from(container.children)) {
        const tag = block.tagName.toLowerCase()
        if (tag === 'ul' || tag === 'ol') {
            for (const li of Array.from(block.querySelectorAll('li'))) {
                lines.push(`- ${elementToMarkdownLine(li, resolver).trim()}`)
            }
        } else {
            const line = elementToMarkdownLine(block, resolver).trim()
            if (line.length > 0) {
                lines.push(line)
            }
        }
    }

    return lines.join('\n')
}
