<script setup lang="ts">
import { ref } from 'vue'
import { insuranceClaimsApi } from '@/api'
import { useToast } from '@/composables'

interface Props {
  show: boolean
  claimId: number
  remainingAmount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const amount = ref<number>(props.remainingAmount || 0)
const isSubmitting = ref(false)
const error = ref('')

const validateAmount = () => {
  if (!amount.value || amount.value <= 0) {
    error.value = 'Ödeme tutarı 0\'dan büyük olmalıdır'
    return false
  }
  if (props.remainingAmount && amount.value > props.remainingAmount) {
    error.value = `Ödeme tutarı kalan tutardan (${props.remainingAmount}) fazla olamaz`
    return false
  }
  error.value = ''
  return true
}

const handleSubmit = async () => {
  if (!validateAmount()) return

  isSubmitting.value = true
  try {
    await insuranceClaimsApi.recordPayment(props.claimId, amount.value)
    toast.success('Ödeme başarıyla kaydedildi')
    emit('success')
    emit('close')
  } catch (err: any) {
    toast.error(err.message || 'Ödeme kaydedilirken hata oluştu')
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  amount.value = props.remainingAmount || 0
  error.value = ''
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Ödeme Kaydet</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div class="alert alert-info">
            Sigorta şirketinden alınan tazminat ödemesini kaydedin.
          </div>

          <div class="form-group">
            <label class="form-label">
              Ödeme Tutarı (TL) <span class="required">*</span>
            </label>
            <input
              v-model.number="amount"
              type="number"
              step="0.01"
              class="form-input"
              :class="{ 'error': error }"
              placeholder="0.00"
              @input="validateAmount"
              autofocus
            />
            <span v-if="error" class="error-text">{{ error }}</span>
            <span v-if="remainingAmount" class="help-text">
              Kalan tutar: {{ remainingAmount.toLocaleString('tr-TR') }} TL
            </span>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleClose">
            İptal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Kaydediliyor...' : 'Kaydet' }}
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

.alert-info {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
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

.help-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
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

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark, #1d4ed8);
}
</style>
