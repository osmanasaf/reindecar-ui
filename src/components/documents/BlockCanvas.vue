<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RcIcon } from '@/components/icons'
import { useContractEditorStore } from '@/stores/contractEditor.store'
import {
  createTextBlock,
  createTableBlock,
  createListBlock,
  createSignatureBlock,
  createDividerBlock,
  type DocBlock,
} from '@/utils/contractBlocks'
import { inlineMiniMarkdownToHtml } from '@/utils/miniMarkdown'
import TextBlockEditor from './TextBlockEditor.vue'
import TableBlockEditor from './TableBlockEditor.vue'
import ListBlockEditor from './ListBlockEditor.vue'
import SignatureBlockEditor from './SignatureBlockEditor.vue'
import AddBlockMenu from './AddBlockMenu.vue'
import ClauseMenuPopover from './ClauseMenuPopover.vue'
import { openAddMenu } from './editorUi'

const store = useContractEditorStore()
const { blocks, locked } = storeToRefs(store)

const draggingId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)
const dropAfter = ref(false)

function onChange() {
  store.markDirty()
}

function addBlockAt(type: 'text' | 'table' | 'list' | 'signature' | 'divider', index: number) {
  let block: DocBlock
  if (type === 'text') block = createTextBlock('BODY')
  else if (type === 'table') block = createTableBlock()
  else if (type === 'list') block = createListBlock()
  else if (type === 'signature') block = createSignatureBlock()
  else block = createDividerBlock()
  blocks.value.splice(index, 0, block)
  onChange()
}

function deleteBlock(id: string) {
  const index = blocks.value.findIndex((b) => b.id === id)
  if (index >= 0) {
    blocks.value.splice(index, 1)
    onChange()
  }
}

function addClause(text: string, blockId: string) {
  const block = blocks.value.find((b) => b.id === blockId)
  if (block?.type !== 'list') return
  const html = inlineMiniMarkdownToHtml(text)
  if (block.items.length === 1 && !(block.items[0] ?? '').trim()) {
    block.items[0] = html
  } else {
    block.items.push(html)
  }
  onChange()
}

function onAdderClick(event: MouseEvent, index: number) {
  openAddMenu(event.currentTarget as Element, index)
}

/* ────── Sürükle-bırak ────── */

function onGripMouseDown(event: MouseEvent) {
  const blockEl = (event.currentTarget as HTMLElement).closest('[data-block-id]')
  blockEl?.setAttribute('draggable', 'true')
}

function onDragStart(event: DragEvent, id: string) {
  draggingId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event: DragEvent, id: string) {
  if (!draggingId.value || draggingId.value === id) return
  event.preventDefault()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  dropTargetId.value = id
  dropAfter.value = event.clientY > rect.top + rect.height / 2
}

function onDrop() {
  if (!draggingId.value || !dropTargetId.value || draggingId.value === dropTargetId.value) {
    endDrag()
    return
  }
  const fromIndex = blocks.value.findIndex((b) => b.id === draggingId.value)
  let toIndex = blocks.value.findIndex((b) => b.id === dropTargetId.value)
  if (fromIndex < 0 || toIndex < 0) {
    endDrag()
    return
  }
  const [moved] = blocks.value.splice(fromIndex, 1)
  if (!moved) {
    endDrag()
    return
  }
  toIndex = blocks.value.findIndex((b) => b.id === dropTargetId.value)
  blocks.value.splice(dropAfter.value ? toIndex + 1 : toIndex, 0, moved)
  endDrag()
  onChange()
}

function endDrag() {
  document.querySelectorAll('[data-block-id][draggable]').forEach((el) => el.removeAttribute('draggable'))
  draggingId.value = null
  dropTargetId.value = null
}

function blockClasses(block: DocBlock) {
  return {
    'rce-block': true,
    'rce-block--locked': locked.value,
    'rce-block--dragging': draggingId.value === block.id,
    'rce-block--drop-before': dropTargetId.value === block.id && !dropAfter.value,
    'rce-block--drop-after': dropTargetId.value === block.id && dropAfter.value,
  }
}
</script>

<template>
  <div class="rce-paper-shell">
    <div class="rce-paper">
      <template v-for="(block, index) in blocks" :key="block.id">
        <div v-if="!locked" class="rce-adder">
          <span class="rce-adder__line" />
          <button type="button" class="rce-adder__btn" @click="onAdderClick($event, index)">
            <RcIcon name="plus" :size="11" />
            Blok ekle
          </button>
          <span class="rce-adder__line" />
        </div>

        <div
          :class="blockClasses(block)"
          :data-block-id="block.id"
          @dragstart="onDragStart($event, block.id)"
          @dragover="onDragOver($event, block.id)"
          @drop.prevent="onDrop"
          @dragend="endDrag"
        >
          <span v-if="!locked" class="rce-block__handle">
            <span
              class="rce-block__grip"
              title="Taşımak için sürükleyin"
              @mousedown="onGripMouseDown"
            >
              <RcIcon name="grip" :size="14" />
            </span>
            <button
              type="button"
              class="rce-block__del"
              aria-label="Bloğu sil"
              title="Bloğu sil"
              @click="deleteBlock(block.id)"
            >
              <RcIcon name="trash" :size="13" />
            </button>
          </span>

          <TextBlockEditor v-if="block.type === 'text'" :block="block" :locked="locked" @change="onChange" />
          <TableBlockEditor v-else-if="block.type === 'table'" :block="block" :locked="locked" @change="onChange" />
          <ListBlockEditor v-else-if="block.type === 'list'" :block="block" :locked="locked" @change="onChange" />
          <SignatureBlockEditor
            v-else-if="block.type === 'signature'"
            :block="block"
            :locked="locked"
            @change="onChange"
          />
          <div v-else-if="block.type === 'divider'" class="rce-divider" />
        </div>
      </template>

      <div v-if="!locked" class="rce-adder">
        <span class="rce-adder__line" />
        <button type="button" class="rce-adder__btn" @click="onAdderClick($event, blocks.length)">
          <RcIcon name="plus" :size="11" />
          Blok ekle
        </button>
        <span class="rce-adder__line" />
      </div>
    </div>

    <AddBlockMenu @pick="addBlockAt" />
    <ClauseMenuPopover @pick="addClause" />
  </div>
</template>
