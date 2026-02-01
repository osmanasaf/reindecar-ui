<script setup lang="ts">
import { ref } from 'vue'
import type { CreatePayableRequest, PayableType, ServiceProviderResponse } from '@/types'
import { useForm, useToast } from '@/composables'
import { useAccountingStore } from '@/stores'
import { onMounted } from 'vue'

interface Props {
  show: boolean
  sourceId?: number
  sourceType?: string
  defaultDescription?: string
  defaultAmount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  submit: [data: CreatePayableRequest]
}>()

const toast = useToast()
const accountingStore = useAccountingStore()

const payableTypes: { value: PayableType; label: string }[] = [
  { value: 'REPAIR_COST', label: 'Onarım Maliyeti' },
  { value: 'MAINTENANCE_COST', label: 'Bakım Maliyeti' },
  { value: 'PARTS_COST', label: 'Parça Maliyeti' },
  { value: 'SUPPLIER_COST', label: 'Tedarikçi Maliyeti' },
  { value: 'OTHER', label: 'Diğer' }
]

const providers = ref<ServiceProviderResponse[]>([])

const initialValues: CreatePayableRequest = {
  type: 'MAINTENANCE_COST',
  serviceProviderId: 0,
  description: props.defaultDescription || '',
  amount: props.defaultAmount || 0,
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: ''
}

const validationRules = {
  type: (value: string) => !value ? 'Verecek türü seçilmelidir' : '',
  serviceProviderId: (value: number) => !value ? 'Servis sağlayıcı seçilmelidir' : '',
  description: (value: string) => {
    if (!value) return 'Açıklama zorunludur'
    if (value.length < 10) return 'Açıklama en az 10 karakter olmalıdır'
    if (value.length > 500) return 'Açıklama 500 karakterden uzun olamaz'
    return ''
  },
  amount: (value: number) => {
    if (!value || value <= 0) return 'Tutar 0\'dan büyük olmalıdır'
    return ''
  },
  invoiceNumber: (value: string) => {
    if (value && value.length > 50) return 'Fatura numarası 50 karakterden uzun olamaz'
    return ''
  }
}

const { values, errors, touched, handleSubmit, validateField, reset } = useForm(
  initialValues,
  validationRules
)

const isSubmitting = ref(false)

onMounted(async () => {
  try {
    providers.value = await accountingStore.fetchServiceProviders(true)
  } catch (error) {
    toast.error('Servis sağlayıcılar yüklenemedi')
  }
})

const onSubmit = handleSubmit(async (data) => {
  isSubmitting.value = true
  try {
    emit('submit', data)
    reset()
  } catch (error: any) {
    toast.error(error.message || 'Verecek oluşturulurken hata oluştu')
  } finally {
    isSubmitting.value = false
  }
})

const handleClose = () => {
  reset()
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Yeni Verecek Oluştur</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form @submit.prevent="onSubmit">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">
              Verecek Türü <span class="required">*</span>
            </label>
            <select
              v-model="values.type"
              class="form-input"
              :class="{ 'error': touched.type && errors.type }"
              @blur="validateField('type')"
            >
              <option value="">Seçiniz</option>
              <option v-for="type in payableTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
            <span v-if="touched.type && errors.type" class="error-text">
              {{ errors.type }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Servis Sağlayıcı <span class="required">*</span>
            </label>
            <select
              v-model.number="values.serviceProviderId"
              class="form-input"
              :class="{ 'error': touched.serviceProviderId && errors.serviceProviderId }"
              @blur="validateField('serviceProviderId')"
            >
              <option :value="0">Seçiniz</option>
              <option v-for="provider in providers" :key="provider.id" :value="provider.id">
                {{ provider.name }} ({{ provider.code }})
              </option>
            </select>
            <span v-if="touched.serviceProviderId && errors.serviceProviderId" class="error-text">
              {{ errors.serviceProviderId }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Açıklama <span class="required">*</span>
            </label>
            <textarea
              v-model="values.description"
              class="form-input"
              :class="{ 'error': touched.description && errors.description }"
              placeholder="Verecek açıklaması"
              rows="3"
              maxlength="500"
              @blur="validateField('description')"
            ></textarea>
            <span v-if="touched.description && errors.description" class="error-text">
              {{ errors.description }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Tutar (TL) <span class="required">*</span>
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

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fatura Numarası</label>
              <input
                v-model="values.invoiceNumber"
                type="text"
                class="form-input"
                :class="{ 'error': touched.invoiceNumber && errors.invoiceNumber }"
                placeholder="FT2026-001"
                maxlength="50"
                @blur="validateField('invoiceNumber')"
              />
              <span v-if="touched.invoiceNumber && errors.invoiceNumber" class="error-text">
                {{ errors.invoiceNumber }}
              </span>
            </div>

            <div class="form-group">
              <label class="form-label">Fatura Tarihi</label>
              <input
                v-model="values.invoiceDate"
                type="date"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Vade Tarihi</label>
            <input
              v-model="values.dueDate"
              type="date"
              class="form-input"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleClose">
            İptal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Oluşturuluyor...' : 'Verecek Oluştur' }}
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
  max-width: 600px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
