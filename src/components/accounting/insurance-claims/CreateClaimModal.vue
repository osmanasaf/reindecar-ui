<script setup lang="ts">
import { ref } from 'vue'
import type { CreateClaimRequest, ClaimType } from '@/types'
import { useForm, useToast } from '@/composables'

interface Props {
  show: boolean
  vehicleId: number
  damageReportId: number
  vehicleInsuranceId?: number
  defaultAmount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  submit: [data: CreateClaimRequest]
}>()

const toast = useToast()

const claimTypes: { value: ClaimType; label: string }[] = [
  { value: 'ACCIDENT', label: 'Kaza' },
  { value: 'THEFT', label: 'Hırsızlık' },
  { value: 'NATURAL_DISASTER', label: 'Doğal Afet' },
  { value: 'VANDALISM', label: 'Vandalizm' },
  { value: 'GLASS_DAMAGE', label: 'Cam Hasarı' },
  { value: 'OTHER', label: 'Diğer' }
]

const initialValues: CreateClaimRequest = {
  vehicleInsuranceId: props.vehicleInsuranceId || 0,
  damageReportId: props.damageReportId,
  vehicleId: props.vehicleId,
  claimType: 'ACCIDENT',
  incidentDate: new Date().toISOString().split('T')[0],
  description: '',
  claimedAmount: props.defaultAmount || 0,
  notes: ''
}

const validationRules = {
  vehicleInsuranceId: (value: number) => !value ? 'Sigorta poliçesi seçilmelidir' : '',
  claimType: (value: string) => !value ? 'Başvuru türü seçilmelidir' : '',
  incidentDate: (value: string) => {
    if (!value) return 'Olay tarihi zorunludur'
    const date = new Date(value)
    if (date > new Date()) return 'Olay tarihi gelecekte olamaz'
    return ''
  },
  claimedAmount: (value: number) => {
    if (!value || value <= 0) return 'Talep edilen tutar 0\'dan büyük olmalıdır'
    return ''
  },
  description: (value: string) => {
    if (value && value.length > 1000) return 'Açıklama 1000 karakterden uzun olamaz'
    return ''
  },
  notes: (value: string) => {
    if (value && value.length > 500) return 'Notlar 500 karakterden uzun olamaz'
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
    emit('submit', data)
    reset()
  } catch (error: any) {
    toast.error(error.message || 'Kasko başvurusu oluşturulurken hata oluştu')
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
        <h2 class="modal-title">Kasko Başvurusu Oluştur</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form @submit.prevent="onSubmit">
        <div class="modal-body">
          <div class="alert alert-info">
            Bu hasar için sigorta şirketine tazminat başvurusu yapabilirsiniz.
          </div>

          <div class="form-group">
            <label class="form-label">
              Sigorta Poliçesi <span class="required">*</span>
            </label>
            <select
              v-model.number="values.vehicleInsuranceId"
              class="form-input"
              :class="{ 'error': touched.vehicleInsuranceId && errors.vehicleInsuranceId }"
              @blur="validateField('vehicleInsuranceId')"
            >
              <option :value="0">Seçiniz</option>
              <!-- Insurance policies would be loaded here -->
            </select>
            <span v-if="touched.vehicleInsuranceId && errors.vehicleInsuranceId" class="error-text">
              {{ errors.vehicleInsuranceId }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Başvuru Türü <span class="required">*</span>
            </label>
            <select
              v-model="values.claimType"
              class="form-input"
              :class="{ 'error': touched.claimType && errors.claimType }"
              @blur="validateField('claimType')"
            >
              <option value="">Seçiniz</option>
              <option v-for="type in claimTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
            <span v-if="touched.claimType && errors.claimType" class="error-text">
              {{ errors.claimType }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Olay Tarihi <span class="required">*</span>
            </label>
            <input
              v-model="values.incidentDate"
              type="date"
              class="form-input"
              :class="{ 'error': touched.incidentDate && errors.incidentDate }"
              :max="new Date().toISOString().split('T')[0]"
              @blur="validateField('incidentDate')"
            />
            <span v-if="touched.incidentDate && errors.incidentDate" class="error-text">
              {{ errors.incidentDate }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Talep Edilen Tutar (TL) <span class="required">*</span>
            </label>
            <input
              v-model.number="values.claimedAmount"
              type="number"
              step="0.01"
              class="form-input"
              :class="{ 'error': touched.claimedAmount && errors.claimedAmount }"
              placeholder="0.00"
              @blur="validateField('claimedAmount')"
            />
            <span v-if="touched.claimedAmount && errors.claimedAmount" class="error-text">
              {{ errors.claimedAmount }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Açıklama</label>
            <textarea
              v-model="values.description"
              class="form-input"
              :class="{ 'error': touched.description && errors.description }"
              placeholder="Hasar detayları ve olay bilgileri"
              rows="4"
              maxlength="1000"
              @blur="validateField('description')"
            ></textarea>
            <span v-if="touched.description && errors.description" class="error-text">
              {{ errors.description }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Notlar</label>
            <textarea
              v-model="values.notes"
              class="form-input"
              :class="{ 'error': touched.notes && errors.notes }"
              placeholder="Ek notlar"
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
            {{ isSubmitting ? 'Oluşturuluyor...' : 'Başvuru Oluştur' }}
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
