<script setup lang="ts">
import { ref, computed } from 'vue'
import { PaymentMethod } from '@/types'
import type { RecordPaymentRequest } from '@/types'
import { useForm, useToast } from '@/composables'
import { formatCurrency } from '@/utils/format'

interface Props {
  show: boolean
  remainingAmount: number
  receivableNumber?: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Ödeme Al'
})

const emit = defineEmits<{
  close: []
  submit: [data: RecordPaymentRequest]
}>()

const toast = useToast()

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.CASH, label: 'Nakit' },
  { value: PaymentMethod.CREDIT_CARD, label: 'Kredi Kartı' },
  { value: PaymentMethod.DEBIT_CARD, label: 'Banka Kartı' },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Havale/EFT' },
  { value: PaymentMethod.ONLINE, label: 'Online Ödeme' }
]

interface PaymentFormValues {
  [key: string]: unknown
  amount: number
  paymentMethod: PaymentMethod
  transactionRef: string
  notes: string
  discountAmount: number
  discountReason: string
}

const initialValues: PaymentFormValues = {
  amount: 0,
  paymentMethod: PaymentMethod.CASH,
  transactionRef: '',
  notes: '',
  discountAmount: 0,
  discountReason: ''
}

const validationRules = {
  amount: (value: number) => {
    if (!value || value <= 0) return 'Ödeme tutarı 0\'dan büyük olmalıdır'
    if (value > props.remainingAmount) return `Tutar kalan tutardan (${formatCurrency(props.remainingAmount)}) fazla olamaz`
    return ''
  },
  paymentMethod: (value: string) => {
    if (!value) return 'Ödeme yöntemi seçilmelidir'
    return ''
  },
  transactionRef: (value: string) => {
    if (value && value.length > 100) return 'İşlem referansı 100 karakterden uzun olamaz'
    return ''
  },
  notes: (value: string) => {
    if (value && value.length > 500) return 'Notlar 500 karakterden uzun olamaz'
    return ''
  },
  discountAmount: (value: number) => {
    if (value < 0) return 'İndirim tutarı negatif olamaz'
    if (value > values.amount) return 'İndirim tutarı ödeme tutarından fazla olamaz'
    return ''
  },
  discountReason: (value: string) => {
    if (value && value.length > 500) return 'İndirim nedeni 500 karakterden uzun olamaz'
    return ''
  }
}

const { values, errors, touched, setFieldValue, validateField, validateAll, reset } = useForm<PaymentFormValues>({
  initialValues,
  validate: (formValues) => ({
    amount: validationRules.amount(formValues.amount),
    paymentMethod: validationRules.paymentMethod(formValues.paymentMethod),
    transactionRef: validationRules.transactionRef(formValues.transactionRef || ''),
    notes: validationRules.notes(formValues.notes || ''),
    discountAmount: validationRules.discountAmount(formValues.discountAmount || 0),
    discountReason: validationRules.discountReason(formValues.discountReason || '')
  })
})

const isSubmitting = ref(false)

const onSubmit = async () => {
  touched.value = {
    amount: true,
    paymentMethod: true,
    transactionRef: true,
    notes: true,
    discountAmount: true,
    discountReason: true
  }

  if (!validateAll()) {
    return
  }

  isSubmitting.value = true
  try {
    emit('submit', {
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      transactionRef: values.transactionRef || undefined,
      notes: values.notes || undefined,
      discountAmount: values.discountAmount > 0 ? values.discountAmount : undefined,
      discountReason: values.discountReason || undefined
    })
    reset()
  } catch (error: any) {
    toast.error(error.message || 'Ödeme kaydedilirken hata oluştu')
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  reset()
  emit('close')
}

const setFullAmount = () => {
  setFieldValue('amount', props.remainingAmount)
}

const netAmount = computed(() => {
  const discount = values.discountAmount || 0
  return Math.max(0, values.amount - discount)
})
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">{{ title }}</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form @submit.prevent="onSubmit">
        <div class="modal-body">
          <div v-if="receivableNumber" class="alert alert-info">
            <strong>Alacak No:</strong> {{ receivableNumber }}
          </div>

          <div class="alert alert-warning">
            <strong>Kalan Tutar:</strong> {{ formatCurrency(remainingAmount) }}
            <button type="button" class="link-btn" @click="setFullAmount">
              (Tamamını Öde)
            </button>
          </div>

          <div v-if="values.discountAmount > 0" class="alert alert-info">
            <strong>Gerçek Ödenecek Tutar:</strong> {{ formatCurrency(netAmount) }}
            <span v-if="values.discountAmount > 0" style="margin-left: 1rem;">
              (İndirim: {{ formatCurrency(values.discountAmount) }})
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Ödeme Tutarı <span class="required">*</span>
            </label>
            <input
              v-model.number="values.amount"
              type="number"
              step="0.01"
              class="form-input"
              :class="{ 'error': touched.amount && errors.amount }"
              placeholder="0.00"
              @blur="validateField('amount')"
            />
            <span v-if="touched.amount && errors.amount" class="error-text">
              {{ errors.amount }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Ödeme Yöntemi <span class="required">*</span>
            </label>
            <select
              v-model="values.paymentMethod"
              class="form-input"
              :class="{ 'error': touched.paymentMethod && errors.paymentMethod }"
              @blur="validateField('paymentMethod')"
            >
              <option value="">Seçiniz</option>
              <option v-for="method in paymentMethods" :key="method.value" :value="method.value">
                {{ method.label }}
              </option>
            </select>
            <span v-if="touched.paymentMethod && errors.paymentMethod" class="error-text">
              {{ errors.paymentMethod }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">İşlem Referansı</label>
            <input
              v-model="values.transactionRef"
              type="text"
              class="form-input"
              :class="{ 'error': touched.transactionRef && errors.transactionRef }"
              placeholder="Opsiyonel"
              maxlength="100"
              @blur="validateField('transactionRef')"
            />
            <span v-if="touched.transactionRef && errors.transactionRef" class="error-text">
              {{ errors.transactionRef }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">İndirim Tutarı</label>
            <input
              v-model.number="values.discountAmount"
              type="number"
              step="0.01"
              min="0"
              class="form-input"
              :class="{ 'error': touched.discountAmount && errors.discountAmount }"
              placeholder="0.00"
              @blur="validateField('discountAmount')"
            />
            <span v-if="touched.discountAmount && errors.discountAmount" class="error-text">
              {{ errors.discountAmount }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">İndirim Nedeni</label>
            <textarea
              v-model="values.discountReason"
              class="form-input"
              :class="{ 'error': touched.discountReason && errors.discountReason }"
              placeholder="Opsiyonel"
              rows="2"
              maxlength="500"
              @blur="validateField('discountReason')"
            ></textarea>
            <span v-if="touched.discountReason && errors.discountReason" class="error-text">
              {{ errors.discountReason }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Notlar</label>
            <textarea
              v-model="values.notes"
              class="form-input"
              :class="{ 'error': touched.notes && errors.notes }"
              placeholder="Opsiyonel"
              rows="3"
              maxlength="500"
              @blur="validateField('notes')"
            ></textarea>
            <span v-if="touched.notes && errors.notes" class="error-text">
              {{ errors.notes }}
            </span>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleClose">
            İptal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet' }}
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
  max-height: 90vh;
  overflow-y: auto;
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

.alert-warning {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.link-btn {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.875rem;
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

textarea.form-input {
  resize: vertical;
  min-height: 4rem;
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

