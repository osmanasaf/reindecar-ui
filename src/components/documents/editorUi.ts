/**
 * Editör popover'ları ve alan ekleme hedefi için paylaşılan hafif UI durumu.
 * Pinia'ya taşımaya gerek yok: yalnızca editör görünümü yaşarken anlamlı.
 */

import { reactive } from 'vue'
import type { Editor } from '@tiptap/core'

export interface AnchorRect {
    left: number
    top: number
    bottom: number
    right: number
}

export type InsertTarget =
    | { kind: 'tiptap'; editor: Editor }
    | { kind: 'dom'; range: Range }
    | null

interface EditorUiState {
    addMenu: { open: boolean; anchor: AnchorRect | null; index: number }
    fieldPicker: { open: boolean; anchor: AnchorRect | null }
    clauseMenu: { open: boolean; anchor: AnchorRect | null; blockId: string | null }
    chipInfo: { open: boolean; anchor: AnchorRect | null; fieldKey: string | null }
}

export const editorUi = reactive<EditorUiState>({
    addMenu: { open: false, anchor: null, index: 0 },
    fieldPicker: { open: false, anchor: null },
    clauseMenu: { open: false, anchor: null, blockId: null },
    chipInfo: { open: false, anchor: null, fieldKey: null },
})

/* Ekleme hedefi reaktif olmak zorunda değil; Editor örneğini reactive()
   sarmalamak tip ve performans sorunları yaratır. */
let insertTarget: InsertTarget = null

export function getInsertTarget(): InsertTarget {
    return insertTarget
}

export function closeAllMenus() {
    editorUi.addMenu.open = false
    editorUi.fieldPicker.open = false
    editorUi.clauseMenu.open = false
    editorUi.chipInfo.open = false
}

export function anchorFromElement(el: Element): AnchorRect {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, bottom: r.bottom, right: r.right }
}

export function openAddMenu(anchorEl: Element, index: number) {
    closeAllMenus()
    editorUi.addMenu.anchor = anchorFromElement(anchorEl)
    editorUi.addMenu.index = index
    editorUi.addMenu.open = true
}

export function openFieldPicker(anchorEl: Element) {
    closeAllMenus()
    editorUi.fieldPicker.anchor = anchorFromElement(anchorEl)
    editorUi.fieldPicker.open = true
}

export function openClauseMenu(anchorEl: Element, blockId: string) {
    closeAllMenus()
    editorUi.clauseMenu.anchor = anchorFromElement(anchorEl)
    editorUi.clauseMenu.blockId = blockId
    editorUi.clauseMenu.open = true
}

export function openChipInfo(anchorEl: Element, fieldKey: string) {
    closeAllMenus()
    editorUi.chipInfo.anchor = anchorFromElement(anchorEl)
    editorUi.chipInfo.fieldKey = fieldKey
    editorUi.chipInfo.open = true
}

export function setTiptapTarget(editor: Editor) {
    insertTarget = { kind: 'tiptap', editor }
}

export function setDomTarget(range: Range) {
    insertTarget = { kind: 'dom', range: range.cloneRange() }
}
