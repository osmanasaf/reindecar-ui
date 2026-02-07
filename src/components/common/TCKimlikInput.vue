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
  placeholder: '12345678901'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
}>()

const touched = ref(false)
const errorMessage = ref('')

const rules = computed(() => {
  const r: ValidationRule[] = []
  if (props.required) {
    r.push(validators.required(`${props.label} zorunludur`))
  }
  r.push(validators.tcKimlik())
  return r
})

function validateInput() {
  if (!touched.value) return
  
  const result = validate(props.modelValue, rules.value)
  errorMessage.value = result.valid ? '' : result.errors[0]
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '').slice(0, 11)
  emit('update:modelValue', value)
  
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
  <div class="tc-kimlik-input">
    <label v-if="label" class="input-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <input
      :value="modelValue"
      type="text"
      inputmode="numeric"
      maxlength="11"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="['input-field', { error: touched && errorMessage, valid: touched && !errorMessage && modelValue.length === 11 }]"
      @input="handleInput"
      @blur="handleBlur"
    />
    <span v-if="touched && errorMessage" class="error-message">
      {{ errorMessage }}
    </span>
    <span v-else-if="touched && !errorMessage && modelValue.length === 11" class="success-message">
      ✓ Geçerli TC Kimlik No
    </span>
  </div>
</template>

<style scoped>
.tc-kimlik-input {
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
  letter-spacing: 1px;
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

.input-field.valid {
  border-color: var(--color-success);
  background: rgba(16, 185, 129, 0.05);
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

.success-message {
  font-size: 12px;
  color: var(--color-success);
  margin-top: -2px;
}
</style>
