<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import DatePicker from './DatePicker.vue'

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
  return date.toISOString().split('T')[0] ?? ''
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
  if (!target.closest('.rc-date-range')) {
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
  <div class="rc-date-range">
    <button
      type="button"
      class="rc-date-range__trigger"
      :class="{ 'is-active': showDropdown }"
      @click.stop="showDropdown = !showDropdown"
    >
      <svg class="rc-date-range__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span class="rc-date-range__value">{{ displayValue }}</span>
      <span class="rc-date-range__chevron" :class="{ 'is-open': showDropdown }">▼</span>
    </button>

    <div v-if="showDropdown" class="rc-date-range__dropdown" @click.stop>
      <div class="rc-date-range__presets">
        <button
          v-for="preset in presets"
          :key="preset.days"
          type="button"
          class="rc-date-range__preset"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
      </div>

      <div class="rc-date-range__divider" />

      <div class="rc-date-range__custom">
        <div class="rc-date-range__inputs">
          <DatePicker
            v-model="localStart"
            label="Başlangıç"
            :max="localEnd || undefined"
            placeholder="Başlangıç tarihi"
          />
          <DatePicker
            v-model="localEnd"
            label="Bitiş"
            :min="localStart || undefined"
            placeholder="Bitiş tarihi"
          />
        </div>

        <div class="rc-date-range__actions">
          <button type="button" class="rc-date-range__clear" @click="clearRange">
            Temizle
          </button>
          <button
            type="button"
            class="rc-date-range__apply"
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
