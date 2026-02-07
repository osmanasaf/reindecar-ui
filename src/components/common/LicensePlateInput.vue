<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { validators, validate, type ValidationRule } from '@/utils/validation'

interface Props {
  modelValue: string
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  placeholder: '34 ABC 123'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
}>()

const touched = ref(false)
const errorMessage = ref('')

const licensePlatePattern = /^(0[1-9]|[1-7][0-9]|8[01])\s?[A-Z]{1,3}\s?\d{2,4}$/

const rules = computed(() => {
  const r: ValidationRule[] = []
  if (props.required) {
    r.push(validators.required(`${props.label} zorunludur`))
  }
  r.push(validators.pattern(licensePlatePattern, 'Geçerli bir plaka giriniz (örn: 34 ABC 123)'))
  return r
})

function validateInput() {
  if (!touched.value) return
  
  const result = validate(props.modelValue, rules.value)
  errorMessage.value = result.valid ? '' : result.errors[0]
}

function formatLicensePlate(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
  
  if (cleaned.length <= 2) {
    return cleaned
  }
  
  const cityCode = cleaned.slice(0, 2)
  const rest = cleaned.slice(2)
  
  const letters = rest.replace(/[^A-Z]/g, '')
  const numbers = rest.replace(/[^0-9]/g, '')
  
  if (letters.length === 0) {
    return cityCode
  }
  
  if (numbers.length === 0) {
    return `${cityCode} ${letters}`
  }
  
  return `${cityCode} ${letters} ${numbers}`
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const formatted = formatLicensePlate(target.value)
  emit('update:modelValue', formatted)
  
  if (touched.value) {
    validateInput()
  }
}

function handleBlur() {
  touched.value = true
  validateInput()
  emit('blur')
}

watch(() => props.modelValue, () => {
  if (touched.value) {
    validateInput()
  }
})

defineExpose({
  validate: () => {
    touched.value = true
    validateInput()
    return !errorMessage.value
  },
  reset: () => {
    touched.value = false
    errorMessage.value = ''
  }
})
</script>

<template>
  <div class="license-plate-input">
    <label v-if="label" class="input-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="['input-field', { error: touched && errorMessage }]"
      @input="handleInput"
      @blur="handleBlur"
    />
    <span v-if="touched && errorMessage" class="error-message">
      {{ errorMessage }}
    </span>
  </div>
</template>

<style scoped>
.license-plate-input {
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
  font-family: monospace;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
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
