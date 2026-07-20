<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import CalendarBlockBar from './CalendarBlockBar.vue'
import type { CalendarBlock, VehicleCalendarRow } from '@/types/calendar'

const DAY_WIDTH = 34

const props = defineProps<{
  rows: VehicleCalendarRow[]
  from: string
  to: string
  hideDrafts: boolean
}>()

const emit = defineEmits<{
  blockClick: [block: CalendarBlock, row: VehicleCalendarRow]
  emptyRangeSelect: [selection: { vehicleId: number; startDate: string; endDate: string }]
}>()

const pendingSelection = ref<{ vehicleId: number; dayIndex: number } | null>(null)

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

const days = computed<string[]>(() => {
  const result: string[] = []
  const cursor = new Date(`${props.from}T00:00:00Z`)
  const end = new Date(`${props.to}T00:00:00Z`)
  while (cursor.getTime() <= end.getTime()) {
    result.push(toIsoDate(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
})

const todayIso = toIsoDate(new Date())
const trackWidth = computed(() => days.value.length * DAY_WIDTH)

function dayIndexOf(dateIso: string): number {
  const idx = days.value.indexOf(dateIso)
  return idx === -1 ? 0 : idx
}

function dayLabel(dateIso: string): { day: string; showMonth: boolean; month: string } {
  const date = new Date(`${dateIso}T00:00:00Z`)
  const day = String(date.getUTCDate())
  const isFirstOfMonth = date.getUTCDate() === 1
  const isFirstDay = dateIso === days.value[0]
  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  return {
    day,
    showMonth: isFirstOfMonth || isFirstDay,
    month: monthNames[date.getUTCMonth()] ?? '',
  }
}

function visibleBlocks(row: VehicleCalendarRow): CalendarBlock[] {
  if (!props.hideDrafts) return row.blocks
  return row.blocks.filter((b) => b.rentalStatus !== 'DRAFT')
}

function blockGeometry(block: CalendarBlock): { leftPx: number; widthPx: number } {
  const startIdx = dayIndexOf(block.startDate)
  const endIdx = block.endDate ? dayIndexOf(block.endDate) : days.value.length - 1
  const leftPx = startIdx * DAY_WIDTH
  const widthPx = Math.max(DAY_WIDTH, (endIdx - startIdx + 1) * DAY_WIDTH - 2)
  return { leftPx, widthPx }
}

function isPendingCell(vehicleId: number, dayIndex: number): boolean {
  return pendingSelection.value?.vehicleId === vehicleId && pendingSelection.value.dayIndex === dayIndex
}

function handleTrackClick(event: MouseEvent, row: VehicleCalendarRow) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const offsetX = event.clientX - rect.left
  const dayIndex = Math.min(days.value.length - 1, Math.max(0, Math.floor(offsetX / DAY_WIDTH)))

  const pending = pendingSelection.value
  if (!pending || pending.vehicleId !== row.vehicleId) {
    pendingSelection.value = { vehicleId: row.vehicleId, dayIndex }
    return
  }

  const startIdx = Math.min(pending.dayIndex, dayIndex)
  const endIdx = Math.max(pending.dayIndex, dayIndex)
  pendingSelection.value = null
  emit('emptyRangeSelect', {
    vehicleId: row.vehicleId,
    startDate: days.value[startIdx] ?? props.from,
    endDate: days.value[endIdx] ?? props.to,
  })
}

function cancelSelection() {
  pendingSelection.value = null
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') cancelSelection()
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

defineExpose({ cancelSelection })
</script>

<template>
  <div class="rcf-grid-wrap">
    <div v-if="pendingSelection" class="rcf-selection-hint">
      Bitiş tarihi için ikinci güne tıklayın
      <button type="button" class="rcf-selection-hint__cancel" @click="cancelSelection">İptal</button>
    </div>

    <div class="rcf-grid-scroll">
      <div class="rcf-grid">
        <div class="rcf-header">
          <div class="rcf-corner">Araç</div>
          <div class="rcf-days" :style="{ width: `${trackWidth}px` }">
            <div
              v-for="d in days"
              :key="d"
              class="rcf-day-cell rcf-day-cell--header"
              :class="{ 'rcf-day-cell--today': d === todayIso }"
            >
              <span v-if="dayLabel(d).showMonth" class="rcf-day-cell__month">{{ dayLabel(d).month }}</span>
              <span class="rcf-day-cell__num">{{ dayLabel(d).day }}</span>
            </div>
          </div>
        </div>

        <div v-for="row in rows" :key="row.vehicleId" class="rcf-row">
          <div class="rcf-label">
            <div class="rcf-label__plate">{{ row.plateNumber }}</div>
            <div class="rcf-label__sub">{{ row.brand }} {{ row.model }}</div>
          </div>
          <div
            class="rcf-track"
            :style="{ width: `${trackWidth}px` }"
            @click="handleTrackClick($event, row)"
          >
            <div
              v-for="d in days"
              :key="d"
              class="rcf-day-cell"
              :class="{
                'rcf-day-cell--today': d === todayIso,
                'rcf-day-cell--pending': isPendingCell(row.vehicleId, dayIndexOf(d)),
              }"
            />
            <CalendarBlockBar
              v-for="(block, idx) in visibleBlocks(row)"
              :key="idx"
              :block="block"
              v-bind="blockGeometry(block)"
              @click="emit('blockClick', block, row)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rcf-grid-wrap {
  position: relative;
}
.rcf-selection-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--rc-accent-subtle);
  border-radius: 8px;
  font-size: 12.5px;
  margin-bottom: 8px;
}
.rcf-selection-hint__cancel {
  border: none;
  background: none;
  color: var(--rc-accent);
  font-weight: 600;
  cursor: pointer;
  font-size: 12.5px;
}
.rcf-grid-scroll {
  overflow: auto;
  border: 1px solid var(--rc-border);
  border-radius: 10px;
  max-height: 70vh;
}
.rcf-grid {
  display: flex;
  flex-direction: column;
  min-width: max-content;
}
.rcf-header,
.rcf-row {
  display: flex;
}
.rcf-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--rc-surface-2);
}
.rcf-corner {
  position: sticky;
  left: 0;
  z-index: 3;
  width: 220px;
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--rc-text-muted);
  background: var(--rc-surface-2);
  border-bottom: 1px solid var(--rc-border);
  border-right: 1px solid var(--rc-border);
}
.rcf-days {
  display: flex;
}
.rcf-row {
  border-bottom: 1px solid var(--rc-border-subtle);
}
.rcf-row:hover {
  background: var(--rc-surface-hover);
}
.rcf-label {
  position: sticky;
  left: 0;
  z-index: 1;
  width: 220px;
  flex-shrink: 0;
  padding: 8px 12px;
  background: var(--rc-surface);
  border-right: 1px solid var(--rc-border);
}
.rcf-row:hover .rcf-label {
  background: var(--rc-surface-hover);
}
.rcf-label__plate {
  font-weight: 600;
  font-size: 12.5px;
  font-family: var(--rc-font-mono, monospace);
}
.rcf-label__sub {
  font-size: 11.5px;
  color: var(--rc-text-muted);
}
.rcf-track {
  position: relative;
  display: flex;
  cursor: crosshair;
}
.rcf-day-cell {
  width: 34px;
  flex-shrink: 0;
  border-right: 1px solid var(--rc-border-subtle);
  box-sizing: border-box;
}
.rcf-day-cell--header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  font-size: 10.5px;
  color: var(--rc-text-muted);
  border-bottom: 1px solid var(--rc-border);
}
.rcf-day-cell__month {
  font-size: 9px;
  font-weight: 700;
  color: var(--rc-accent);
}
.rcf-day-cell--today {
  background: var(--rc-accent-subtle);
}
.rcf-day-cell--pending {
  background: var(--rc-warning-200);
}
</style>
