<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ServiceProviderResponse, UpdateServiceProviderRequest } from '@/types'
import { ProviderType, ServiceType } from '@/types'
import { useForm, useEnumTranslations } from '@/composables'

interface Props {
  show: boolean
  provider: ServiceProviderResponse | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  submit: [id: number, data: UpdateServiceProviderRequest]
}>()

const { translateProviderType, translateServiceType } = useEnumTranslations()

const providerTypeOptions = Object.values(ProviderType).map(value => ({
  value,
  label: translateProviderType(value)
}))

const serviceTypeOptions = Object.values(ServiceType).map(value => ({
  value,
  label: translateServiceType(value)
}))

const getInitialValues = (): UpdateServiceProviderRequest => ({
  name: props.provider?.name || '',
  type: props.provider?.type || ProviderType.REPAIR_SHOP,
  taxNumber: props.provider?.taxNumber || '',
  taxOffice: props.provider?.taxOffice || '',
  address: props.provider?.address || '',
  city: props.provider?.city || '',
  district: props.provider?.district || '',
  phone: props.provider?.phone || '',
  email: props.provider?.email || '',
  contactPerson: props.provider?.contactPerson || '',
  contactPhone: props.provider?.contactPhone || '',
  serviceTypes: props.provider?.serviceTypes || [],
  notes: props.provider?.notes || ''
})

const selectedServiceTypes = ref<ServiceType[]>(props.provider?.serviceTypes || [])

const validate = (data: UpdateServiceProviderRequest) => {
  const formErrors: Partial<Record<keyof UpdateServiceProviderRequest, string>> = {}

  if (!data.name) {
    formErrors.name = 'Firma adi zorunludur'
  } else if (data.name.length > 200) {
    formErrors.name = 'Firma adi 200 karakterden uzun olamaz'
  }

  if (!data.type) {
    formErrors.type = 'Saglayici tipi zorunludur'
  }

  if (data.taxNumber && data.taxNumber.length > 11) {
    formErrors.taxNumber = 'Vergi numarasi 11 karakterden uzun olamaz'
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    formErrors.email = 'Gecerli bir e-posta adresi giriniz'
  }

  return formErrors
}

const { values, errors, touched, handleSubmit, validateField, reset, isSubmitting } = useForm<UpdateServiceProviderRequest>({
  initialValues: getInitialValues(),
  validate,
  onSubmit: async (data) => {
    if (!props.provider) return

    const request: UpdateServiceProviderRequest = {
      ...data,
      serviceTypes: selectedServiceTypes.value.length > 0 ? selectedServiceTypes.value : undefined
    }
    emit('submit', props.provider.id, request)
  }
})

const onSubmit = async () => {
  await handleSubmit()
}

const handleClose = () => {
  reset()
  emit('close')
}

const toggleServiceType = (type: ServiceType) => {
  const index = selectedServiceTypes.value.indexOf(type)
  if (index === -1) {
    selectedServiceTypes.value.push(type)
  } else {
    selectedServiceTypes.value.splice(index, 1)
  }
}

watch(() => props.provider, (newVal) => {
  if (newVal) {
    values.name = newVal.name
    values.type = newVal.type
    values.taxNumber = newVal.taxNumber || ''
    values.taxOffice = newVal.taxOffice || ''
    values.address = newVal.address || ''
    values.city = newVal.city || ''
    values.district = newVal.district || ''
    values.phone = newVal.phone || ''
    values.email = newVal.email || ''
    values.contactPerson = newVal.contactPerson || ''
    values.contactPhone = newVal.contactPhone || ''
    values.notes = newVal.notes || ''
    selectedServiceTypes.value = [...(newVal.serviceTypes || [])]
  }
}, { immediate: true })
</script>

<template>
  <div v-if="show && provider" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Servis Sağlayıcı Düzenle</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form @submit.prevent="onSubmit">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group flex-2">
              <label class="form-label">
                Firma Adı <span class="required">*</span>
              </label>
              <input
                v-model="values.name"
                type="text"
                class="form-input"
                :class="{ 'error': touched.name && errors.name }"
                placeholder="Firma adı"
                maxlength="200"
                @blur="validateField('name')"
              />
              <span v-if="touched.name && errors.name" class="error-text">
                {{ errors.name }}
              </span>
            </div>

            <div class="form-group flex-1">
              <label class="form-label">
                Sağlayıcı Tipi <span class="required">*</span>
              </label>
              <select
                v-model="values.type"
                class="form-input"
                :class="{ 'error': touched.type && errors.type }"
                @blur="validateField('type')"
              >
                <option v-for="option in providerTypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <span v-if="touched.type && errors.type" class="error-text">
                {{ errors.type }}
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Vergi Numarası</label>
              <input
                v-model="values.taxNumber"
                type="text"
                class="form-input"
                :class="{ 'error': touched.taxNumber && errors.taxNumber }"
                placeholder="12345678901"
                maxlength="11"
                @blur="validateField('taxNumber')"
              />
              <span v-if="touched.taxNumber && errors.taxNumber" class="error-text">
                {{ errors.taxNumber }}
              </span>
            </div>

            <div class="form-group">
              <label class="form-label">Vergi Dairesi</label>
              <input
                v-model="values.taxOffice"
                type="text"
                class="form-input"
                placeholder="Vergi dairesi"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Adres</label>
            <textarea
              v-model="values.address"
              class="form-input"
              placeholder="Adres"
              rows="2"
              maxlength="500"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Şehir</label>
              <input
                v-model="values.city"
                type="text"
                class="form-input"
                placeholder="İstanbul"
                maxlength="100"
              />
            </div>

            <div class="form-group">
              <label class="form-label">İlçe</label>
              <input
                v-model="values.district"
                type="text"
                class="form-input"
                placeholder="Kadıköy"
                maxlength="100"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Telefon</label>
              <input
                v-model="values.phone"
                type="tel"
                class="form-input"
                placeholder="02121234567"
                maxlength="20"
              />
            </div>

            <div class="form-group">
              <label class="form-label">E-posta</label>
              <input
                v-model="values.email"
                type="email"
                class="form-input"
                :class="{ 'error': touched.email && errors.email }"
                placeholder="info@firma.com"
                maxlength="100"
                @blur="validateField('email')"
              />
              <span v-if="touched.email && errors.email" class="error-text">
                {{ errors.email }}
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">İletişim Kişisi</label>
              <input
                v-model="values.contactPerson"
                type="text"
                class="form-input"
                placeholder="Ahmet Yılmaz"
                maxlength="100"
              />
            </div>

            <div class="form-group">
              <label class="form-label">İletişim Telefonu</label>
              <input
                v-model="values.contactPhone"
                type="tel"
                class="form-input"
                placeholder="05321234567"
                maxlength="20"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Hizmet Türleri</label>
            <div class="service-types-grid">
              <label
                v-for="option in serviceTypeOptions"
                :key="option.value"
                class="checkbox-label"
                :class="{ 'selected': selectedServiceTypes.includes(option.value) }"
              >
                <input
                  type="checkbox"
                  :checked="selectedServiceTypes.includes(option.value)"
                  @change="toggleServiceType(option.value)"
                />
                {{ option.label }}
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notlar</label>
            <textarea
              v-model="values.notes"
              class="form-input"
              placeholder="Ek notlar..."
              rows="3"
              maxlength="1000"
            ></textarea>
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
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-row .form-group.flex-2 {
  flex: 2;
}

.form-row .form-group.flex-1 {
  flex: 1;
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
  min-height: 2.5rem;
}

.service-types-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-background, #f9fafb);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.checkbox-label:hover {
  border-color: var(--color-primary, #2563eb);
}

.checkbox-label.selected {
  background: #eff6ff;
  border-color: var(--color-primary, #2563eb);
  color: var(--color-primary, #2563eb);
}

.checkbox-label input {
  accent-color: var(--color-primary, #2563eb);
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
    flex-direction: column;
  }

  .service-types-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

