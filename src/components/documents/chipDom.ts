/**
 * Akıllı alan çiplerinin DOM temsili. Model HTML'inde çipler boş
 * `<span data-field="key">` olarak durur; ekranda gösterilmeden önce
 * paintChips ile etiket + değer yazılır, modele geri alınırken
 * normalizeChipHtml ile boşaltılır (serileştirme data-field'e bakar).
 */

import { placeholderInfo } from '@/utils/placeholderLabels'

export interface ChipPaintContext {
    /** true → şablon modu (mor, kesikli çerçeve, örnek değer) */
    template: boolean
    /** Şablon modunda yalnızca alan adını göster */
    sampleNames: boolean
    values: Record<string, string>
}

export function chipText(key: string, ctx: ChipPaintContext): string {
    const label = placeholderInfo(key).label
    const value = ctx.values[key] ?? ''
    if (ctx.template && ctx.sampleNames) return label
    return `${label}: ${value || '—'}`
}

export function chipClass(key: string, ctx: ChipPaintContext): string {
    if (ctx.template) return 'rce-chip rce-chip--template'
    const value = ctx.values[key] ?? ''
    return value ? 'rce-chip' : 'rce-chip rce-chip--empty'
}

export function applyChipDom(el: HTMLElement, key: string, ctx: ChipPaintContext) {
    el.className = chipClass(key, ctx)
    el.textContent = chipText(key, ctx)
    el.setAttribute('contenteditable', 'false')
}

/** Model HTML → ekran HTML (çipler boyalı). */
export function paintChips(html: string, ctx: ChipPaintContext): string {
    const container = document.createElement('div')
    container.innerHTML = html ?? ''
    container.querySelectorAll<HTMLElement>('[data-field]').forEach((el) => {
        applyChipDom(el, el.getAttribute('data-field') ?? '', ctx)
    })
    return container.innerHTML
}

/** Ekran HTML → model HTML (çip içerikleri ve sınıfları temizlenir). */
export function normalizeChipHtml(html: string): string {
    const container = document.createElement('div')
    container.innerHTML = html ?? ''
    container.querySelectorAll<HTMLElement>('[data-field]').forEach((el) => {
        el.textContent = ''
        el.removeAttribute('class')
        el.setAttribute('contenteditable', 'false')
    })
    return container.innerHTML
}

/** Yeni çip elementi üretir (DOM'a eklemek için). */
export function createChipElement(key: string, ctx: ChipPaintContext): HTMLElement {
    const el = document.createElement('span')
    el.setAttribute('data-field', key)
    applyChipDom(el, key, ctx)
    return el
}
