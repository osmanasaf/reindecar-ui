<script setup lang="ts">
import { computed } from 'vue'
import type { SignatureDocBlock } from '@/utils/contractBlocks'
import { splitSignatureLine } from '@/utils/contractBlocks'
import EditableHtml from './EditableHtml.vue'

const props = defineProps<{
  block: SignatureDocBlock
  locked: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

const COLUMN_JOIN = '          '

interface SignatureRow {
  index: number
  left: string
  right: string | null
}

const rows = computed<SignatureRow[]>(() =>
  props.block.lines.map((line, index) => {
    const parts = splitSignatureLine(line)
    return parts ? { index, left: parts[0], right: parts[1] } : { index, left: line, right: null }
  }),
)

function updateSplit(index: number, side: 'left' | 'right', value: string) {
  const row = rows.value[index]
  if (!row) return
  const left = side === 'left' ? value : row.left
  const right = side === 'right' ? value : (row.right ?? '')
  // eslint-disable-next-line vue/no-mutating-props
  props.block.lines[index] = `${left}${COLUMN_JOIN}${right}`
  emit('change')
}

function updateWhole(index: number, value: string) {
  // eslint-disable-next-line vue/no-mutating-props
  props.block.lines[index] = value
  emit('change')
}
</script>

<template>
  <div>
    <template v-for="row in rows" :key="row.index">
      <div v-if="row.right !== null" class="rce-signature">
        <EditableHtml
          class="rce-signature__cell"
          :model-value="row.left"
          :locked="locked"
          @update:model-value="(v: string) => updateSplit(row.index, 'left', v)"
        />
        <EditableHtml
          class="rce-signature__cell"
          :model-value="row.right"
          :locked="locked"
          @update:model-value="(v: string) => updateSplit(row.index, 'right', v)"
        />
      </div>
      <EditableHtml
        v-else
        class="rce-signature__line"
        :model-value="row.left"
        :locked="locked"
        @update:model-value="(v: string) => updateWhole(row.index, v)"
      />
    </template>
  </div>
</template>
