<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarBlock } from '@/types/calendar'
import { RENTAL_STATUS_COLORS } from '@/types/calendar'
import { formatDate } from '@/utils/format'

const props = defineProps<{
  block: CalendarBlock
  leftPx: number
  widthPx: number
}>()

const emit = defineEmits<{ click: [] }>()

const isOutOfService = computed(() => props.block.blockType === 'OUT_OF_SERVICE')

const color = computed(() => {
  if (isOutOfService.value) return 'var(--rc-text-faint)'
  return RENTAL_STATUS_COLORS[props.block.rentalStatus ?? ''] ?? 'var(--rc-accent)'
})

const label = computed(() => {
  if (isOutOfService.value) return props.block.vehicleStatus ?? 'Servis Dışı'
  return props.block.rentalNumber ?? props.block.rentalStatus ?? ''
})

const tooltip = computed(() => {
  const start = formatDate(props.block.startDate)
  const end = props.block.endDate ? formatDate(props.block.endDate) : '…'
  return `${label.value} — ${start} → ${end}`
})
</script>

<template>
  <div
    class="rcf-block"
    :class="{ 'rcf-block--oos': isOutOfService, 'rcf-block--draft': block.rentalStatus === 'DRAFT' }"
    :style="{ left: `${leftPx}px`, width: `${widthPx}px`, '--block-color': color }"
    :title="tooltip"
    @click.stop="emit('click')"
  >
    <span class="rcf-block__label">{{ label }}</span>
    <span v-if="block.openEnded" class="rcf-block__infinity">∞</span>
  </div>
</template>

<style scoped>
.rcf-block {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 6px;
  background: var(--block-color);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 6px;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: filter var(--rc-dur-fast, 120ms) var(--rc-ease-out, ease);
}
.rcf-block:hover {
  filter: brightness(1.08);
}
.rcf-block--oos {
  background: repeating-linear-gradient(
    45deg,
    var(--block-color),
    var(--block-color) 4px,
    var(--rc-surface-2) 4px,
    var(--rc-surface-2) 8px
  );
  color: var(--rc-text-muted);
}
.rcf-block--draft {
  opacity: 0.55;
}
.rcf-block__label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.rcf-block__infinity {
  flex-shrink: 0;
}
</style>
