<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface DateRange {
  start: string
  end: string
}

interface Preset {
  label: string
  days: number
}

interface Props {
  modelValue: DateRange
  presets?: Preset[]
}

const props = withDefaults(defineProps<Props>(), {
  presets: () => [
    { label: 'Son 7 Gün', days: 7 },
    { label: 'Son 30 Gün', days: 30 },
    { label: 'Bu Ay', days: -1 },
    { label: 'Son 3 Ay', days: 90 },
    { label: 'Son 6 Ay', days: 180 }
  ]
})

const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
  change: [value: DateRange]
}>()

const showDropdown = ref(false)
const localStart = ref(props.modelValue.start)
const localEnd = ref(props.modelValue.end)

const displayValue = computed(() => {
  if (!localStart.value || !localEnd.value) return 'Tarih Seçin'
  
  const start = formatDisplayDate(localStart.value)
  const end = formatDisplayDate(localEnd.value)
  
  if (start === end) return start
  return `${start} - ${end}`
})

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatInputDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function applyPreset(preset: Preset) {
  const end = new Date()
  let start: Date
  
  if (preset.days === -1) {
    start = new Date(end.getFullYear(), end.getMonth(), 1)
  } else {
    start = new Date()
    start.setDate(start.getDate() - preset.days)
  }
  
  localStart.value = formatInputDate(start)
  localEnd.value = formatInputDate(end)
  applyRange()
}

function applyRange() {
  const range: DateRange = {
    start: localStart.value,
    end: localEnd.value
  }
  emit('update:modelValue', range)
  emit('change', range)
  showDropdown.value = false
}

function clearRange() {
  localStart.value = ''
  localEnd.value = ''
  const range: DateRange = { start: '', end: '' }
  emit('update:modelValue', range)
  emit('change', range)
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.date-range-picker')) {
    showDropdown.value = false
  }
}

watch(() => props.modelValue, (newVal) => {
  localStart.value = newVal.start
  localEnd.value = newVal.end
}, { deep: true })

watch(showDropdown, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', handleClickOutside)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<template>
  <div class="date-range-picker">
    <button 
      type="button" 
      class="picker-trigger"
      :class="{ active: showDropdown }"
      @click.stop="showDropdown = !showDropdown"
    >
      <span class="calendar-icon">📅</span>
      <span class="display-value">{{ displayValue }}</span>
      <span class="chevron" :class="{ open: showDropdown }">▼</span>
    </button>

    <div v-if="showDropdown" class="picker-dropdown" @click.stop>
      <div class="presets">
        <button 
          v-for="preset in presets" 
          :key="preset.days"
          type="button"
          class="preset-btn"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
      </div>

      <div class="divider"></div>

      <div class="custom-range">
        <div class="range-inputs">
          <div class="input-group">
            <label>Başlangıç</label>
            <input 
              type="date" 
              v-model="localStart"
              :max="localEnd || undefined"
            />
          </div>
          <div class="input-group">
            <label>Bitiş</label>
            <input 
              type="date" 
              v-model="localEnd"
              :min="localStart || undefined"
            />
          </div>
        </div>

        <div class="range-actions">
          <button 
            type="button" 
            class="clear-btn"
            @click="clearRange"
          >
            Temizle
          </button>
          <button 
            type="button" 
            class="apply-btn"
            :disabled="!localStart || !localEnd"
            @click="applyRange"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.date-range-picker {
  position: relative;
  display: inline-block;
}

.picker-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
}

.picker-trigger:hover,
.picker-trigger.active {
  border-color: var(--color-primary);
}

.calendar-icon {
  font-size: 16px;
}

.display-value {
  flex: 1;
  text-align: left;
}

.chevron {
  font-size: 10px;
  color: var(--color-text-muted);
  transition: transform 0.2s;
}

.chevron.open {
  transform: rotate(180deg);
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  min-width: 280px;
  overflow: hidden;
}

.presets {
  padding: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  padding: 8px 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s;
}

.preset-btn:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.divider {
  height: 1px;
  background: var(--color-border);
}

.custom-range {
  padding: 16px;
}

.range-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input-group input {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
}

.input-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.range-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.clear-btn,
.apply-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.clear-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.clear-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.apply-btn {
  background: var(--color-primary);
  border: none;
  color: white;
}

.apply-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
