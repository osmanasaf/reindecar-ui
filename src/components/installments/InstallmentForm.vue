<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInstallmentStore } from '@/stores/installment.store'
import { validateStartDate, validatePositiveNumber, validateInstallmentCount } from '@/utils/installmentHelpers'
import type { CreateVehicleInstallmentRequest } from '@/types'

interface Props {
  vehicleId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const installmentStore = useInstallmentStore()

const formData = ref<CreateVehicleInstallmentRequest>({
  totalAmount: 0,
  monthlyPayment: 0,
  numberOfInstallments: 1,
  startDate: '',
  notes: ''
})

const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const lastEditedField = ref<'total' | 'monthly'>('monthly')

const calculatedMonthly = computed(() => {
  if (formData.value.numberOfInstallments === 0) return 0
  return formData.value.totalAmount / formData.value.numberOfInstallments
})

const calculatedTotal = computed(() => {
  return formData.value.monthlyPayment * formData.value.numberOfInstallments
})

function validateForm(): boolean {
  errors.value = {}

  if (!validatePositiveNumber(formData.value.totalAmount)) {
    errors.value.totalAmount = 'Toplam tutar pozitif bir sayı olmalıdır'
  }

  if (!validatePositiveNumber(formData.value.monthlyPayment)) {
    errors.value.monthlyPayment = 'Aylık ödeme pozitif bir sayı olmalıdır'
  }

  if (!validateInstallmentCount(formData.value.numberOfInstallments)) {
    errors.value.numberOfInstallments = 'Taksit sayısı en az 1 olmalıdır'
  }

  if (!formData.value.startDate) {
    errors.value.startDate = 'Başlangıç tarihi gereklidir'
  } else if (!validateStartDate(formData.value.startDate)) {
    errors.value.startDate = 'Başlangıç tarihi geçmişte olamaz'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) return

  submitting.value = true
  try {
    const result = await installmentStore.createInstallment(props.vehicleId, formData.value)
    if (result) {
      emit('success')
      resetForm()
    }
  } finally {
    submitting.value = false
  }
}

function resetForm(): void {
  formData.value = {
    totalAmount: 0,
    monthlyPayment: 0,
    numberOfInstallments: 1,
    startDate: '',
    notes: ''
  }
  errors.value = {}
  lastEditedField.value = 'monthly'
}

function handleCancel(): void {
  resetForm()
  emit('cancel')
}

function onTotalChange(): void {
  lastEditedField.value = 'total'
  if (formData.value.totalAmount > 0 && formData.value.numberOfInstallments > 0) {
    formData.value.monthlyPayment = Math.round(calculatedMonthly.value * 100) / 100
  }
}

function onMonthlyChange(): void {
  lastEditedField.value = 'monthly'
  if (formData.value.monthlyPayment > 0 && formData.value.numberOfInstallments > 0) {
    formData.value.totalAmount = Math.round(calculatedTotal.value * 100) / 100
  }
}

function onInstallmentCountChange(): void {
  if (formData.value.numberOfInstallments > 0) {
    if (lastEditedField.value === 'total' && formData.value.totalAmount > 0) {
      formData.value.monthlyPayment = Math.round(calculatedMonthly.value * 100) / 100
    } else if (lastEditedField.value === 'monthly' && formData.value.monthlyPayment > 0) {
      formData.value.totalAmount = Math.round(calculatedTotal.value * 100) / 100
    }
  }
}
</script>

<template>
  <div class="installment-form">
    <h3 class="form-title">Yeni Taksit Planı Oluştur</h3>

    <form @submit.prevent="handleSubmit">
      <div class="form-grid">
        <div class="form-group full-width">
          <label for="totalAmount" class="form-label">
            Toplam Tutar <span class="required">*</span>
          </label>
          <input
            id="totalAmount"
            v-model.number="formData.totalAmount"
            type="number"
            step="0.01"
            min="0"
            class="form-input"
            :class="{ 'has-error': errors.totalAmount }"
            @input="onTotalChange"
            placeholder="Örn: 500000"
          />
          <span v-if="errors.totalAmount" class="error-message">{{ errors.totalAmount }}</span>
        </div>

        <div class="form-group">
          <label for="numberOfInstallments" class="form-label">
            Taksit Sayısı <span class="required">*</span>
          </label>
          <input
            id="numberOfInstallments"
            v-model.number="formData.numberOfInstallments"
            type="number"
            min="1"
            class="form-input"
            :class="{ 'has-error': errors.numberOfInstallments }"
            @input="onInstallmentCountChange"
            placeholder="Örn: 50"
          />
          <span v-if="errors.numberOfInstallments" class="error-message">{{ errors.numberOfInstallments }}</span>
        </div>

        <div class="form-group">
          <label for="monthlyPayment" class="form-label">
            Aylık Ödeme <span class="required">*</span>
          </label>
          <input
            id="monthlyPayment"
            v-model.number="formData.monthlyPayment"
            type="number"
            step="0.01"
            min="0"
            class="form-input"
            :class="{ 'has-error': errors.monthlyPayment }"
            @input="onMonthlyChange"
            placeholder="Örn: 10000"
          />
          <span v-if="errors.monthlyPayment" class="error-message">{{ errors.monthlyPayment }}</span>
          <span v-if="lastEditedField === 'total' && formData.monthlyPayment > 0" class="help-text success">
            ✓ Otomatik hesaplandı
          </span>
        </div>

        <div class="form-group full-width">
          <label for="startDate" class="form-label">
            Başlangıç Tarihi <span class="required">*</span>
          </label>
          <input
            id="startDate"
            v-model="formData.startDate"
            type="date"
            class="form-input"
            :class="{ 'has-error': errors.startDate }"
          />
          <span v-if="errors.startDate" class="error-message">{{ errors.startDate }}</span>
        </div>

        <div class="form-group full-width">
          <label for="notes" class="form-label">Notlar</label>
          <textarea
            id="notes"
            v-model="formData.notes"
            rows="3"
            maxlength="1000"
            class="form-input"
            placeholder="Opsiyonel notlar..."
          />
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="handleCancel" :disabled="submitting">
          İptal
        </button>
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          {{ submitting ? 'Oluşturuluyor...' : 'Oluştur' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.installment-form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 24px 0;
  color: var(--color-text);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: span 2;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.required {
  color: var(--color-danger);
}

.form-input {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.form-input.has-error {
  border-color: var(--color-danger);
}

.help-text {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.help-text.success {
  color: var(--color-success);
  font-weight: 500;
}

.error-message {
  font-size: 12px;
  color: var(--color-danger);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-secondary);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group.full-width {
    grid-column: span 1;
  }
}
</style>
