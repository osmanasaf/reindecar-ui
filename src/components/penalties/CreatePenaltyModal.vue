<script setup lang="ts">
import { ref, watch } from 'vue'
import { penaltiesApi } from '@/api'
import { useForm, useToast, useEnumTranslations } from '@/composables'
import type { CreatePenaltyRequest } from '@/types'

interface Props {
  show: boolean
  rentalId: number
  vehicleId: number
  customerId: number
  driverId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const { violationTypes } = useEnumTranslations()

const initialValues: CreatePenaltyRequest = {
  rentalId: props.rentalId,
  vehicleId: props.vehicleId,
  customerId: props.customerId,
  driverId: props.driverId,
  violationType: 'SPEED',
  violationDate: '',
  violationLocation: '',
  penaltyAmount: 0,
  dueDate: '',
  ticketNumber: '',
  description: '',
  notes: ''
}

const validationRules = {
  violationType: (value: string) => !value ? 'İhlal türü seçilmelidir' : '',
  violationDate: (value: string) => {
    if (!value) return 'İhlal tarihi zorunludur'
    const date = new Date(value)
    if (date > new Date()) return 'İhlal tarihi gelecekte olamaz'
    return ''
  },
  penaltyAmount: (value: number) => {
    if (!value || value <= 0) return 'Ceza tutarı 0\'dan büyük olmalıdır'
    return ''
  },
  violationLocation: (value?: string) => {
    if (value && value.length > 200) return 'İhlal yeri en fazla 200 karakter olabilir'
    return ''
  },
  ticketNumber: (value?: string) => {
    if (value && value.length > 50) return 'Makbuz numarası en fazla 50 karakter olabilir'
    return ''
  },
  description: (value?: string) => {
    if (value && value.length > 1000) return 'Açıklama en fazla 1000 karakter olabilir'
    return ''
  },
  notes: (value?: string) => {
    if (value && value.length > 500) return 'Notlar en fazla 500 karakter olabilir'
    return ''
  }
}

const { values, errors, touched, handleSubmit, validateField, reset } = useForm(
  initialValues,
  validationRules
)

const isSubmitting = ref(false)

const onSubmit = handleSubmit(async (data) => {
  isSubmitting.value = true
  try {
    await penaltiesApi.create(data)
    toast.success('Trafik cezası başarıyla oluşturuldu')
    emit('success')
    emit('close')
    reset()
  } catch (error: any) {
    toast.error(error.message || 'Ceza oluşturulurken hata oluştu')
  } finally {
    isSubmitting.value = false
  }
})

const handleClose = () => {
  reset()
  emit('close')
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    values.rentalId = props.rentalId
    values.vehicleId = props.vehicleId
    values.customerId = props.customerId
    values.driverId = props.driverId
  }
})
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Yeni Trafik Cezası</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form @submit.prevent="onSubmit">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                İhlal Türü <span class="required">*</span>
              </label>
              <select
                v-model="values.violationType"
                class="form-input"
                :class="{ 'error': touched.violationType && errors.violationType }"
                @blur="validateField('violationType')"
              >
                <option value="">Seçiniz</option>
                <option 
                  v-for="(label, value) in violationTypes" 
                  :key="value" 
                  :value="value"
                >
                  {{ label }}
                </option>
              </select>
              <span v-if="touched.violationType && errors.violationType" class="error-text">
                {{ errors.violationType }}
              </span>
            </div>

            <div class="form-group">
              <label class="form-label">
                İhlal Tarihi <span class="required">*</span>
              </label>
              <input
                v-model="values.violationDate"
                type="date"
                class="form-input"
                :class="{ 'error': touched.violationDate && errors.violationDate }"
                :max="new Date().toISOString().split('T')[0]"
                @blur="validateField('violationDate')"
              />
              <span v-if="touched.violationDate && errors.violationDate" class="error-text">
                {{ errors.violationDate }}
              </span>
            </div>
          </div>

          <div class="form-group full-width">
            <label class="form-label">İhlal Yeri</label>
            <input
              v-model="values.violationLocation"
              type="text"
              class="form-input"
              :class="{ 'error': touched.violationLocation && errors.violationLocation }"
              maxlength="200"
              placeholder="İhlal yapılan yer"
              @blur="validateField('violationLocation')"
            />
            <span v-if="touched.violationLocation && errors.violationLocation" class="error-text">
              {{ errors.violationLocation }}
            </span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                Ceza Tutarı (TL) <span class="required">*</span>
              </label>
              <input
                v-model.number="values.penaltyAmount"
                type="number"
                step="0.01"
                class="form-input"
                :class="{ 'error': touched.penaltyAmount && errors.penaltyAmount }"
                placeholder="0.00"
                @blur="validateField('penaltyAmount')"
              />
              <span v-if="touched.penaltyAmount && errors.penaltyAmount" class="error-text">
                {{ errors.penaltyAmount }}
              </span>
            </div>

            <div class="form-group">
              <label class="form-label">Ödeme Vadesi</label>
              <input
                v-model="values.dueDate"
                type="date"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Ceza Makbuzu No</label>
            <input
              v-model="values.ticketNumber"
              type="text"
              class="form-input"
              :class="{ 'error': touched.ticketNumber && errors.ticketNumber }"
              maxlength="50"
              placeholder="Makbuz numarası"
              @blur="validateField('ticketNumber')"
            />
            <span v-if="touched.ticketNumber && errors.ticketNumber" class="error-text">
              {{ errors.ticketNumber }}
            </span>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Açıklama</label>
            <textarea
              v-model="values.description"
              class="form-input"
              :class="{ 'error': touched.description && errors.description }"
              rows="3"
              maxlength="1000"
              placeholder="İhlal detayları..."
              @blur="validateField('description')"
            ></textarea>
            <span v-if="touched.description && errors.description" class="error-text">
              {{ errors.description }}
            </span>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Notlar</label>
            <textarea
              v-model="values.notes"
              class="form-input"
              :class="{ 'error': touched.notes && errors.notes }"
              rows="2"
              maxlength="500"
              placeholder="Ek notlar..."
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
  max-width: 700px;
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

.form-group.full-width {
  grid-column: 1 / -1;
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

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
