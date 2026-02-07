<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { validators, validate, type ValidationRule } from '@/utils/validation'

interface Props {
  modelValue: number | string
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  decimals?: number
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  step: 1,
  decimals: 0
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'blur': []
}>()

const touched = ref(false)
const errorMessage = ref('')
const displayValue = ref('')

const rules = computed(() => {
  const r: ValidationRule[] = []
  if (props.required) {
    r.push(validators.required(`${props.label} zorunludur`))
  }
  if (props.min !== undefined) {
    r.push(validators.min(props.min))
  }
  if (props.max !== undefined) {
    r.push(validators.max(props.max))
  }
  return r
})

function formatNumber(value: number): string {
  if (isNaN(value)) return ''
  
  const formatted = value.toLocaleString('tr-TR', {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals
  })
  
  let result = formatted
  if (props.prefix) result = `${props.prefix} ${result}`
  if (props.suffix) result = `${result} ${props.suffix}`
  
  return result
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

function validateInput() {
  if (!touched.value) return
  
  const numValue = typeof props.modelValue === 'number' ? props.modelValue : parseNumber(String(props.modelValue))
  const result = validate(numValue, rules.value)
  errorMessage.value = result.valid ? '' : result.errors[0]
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const numValue = parseNumber(target.value)
  
  emit('update:modelValue', numValue)
  
  if (touched.value) {
    validateInput()
  }
}

function handleBlur() {
  touched.value = true
  const numValue = typeof props.modelValue === 'number' ? props.modelValue : parseNumber(String(props.modelValue))
  displayValue.value = formatNumber(numValue)
  validateInput()
  emit('blur')
}

function handleFocus() {
  const numValue = typeof props.modelValue === 'number' ? props.modelValue : parseNumber(String(props.modelValue))
  displayValue.value = numValue > 0 ? String(numValue) : ''
}

watch(() => props.modelValue, (newVal) => {
  const numValue = typeof newVal === 'number' ? newVal : parseNumber(String(newVal))
  if (!touched.value || document.activeElement?.tagName !== 'INPUT') {
    displayValue.value = formatNumber(numValue)
  }
  if (touched.value) {
    validateInput()
  }
}, { immediate: true })

defineExpose({
  validate: () => {
    touched.value = true
    validateInput()
    return !errorMessage.value
  },
  reset: () => {
    touched.value = false
    errorMessage.value = ''
    displayValue.value = ''
  }
})
</script>

<template>
  <div class="number-input">
    <label v-if="label" class="input-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <input
      v-model="displayValue"
      type="text"
      inputmode="decimal"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="['input-field', { error: touched && errorMessage }]"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    <span v-if="touched && errorMessage" class="error-message">
      {{ errorMessage }}
    </span>
  </div>
</template>

<style scoped>
.number-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.required {
  color: var(--color-danger);
}

.input-field {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  background: var(--color-surface);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-field.error {
  border-color: var(--color-danger);
  background: rgba(239, 68, 68, 0.05);
}

.input-field:disabled {
  background: var(--color-bg-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.error-message {
  font-size: 12px;
  color: var(--color-danger);
  margin-top: -2px;
}
</style>
