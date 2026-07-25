<script setup lang="ts">
import { isNumericCellText, type TableDocBlock } from '@/utils/contractBlocks'
import EditableHtml from './EditableHtml.vue'

const props = defineProps<{
  block: TableDocBlock
  locked: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

function isNumericCell(rowIndex: number, colIndex: number): boolean {
  return isNumericCellText(stripHtml(props.block.rows[rowIndex]?.[colIndex] ?? ''))
}

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

function updateCell(rowIndex: number, colIndex: number, value: string) {
  const row = props.block.rows[rowIndex]
  if (!row) return
  row[colIndex] = value
  emit('change')
}

function addRow() {
  const width = props.block.rows[0]?.length ?? 1
  // eslint-disable-next-line vue/no-mutating-props
  props.block.rows.push(new Array(width).fill(''))
  emit('change')
}

function removeRow() {
  if (props.block.rows.length <= 2) return
  // eslint-disable-next-line vue/no-mutating-props
  props.block.rows.pop()
  emit('change')
}

function addColumn() {
  props.block.rows.forEach((row, i) => {
    row.push(i === 0 ? 'Yeni sütun' : '')
  })
  emit('change')
}

function removeColumn() {
  if ((props.block.rows[0]?.length ?? 0) <= 1) return
  props.block.rows.forEach((row) => {
    row.pop()
  })
  emit('change')
}
</script>

<template>
  <div>
    <span v-if="!locked" class="rce-block__tools rce-block__tools--raised">
      <button type="button" class="rce-tool-pill" @click.stop="addRow">+ Satır</button>
      <button type="button" class="rce-tool-pill rce-tool-pill--danger" @click.stop="removeRow">− Satır</button>
      <button type="button" class="rce-tool-pill" @click.stop="addColumn">+ Sütun</button>
      <button type="button" class="rce-tool-pill rce-tool-pill--danger" @click.stop="removeColumn">− Sütun</button>
    </span>
    <table class="rce-table">
      <tbody>
        <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
          <EditableHtml
            v-for="(cell, colIndex) in row"
            :key="colIndex"
            tag="td"
            :class="{ 'rce-table__num': rowIndex > 0 && isNumericCell(rowIndex, colIndex) }"
            :model-value="cell"
            :locked="locked"
            @update:model-value="(v: string) => updateCell(rowIndex, colIndex, v)"
          />
        </tr>
      </tbody>
    </table>
  </div>
</template>

