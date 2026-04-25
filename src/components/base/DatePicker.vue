<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { tr } from 'date-fns/locale'
import '@vuepic/vue-datepicker/dist/main.css'

interface Props {
  modelValue: string | undefined
  min?: string
  max?: string
  placeholder?: string
  label?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Tarih seçin',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  closed: []
}>()

const internalValue = computed({
  get: () => (props.modelValue && props.modelValue.length >= 10 ? new Date(props.modelValue + 'T00:00:00') : null),
  set: (v: Date | null) => {
    if (!v) {
      emit('update:modelValue', '')
      return
    }
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    emit('update:modelValue', `${y}-${m}-${d}`)
  }
})

const minDate = computed(() =>
  props.min ? new Date(props.min + 'T00:00:00') : undefined
)
const maxDate = computed(() =>
  props.max ? new Date(props.max + 'T00:00:00') : undefined
)

function onUpdateModelValue(value: Date | null) {
  if (!value) {
    emit('update:modelValue', '')
    return
  }
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  emit('update:modelValue', `${y}-${m}-${d}`)
}
</script>

<template>
  <div class="date-picker-wrap notranslate" translate="no">
    <label v-if="label" class="date-picker-label">{{ label }}</label>
    <VueDatePicker
      :model-value="internalValue"
      :min-date="minDate"
      :max-date="maxDate"
      :placeholder="placeholder"
      :disabled="disabled"
      :locale="tr"
      format="dd.MM.yyyy"
      :formats="{ input: 'dd.MM.yyyy', preview: 'dd.MM.yyyy' }"
      :enable-time-picker="false"
      auto-apply
      :teleport="false"
      class="date-picker-input date-picker-date-only"
      @update:model-value="onUpdateModelValue"
      @closed="emit('closed')"
    />
  </div>
</template>

<style scoped>
.date-picker-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.date-picker-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.date-picker-wrap :deep(.dp__input) {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  padding: 10px 14px 10px 40px;
  transition: border-color var(--transition-fast);
}

.date-picker-wrap :deep(.dp__input:hover) {
  border-color: var(--color-primary);
}

.date-picker-wrap :deep(.dp__input_focus) {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.date-picker-wrap :deep(.dp__menu) {
  --dp-background-color: var(--color-surface);
  --dp-text-color: var(--color-text);
  --dp-border-color: var(--color-border);
  --dp-menu-border-color: var(--color-border);
  --dp-primary-color: var(--color-primary);
  --dp-primary-text-color: var(--color-text-inverse);
  --dp-hover-color: var(--color-surface-hover);
  --dp-hover-text-color: var(--color-text);
  --dp-secondary-color: var(--color-text-muted);
  --dp-border-color-hover: var(--color-primary);
  --dp-border-color-focus: var(--color-primary);
  --dp-disabled-color: var(--color-bg-secondary);
  --dp-disabled-color-text: var(--color-text-muted);
  --dp-border-radius: var(--radius-md);
  --dp-cell-border-radius: var(--radius-sm);
  --dp-font-family: var(--font-family);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.date-picker-wrap :deep(.dp__cell_inner:hover) {
  background: var(--color-primary-light);
}

.date-picker-wrap :deep(.dp__active_date) {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.date-picker-wrap :deep(.dp__today) {
  border-color: var(--color-primary);
}

.date-picker-wrap :deep(.dp__input_icon) {
  color: var(--color-text-muted);
}

.date-picker-wrap :deep(.dp--tp-wrap > button:first-of-type) {
  display: none !important;
}
</style>

<style>
.dp__menu .dp--tp-wrap > button:first-of-type {
  display: none !important;
}
</style>
