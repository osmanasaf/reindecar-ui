/**
 * Converts between the TipTap editor's HTML output and the small markdown subset
 * the backend's InlineMarkdownRenderer understands (**bold**, *italic*, "- " bullet
 * lines) — kept in sync with reindecar/service/contract/InlineMarkdownRenderer.java.
 * Backend only supports a single flat bullet syntax, so both bullet and numbered
 * lists round-trip through "- " lines.
 */

const INLINE_TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*/g

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function inlineToHtml(line: string): string {
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
    return html
}

export function miniMarkdownToHtml(text: string): string {
    const lines = (text ?? '').split(/\r?\n/)
    const blocks: string[] = []
    let listBuffer: string[] = []

    const flushList = () => {
        if (listBuffer.length > 0) {
            blocks.push(`<ul>${listBuffer.map((item) => `<li><p>${inlineToHtml(item)}</p></li>`).join('')}</ul>`)
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
            blocks.push(`<p>${inlineToHtml(line)}</p>`)
        }
    }
    flushList()

    return blocks.join('') || '<p></p>'
}

function elementToMarkdownLine(el: Element): string {
    let text = ''
    for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent ?? ''
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const child = node as Element
            const tag = child.tagName.toLowerCase()
            const inner = elementToMarkdownLine(child)
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

export function htmlToMiniMarkdown(html: string): string {
    const container = document.createElement('div')
    container.innerHTML = html ?? ''
    const lines: string[] = []

    for (const block of Array.from(container.children)) {
        const tag = block.tagName.toLowerCase()
        if (tag === 'ul' || tag === 'ol') {
            for (const li of Array.from(block.querySelectorAll('li'))) {
                lines.push(`- ${elementToMarkdownLine(li).trim()}`)
            }
        } else {
            const line = elementToMarkdownLine(block).trim()
            if (line.length > 0) {
                lines.push(line)
            }
        }
    }

    return lines.join('\n')
}
