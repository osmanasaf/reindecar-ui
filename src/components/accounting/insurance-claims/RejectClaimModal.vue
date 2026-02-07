<script setup lang="ts">
import { ref } from 'vue'
import { insuranceClaimsApi } from '@/api'
import { useToast } from '@/composables'

interface Props {
  show: boolean
  claimId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const reason = ref('')
const isSubmitting = ref(false)
const error = ref('')

const validateReason = () => {
  if (!reason.value.trim()) {
    error.value = 'Red sebebi zorunludur'
    return false
  }
  if (reason.value.length > 500) {
    error.value = 'Red sebebi en fazla 500 karakter olabilir'
    return false
  }
  error.value = ''
  return true
}

const handleSubmit = async () => {
  if (!validateReason()) return

  isSubmitting.value = true
  try {
    await insuranceClaimsApi.reject(props.claimId, { reason: reason.value.trim() })
    toast.success('Başvuru reddedildi')
    emit('success')
    emit('close')
  } catch (err: any) {
    toast.error(err.message || 'Başvuru reddedilirken hata oluştu')
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  reason.value = ''
  error.value = ''
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Başvuruyu Reddet</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div class="alert alert-warning">
            Bu sigorta başvurusunu reddetmek üzeresiniz. Red sebebini belirtiniz.
          </div>

          <div class="form-group">
            <label class="form-label">
              Red Sebebi <span class="required">*</span>
            </label>
            <textarea
              v-model="reason"
              class="form-input"
              :class="{ 'error': error }"
              rows="4"
              maxlength="500"
              placeholder="Red sebebini açıklayın..."
              @input="validateReason"
              autofocus
            ></textarea>
            <span v-if="error" class="error-text">{{ error }}</span>
            <span class="char-count">{{ reason.length }}/500</span>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleClose">
            İptal
          </button>
          <button type="submit" class="btn btn-danger" :disabled="isSubmitting">
            {{ isSubmitting ? 'Reddediliyor...' : 'Reddet' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-background, #f3f4f6);
  color: var(--color-text, #111827);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.alert-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #111827);
}

.required {
  color: #dc2626;
}

.form-input {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  resize: vertical;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input.error {
  border-color: #dc2626;
}

.error-text {
  font-size: 0.75rem;
  color: #dc2626;
}

.char-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  text-align: right;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: var(--color-text, #111827);
  border: 1px solid var(--color-border, #d1d5db);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-background, #f3f4f6);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}
</style>
