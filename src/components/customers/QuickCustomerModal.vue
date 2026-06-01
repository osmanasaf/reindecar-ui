<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { customersApi, referenceDataApi } from '@/api'
import { useValidation, rules, useToast } from '@/composables'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { formatPhoneInput } from '@/utils/phone'
import type { Customer, CreatePersonalCustomerForm } from '@/types'

interface Props {
  visible: boolean
  rentalEndDate: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  created: [customer: Customer]
}>()

const toast = useToast()
const saving = ref(false)

const rentalEndDateRef = computed(() => props.rentalEndDate)

const form = ref({
  firstName: '',
  lastName: '',
  nationalId: '',
  phone: '',
  birthDate: '',
  licenseNumber: '',
  licenseClassId: null as number | null,
  licenseExpiryDate: '',
})

const { validateForm, getError, hasError, touch, reset } = useValidation(() => formRules.value)

const formRules = computed(() => ({
  firstName: { value: form.value.firstName, rules: [rules.required()] },
  lastName: { value: form.value.lastName, rules: [rules.required()] },
  nationalId: { value: form.value.nationalId, rules: [rules.required(), rules.tckn()] },
  phone: { value: form.value.phone, rules: [rules.required(), rules.phone()] },
  birthDate: { value: form.value.birthDate, rules: [rules.required(), rules.minAge(18)] },
  licenseNumber: { value: form.value.licenseNumber, rules: [rules.required()] },
  licenseClassId: { value: form.value.licenseClassId, rules: [rules.required('Ehliyet sınıfı seçiniz')] },
  licenseExpiryDate: {
    value: form.value.licenseExpiryDate,
    rules: [
      rules.required(),
      rules.futureDate(),
      rules.licenseValidFor(rentalEndDateRef, 3),
    ],
  },
}))

const licenseClassOptions = ref<{ value: number; label: string }[]>([])

async function fetchLicenseClasses() {
  try {
    const list = await referenceDataApi.getLicenseClasses()
    licenseClassOptions.value = list.map(lc => ({ value: lc.id, label: lc.code }))
  } catch {
    licenseClassOptions.value = []
  }
}

async function handleSubmit() {
  if (!validateForm(formRules.value)) {
    toast.error('Lütfen formdaki hataları düzeltin')
    return
  }

  saving.value = true
  try {
    const payload: CreatePersonalCustomerForm = {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      nationalId: form.value.nationalId,
      phone: form.value.phone,
      email: '',
      address: '',
      city: '',
      birthDate: form.value.birthDate,
      licenseNumber: form.value.licenseNumber,
      licenseClassId: form.value.licenseClassId ?? undefined,
      licenseExpiryDate: form.value.licenseExpiryDate,
    }

    const customer = await customersApi.createPersonal(payload)
    toast.success('Müşteri başarıyla oluşturuldu')
    emit('created', customer)
    handleClose()
  } catch (err) {
    toast.apiError(err, 'Müşteri oluşturulamadı')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  resetForm()
  emit('close')
}

function resetForm() {
  form.value = {
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    birthDate: '',
    licenseNumber: '',
    licenseClassId: null,
    licenseExpiryDate: '',
  }
  reset()
}

function handleBlur(field: string) {
  touch(field)
}

function handlePhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.phone = formatPhoneInput(target.value)
}

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    resetForm()
    fetchLicenseClasses()
  }
})
</script>

<template>
  <RcModal :open="visible" wide @close="handleClose">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="plus" :size="18" style="color: var(--rc-blue-500); vertical-align: -3px; margin-right: 8px" />
          Hızlı müşteri ekle
        </h2>
        <div class="rc-modal__sub">Kiralama için minimum bilgilerle bireysel müşteri</div>
      </div>
    </template>

    <form @submit.prevent="handleSubmit">
      <div v-if="rentalEndDate" class="rc-alert rc-alert--info" style="margin-bottom: 14px">
        <RcIcon name="info" :size="16" />
        <span>
          Kiralama bitiş: <strong>{{ new Date(rentalEndDate).toLocaleDateString('tr-TR') }}</strong> —
          ehliyet en az 3 ay sonrasına kadar geçerli olmalıdır.
        </span>
      </div>

      <div class="rcv-form-grid">
        <RcField label="Ad *" :class="{ 'rc-field--error': hasError('firstName') }">
          <input
            v-model="form.firstName"
            class="rc-input"
            type="text"
            placeholder="Ad"
            @blur="handleBlur('firstName')"
          />
          <span v-if="hasError('firstName')" class="rc-field__hint rc-field__hint--error">{{ getError('firstName') }}</span>
        </RcField>
        <RcField label="Soyad *" :class="{ 'rc-field--error': hasError('lastName') }">
          <input
            v-model="form.lastName"
            class="rc-input"
            type="text"
            placeholder="Soyad"
            @blur="handleBlur('lastName')"
          />
          <span v-if="hasError('lastName')" class="rc-field__hint rc-field__hint--error">{{ getError('lastName') }}</span>
        </RcField>
        <RcField label="TC Kimlik No *" :class="{ 'rc-field--error': hasError('nationalId') }">
          <input
            v-model="form.nationalId"
            class="rc-input rc-mono"
            type="text"
            maxlength="11"
            placeholder="11 haneli TC No"
            @blur="handleBlur('nationalId')"
          />
          <span v-if="hasError('nationalId')" class="rc-field__hint rc-field__hint--error">{{ getError('nationalId') }}</span>
        </RcField>
        <RcField label="Telefon *" :class="{ 'rc-field--error': hasError('phone') }">
          <input
            :value="form.phone"
            class="rc-input rc-mono"
            type="tel"
            inputmode="numeric"
            maxlength="13"
            placeholder="555 111 11 11"
            @blur="handleBlur('phone')"
            @input="handlePhoneInput"
          />
          <span v-if="hasError('phone')" class="rc-field__hint rc-field__hint--error">{{ getError('phone') }}</span>
        </RcField>
        <RcField label="Doğum tarihi *" :class="{ 'rc-field--error': hasError('birthDate') }">
          <DatePicker
            v-model="form.birthDate"
            placeholder="Doğum tarihi"
            @closed="handleBlur('birthDate')"
          />
          <span v-if="hasError('birthDate')" class="rc-field__hint rc-field__hint--error">{{ getError('birthDate') }}</span>
        </RcField>
        <RcField label="Ehliyet no *" :class="{ 'rc-field--error': hasError('licenseNumber') }">
          <input
            v-model="form.licenseNumber"
            class="rc-input"
            type="text"
            @blur="handleBlur('licenseNumber')"
          />
          <span v-if="hasError('licenseNumber')" class="rc-field__hint rc-field__hint--error">{{ getError('licenseNumber') }}</span>
        </RcField>
        <RcField label="Ehliyet sınıfı *" :class="{ 'rc-field--error': hasError('licenseClassId') }">
          <SearchableSelect
            v-model="form.licenseClassId"
            :options="licenseClassOptions"
            placeholder="Sınıf seçin"
            search-placeholder="Ara..."
            :error="hasError('licenseClassId')"
            @blur="handleBlur('licenseClassId')"
          />
          <span v-if="hasError('licenseClassId')" class="rc-field__hint rc-field__hint--error">{{ getError('licenseClassId') }}</span>
        </RcField>
        <RcField label="Ehliyet geçerlilik *" :class="{ 'rc-field--error': hasError('licenseExpiryDate') }">
          <DatePicker
            v-model="form.licenseExpiryDate"
            placeholder="Ehliyet geçerlilik tarihi"
            @closed="handleBlur('licenseExpiryDate')"
          />
          <span v-if="hasError('licenseExpiryDate')" class="rc-field__hint rc-field__hint--error">{{ getError('licenseExpiryDate') }}</span>
        </RcField>
      </div>
    </form>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="handleClose">İptal</RcButton>
      <RcButton variant="accent" :disabled="saving" @click="handleSubmit">
        {{ saving ? 'Kaydediliyor…' : 'Müşteri oluştur' }}
      </RcButton>
    </template>
  </RcModal>
</template>
