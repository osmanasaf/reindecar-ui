/**
 * TipTap inline atom node'u: akıllı alan çipi.
 * `<span data-field="key">` olarak parse/serialize edilir; görünümü NodeView
 * ile reaktif boyanır (placeholder değerleri veya örnek veri değişince
 * kendini günceller) ve tıklanınca kaynak popover'ı açılır.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { watchEffect } from 'vue'
import type { ChipPaintContext } from './chipDom'
import { applyChipDom } from './chipDom'
import { openChipInfo } from './editorUi'

export interface FieldChipOptions {
    getContext: () => ChipPaintContext
}

export const FieldChip = Node.create<FieldChipOptions>({
    name: 'fieldChip',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,

    addOptions() {
        return {
            getContext: () => ({ template: false, sampleNames: false, values: {} }),
        }
    },

    addAttributes() {
        return {
            field: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-field') ?? '',
                renderHTML: (attributes) => ({ 'data-field': attributes.field as string }),
            },
        }
    },

    parseHTML() {
        return [{ tag: 'span[data-field]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { contenteditable: 'false' })]
    },

    addNodeView() {
        const getContext = this.options.getContext
        return ({ node }) => {
            const dom = document.createElement('span')
            const key = (node.attrs.field as string) ?? ''
            dom.setAttribute('data-field', key)

            const stop = watchEffect(() => {
                applyChipDom(dom, key, getContext())
            })

            const onClick = (event: MouseEvent) => {
                event.preventDefault()
                event.stopPropagation()
                openChipInfo(dom, key)
            }
            dom.addEventListener('click', onClick)

            return {
                dom,
                destroy() {
                    stop()
                    dom.removeEventListener('click', onClick)
                },
            }
        }
    },
})
