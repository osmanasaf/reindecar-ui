<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ServiceProviderResponse, UpdateServiceProviderRequest } from '@/types'
import { ProviderType, ServiceType } from '@/types'
import { useForm, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import { formatPhoneInput, isValidPhoneNumber, normalizePhoneDigits } from '@/utils/phone'
import { RcModal, RcButton } from '@/components/rc'

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
  phone: formatPhoneInput(props.provider?.phone || ''),
  email: props.provider?.email || '',
  contactPerson: props.provider?.contactPerson || '',
  contactPhone: formatPhoneInput(props.provider?.contactPhone || ''),
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

  if (data.phone && !isValidPhoneNumber(data.phone)) {
    formErrors.phone = 'Telefon numarasi 10 haneli olmalidir'
  }

  if (data.contactPhone && !isValidPhoneNumber(data.contactPhone)) {
    formErrors.contactPhone = 'Iletisim telefonu 10 haneli olmalidir'
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
      phone: data.phone ? normalizePhoneDigits(data.phone) : '',
      contactPhone: data.contactPhone ? normalizePhoneDigits(data.contactPhone) : '',
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

function handlePhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  values.phone = formatPhoneInput(target.value)
}

function handleContactPhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  values.contactPhone = formatPhoneInput(target.value)
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
    values.phone = formatPhoneInput(newVal.phone || '')
    values.email = newVal.email || ''
    values.contactPerson = newVal.contactPerson || ''
    values.contactPhone = formatPhoneInput(newVal.contactPhone || '')
    values.notes = newVal.notes || ''
    selectedServiceTypes.value = [...(newVal.serviceTypes || [])]
  }
}, { immediate: true })
</script>

<template>
  <RcModal :open="show && !!provider" title="Servis sağlayıcı düzenle" xl @close="handleClose">
      <form id="edit-provider-form" @submit.prevent="onSubmit">
        <div class="rca-modal-form">
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
              <SearchableSelect
                :model-value="values.type ?? null"
                :options="providerTypeOptions"
                placeholder="Seçiniz"
                search-placeholder="Ara..."
                :error="!!(touched.type && errors.type)"
                @update:model-value="(v) => values.type = (v as typeof values.type) ?? values.type"
                @blur="validateField('type')"
              />
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
                inputmode="numeric"
                class="form-input"
                :class="{ 'error': touched.phone && errors.phone }"
                placeholder="555 111 11 11"
                maxlength="13"
                @input="handlePhoneInput"
                @blur="validateField('phone')"
              />
              <span v-if="touched.phone && errors.phone" class="error-text">
                {{ errors.phone }}
              </span>
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
                inputmode="numeric"
                class="form-input"
                :class="{ 'error': touched.contactPhone && errors.contactPhone }"
                placeholder="555 111 11 11"
                maxlength="13"
                @input="handleContactPhoneInput"
                @blur="validateField('contactPhone')"
              />
              <span v-if="touched.contactPhone && errors.contactPhone" class="error-text">
                {{ errors.contactPhone }}
              </span>
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
      </form>
    <template #footer>
      <RcButton variant="secondary" @click="handleClose">İptal</RcButton>
      <RcButton variant="primary" type="submit" form="edit-provider-form" :disabled="isSubmitting">
        {{ isSubmitting ? 'Kaydediliyor…' : 'Kaydet' }}
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.form-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
.form-row .form-group.flex-2 { flex: 2; }
.form-row .form-group.flex-1 { flex: 1; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.form-label { font-size: 13px; font-weight: 500; }
.required { color: var(--rc-red-500); }
.form-input { padding: 0.625rem 0.75rem; border: 1px solid var(--rc-border); border-radius: var(--rc-radius-sm); font-size: 14px; }
.form-input.error { border-color: var(--rc-red-500); }
.error-text { font-size: 12px; color: var(--rc-red-500); }
.service-types-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--rc-bg-subtle); border: 1px solid var(--rc-border-subtle); border-radius: var(--rc-radius-sm); font-size: 13px; cursor: pointer; }
.checkbox-label.selected { background: var(--rc-accent-subtle); border-color: var(--rc-accent); color: var(--rc-accent); }
@media (max-width: 768px) { .form-row { flex-direction: column; } }
</style>
