import type { CSSProperties } from 'vue'
import type { AnchorRect } from './editorUi'

/** Popover'ı anchor'ın altına, sığmıyorsa üstüne, yatayda viewport içine oturtur. */
export function popoverStyle(anchor: AnchorRect | null, width: number, estimatedHeight: number): CSSProperties {
    if (!anchor) return { display: 'none' }
    const margin = 12
    let left = Math.min(anchor.left, window.innerWidth - width - 16)
    left = Math.max(margin, left)
    let top = anchor.bottom + 6
    if (top + estimatedHeight > window.innerHeight - margin) {
        top = Math.max(margin, anchor.top - estimatedHeight - 6)
    }
    return { left: `${left}px`, top: `${top}px` }
}
