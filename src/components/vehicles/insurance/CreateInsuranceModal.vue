<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { vehicleInsurancesApi } from '@/api'
import { useForm, useToast, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import { formatPhoneInput, isValidPhoneNumber, normalizePhoneDigits } from '@/utils/phone'
import type { CreateVehicleInsuranceRequest } from '@/types'

interface Props {
  show: boolean
  vehicleId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const { insuranceTypes } = useEnumTranslations()
const step = ref<'form' | 'documents'>('form')
const createdInsuranceId = ref<number | null>(null)

const insuranceTypeOptions = computed(() =>
  Object.entries(insuranceTypes).map(([value, label]) => ({ value, label: label as string }))
)

const initialValues: CreateVehicleInsuranceRequest = {
  vehicleId: props.vehicleId,
  insuranceType: 'KASKO',
  policyNumber: '',
  company: '',
  startDate: '',
  endDate: '',
  premium: undefined,
  coverage: undefined,
  contactPhone: '',
  notes: ''
}

function validate(
  formValues: CreateVehicleInsuranceRequest
): Partial<Record<keyof CreateVehicleInsuranceRequest, string>> {
  const err: Partial<Record<keyof CreateVehicleInsuranceRequest, string>> = {}
  if (!formValues.insuranceType) err.insuranceType = 'Sigorta türü seçilmelidir'
  if (!formValues.startDate) err.startDate = 'Başlangıç tarihi zorunludur'
  if (!formValues.endDate) {
    err.endDate = 'Bitiş tarihi zorunludur'
  } else if (formValues.startDate && formValues.endDate < formValues.startDate) {
    err.endDate = 'Bitiş tarihi başlangıçtan sonra olmalıdır'
  }
  if (formValues.policyNumber && formValues.policyNumber.length > 50) {
    err.policyNumber = 'Poliçe numarası en fazla 50 karakter olabilir'
  }
  if (formValues.company && formValues.company.length > 100) {
    err.company = 'Şirket adı en fazla 100 karakter olabilir'
  }
  if (formValues.contactPhone && !isValidPhoneNumber(formValues.contactPhone)) {
    err.contactPhone = 'Telefon 10 haneli olmalidir'
  }
  if (formValues.notes && formValues.notes.length > 500) {
    err.notes = 'Notlar en fazla 500 karakter olabilir'
  }
  return err
}

const { values, errors, touched, handleSubmit, validateField, reset, isSubmitting } = useForm({
  initialValues,
  validate,
  async onSubmit(data) {
    try {
      const created = await vehicleInsurancesApi.create({
        ...data,
        contactPhone: data.contactPhone ? normalizePhoneDigits(data.contactPhone) : ''
      })
      toast.success('Sigorta poliçesi başarıyla eklendi')
      createdInsuranceId.value = created.id
      step.value = 'documents'
      reset()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Poliçe oluşturulurken hata oluştu')
      throw err
    }
  }
})

const handleClose = () => {
  reset()
  step.value = 'form'
  createdInsuranceId.value = null
  emit('close')
}

const handleDocumentsDone = () => {
  emit('success')
  handleClose()
}

function handleContactPhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  values.contactPhone = formatPhoneInput(target.value)
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    values.vehicleId = props.vehicleId
    step.value = 'form'
    createdInsuranceId.value = null
  }
})
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">{{ step === 'form' ? 'Yeni Sigorta Poliçesi' : 'Poliçe Belgeleri' }}</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <template v-if="step === 'documents' && createdInsuranceId">
        <div class="modal-body documents-step">
          <DocumentsSection
            reference-type="INSURANCE"
            :reference-id="createdInsuranceId"
            title="Poliçe belgeleri (isteğe bağlı)"
          />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" @click="handleDocumentsDone">
            Tamamla
          </button>
        </div>
      </template>

      <form v-else @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group full-width">
              <label class="form-label">
                Sigorta Türü <span class="required">*</span>
              </label>
              <SearchableSelect
                v-model="values.insuranceType"
                :options="insuranceTypeOptions"
                placeholder="Seçiniz"
                search-placeholder="Sigorta türü ara..."
                :error="!!(touched.insuranceType && errors.insuranceType)"
                @blur="validateField('insuranceType')"
              />
              <span v-if="touched.insuranceType && errors.insuranceType" class="error-text">
                {{ errors.insuranceType }}
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Poliçe Numarası</label>
              <input
                v-model="values.policyNumber"
                type="text"
                class="form-input"
                :class="{ 'error': touched.policyNumber && errors.policyNumber }"
                maxlength="50"
                @blur="validateField('policyNumber')"
              />
              <span v-if="touched.policyNumber && errors.policyNumber" class="error-text">
                {{ errors.policyNumber }}
              </span>
            </div>

            <div class="form-group">
              <label class="form-label">Sigorta Şirketi</label>
              <input
                v-model="values.company"
                type="text"
                class="form-input"
                :class="{ 'error': touched.company && errors.company }"
                maxlength="100"
                @blur="validateField('company')"
              />
              <span v-if="touched.company && errors.company" class="error-text">
                {{ errors.company }}
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                Başlangıç Tarihi <span class="required">*</span>
              </label>
              <input
                v-model="values.startDate"
                type="date"
                class="form-input"
                :class="{ 'error': touched.startDate && errors.startDate }"
                @blur="validateField('startDate')"
              />
              <span v-if="touched.startDate && errors.startDate" class="error-text">
                {{ errors.startDate }}
              </span>
            </div>

            <div class="form-group">
              <label class="form-label">
                Bitiş Tarihi <span class="required">*</span>
              </label>
              <input
                v-model="values.endDate"
                type="date"
                class="form-input"
                :class="{ 'error': touched.endDate && errors.endDate }"
                @blur="validateField('endDate')"
              />
              <span v-if="touched.endDate && errors.endDate" class="error-text">
                {{ errors.endDate }}
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Prim Tutarı (TL)</label>
              <input
                v-model.number="values.premium"
                type="number"
                step="0.01"
                class="form-input"
                placeholder="0.00"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Teminat Tutarı (TL)</label>
              <input
                v-model.number="values.coverage"
                type="number"
                step="0.01"
                class="form-input"
                placeholder="0.00"
              />
            </div>
          </div>

          <div class="form-group full-width">
            <label class="form-label">İletişim Telefonu</label>
            <input
              v-model="values.contactPhone"
              type="tel"
              inputmode="numeric"
              class="form-input"
              :class="{ 'error': touched.contactPhone && errors.contactPhone }"
              maxlength="13"
              placeholder="555 111 11 11"
              @input="handleContactPhoneInput"
              @blur="validateField('contactPhone')"
            />
            <span v-if="touched.contactPhone && errors.contactPhone" class="error-text">
              {{ errors.contactPhone }}
            </span>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Notlar</label>
            <textarea
              v-model="values.notes"
              class="form-input"
              :class="{ 'error': touched.notes && errors.notes }"
              rows="3"
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

.modal-body.documents-step {
  max-height: 60vh;
  overflow-y: auto;
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
