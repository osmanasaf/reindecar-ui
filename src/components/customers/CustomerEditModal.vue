<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { customersApi, referenceDataApi } from '@/api'
import { useValidation, rules, useToast, useReferenceData, useFeatures } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField, RcInput, RcSegTab } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { SECTOR_OPTIONS } from '@/constants/sectors'
import { formatPhoneInput } from '@/utils/phone'
import type { ValidationRule } from '@/composables/useValidation'
import { CustomerType } from '@/types'
import type {
  CreatePersonalCustomerForm,
  CreateCompanyCustomerForm,
  UpdateCompanyCustomerForm,
  AuthorizedPerson,
} from '@/types'

const props = withDefaults(
  defineProps<{
    open: boolean
    customerId: number | null
    /** Yeni müşteri modunda başlangıç tipi */
    initialType?: CustomerType
  }>(),
  { initialType: CustomerType.PERSONAL },
)

const emit = defineEmits<{
  close: []
  saved: [customerId: number]
}>()

const toast = useToast()
const { isEnabled } = useFeatures()
const loading = ref(false)
const saving = ref(false)
const customerType = ref<CustomerType>(CustomerType.PERSONAL)
const displayName = ref('')
const publicId = ref('')

const isCreateMode = computed(() => props.customerId == null)

const birthDateReadOnly = computed(
  () => !isCreateMode.value && isEnabled('MANUAL_BIRTH_DATE_EDIT') && customerType.value === 'PERSONAL',
)

const originalBirthDate = ref('')

const { cities, loadCities } = useReferenceData()
const selectedCityId = ref<number | null>(null)

const cityOptions = computed(() =>
  cities.value.map((c) => ({ value: c.id as number, label: c.name })),
)

watch(selectedCityId, (cityId) => {
  if (!cityId) {
    form.value.city = ''
    return
  }
  const c = cities.value.find((x) => x.id === cityId)
  form.value.city = c ? c.name : ''
})

const emptyForm = () => ({
  phone: '',
  email: '',
  address: '',
  city: '',
  firstName: '',
  lastName: '',
  nationalId: '',
  birthDate: '',
  licenseNumber: '',
  licenseClassId: null as number | null,
  licenseExpiryDate: '',
  companyName: '',
  taxNumber: '',
  taxOffice: '',
  tradeRegisterNo: '',
  invoiceAddress: '',
  sector: '',
  employeeCount: '',
  creditScore: '',
})

const form = ref(emptyForm())

const sameAsAddress = ref(true)
const licenseClassesList = ref<{ id: number; code: string }[]>([])
const licenseClassOptions = computed(() =>
  licenseClassesList.value.map((lc) => ({ value: lc.id, label: lc.code })),
)

const authorizedPersons = ref<AuthorizedPerson[]>([
  { firstName: '', lastName: '', nationalId: '', phone: '', email: '', title: '', isPrimary: true },
])

const commonTitles = [
  { value: 'Genel Müdür', label: 'Genel Müdür' },
  { value: 'Müdür', label: 'Müdür' },
  { value: 'Yönetici', label: 'Yönetici' },
  { value: 'Mali Müşavir', label: 'Mali Müşavir' },
  { value: 'İmza Yetkilisi', label: 'İmza Yetkilisi' },
  { value: 'Muhasebe Müdürü', label: 'Muhasebe Müdürü' },
  { value: 'İnsan Kaynakları Müdürü', label: 'İnsan Kaynakları Müdürü' },
]

const EMPLOYEE_COUNT_OPTIONS = [
  { value: '', label: 'Seçiniz' },
  { value: '20', label: '1-20' },
  { value: '200', label: '21-200' },
  { value: '500', label: '201-500' },
  { value: '9999', label: '501+' },
] as const

function employeeCountFromApi(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return ''
  if (n <= 20) return '20'
  if (n <= 200) return '200'
  if (n <= 500) return '500'
  return '9999'
}

function toOptionalNumber(value: unknown): number | undefined {
  const raw =
    typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toOptionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeAuthorizedPerson(person: AuthorizedPerson): AuthorizedPerson {
  return {
    firstName: String(person.firstName ?? '').trim(),
    lastName: String(person.lastName ?? '').trim(),
    nationalId: String(person.nationalId ?? '').trim(),
    phone: person.phone,
    email: toOptionalTrimmedString(person.email),
    title: toOptionalTrimmedString(person.title),
    isPrimary: person.isPrimary,
  }
}

function validateCompanyAuthorizedPersons(list: AuthorizedPerson[]): boolean {
  if (list.length === 0) {
    toast.error('En az bir yetkili kişi eklenmelidir')
    return false
  }
  const uniqueNationalIds = new Set(list.map((person) => person.nationalId))
  if (uniqueNationalIds.size !== list.length) {
    toast.error('Yetkili kişilerde TC Kimlik No benzersiz olmalıdır')
    return false
  }
  const primaryCount = list.filter((person) => person.isPrimary).length
  if (primaryCount !== 1) {
    toast.error('Yetkili kişiler içinde tam 1 adet ana yetkili olmalıdır')
    return false
  }
  return true
}

function addAuthorizedPerson() {
  authorizedPersons.value.push({
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    email: '',
    title: '',
    isPrimary: false,
  })
}

function removeAuthorizedPerson(index: number) {
  if (authorizedPersons.value.length <= 1) return
  const removed = authorizedPersons.value[index]
  authorizedPersons.value.splice(index, 1)
  if (removed?.isPrimary) {
    const first = authorizedPersons.value[0]
    if (first) first.isPrimary = true
  }
}

function setPrimaryAuthorizedPerson(index: number) {
  authorizedPersons.value.forEach((person, i) => {
    person.isPrimary = i === index
  })
}

function handleAuthorizedPhoneInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const person = authorizedPersons.value[index]
  if (!person) return
  person.phone = formatPhoneInput(target.value)
}

const formRules = computed(() => {
  const common = {
    phone: { value: form.value.phone, rules: [rules.required(), rules.phone()] },
    email: { value: form.value.email, rules: [rules.required(), rules.email()] },
    address: { value: form.value.address, rules: [rules.required()] },
    city: { value: form.value.city, rules: [rules.required()] },
  }

  if (customerType.value === 'PERSONAL') {
    return {
      ...common,
      firstName: { value: form.value.firstName, rules: [rules.required()] },
      lastName: { value: form.value.lastName, rules: [rules.required()] },
      nationalId: { value: form.value.nationalId, rules: [rules.required(), rules.tckn()] },
      birthDate: {
        value: form.value.birthDate,
        rules: birthDateReadOnly.value
          ? []
          : [rules.required(), rules.minAge(18, 'Müşteri en az 18 yaşında olmalıdır')],
      },
      licenseNumber: { value: form.value.licenseNumber, rules: [rules.required()] },
      licenseClassId: {
        value: form.value.licenseClassId,
        rules: [rules.required('Ehliyet sınıfı zorunludur')],
      },
      licenseExpiryDate: {
        value: form.value.licenseExpiryDate,
        rules: [
          rules.required('Ehliyet geçerlilik tarihi zorunludur'),
          rules.futureDate('Ehliyet süresi dolmuş'),
        ],
      },
    }
  }

  const companyRules: Record<string, { value: unknown; rules: ValidationRule[] }> = {
    ...common,
    companyName: { value: form.value.companyName, rules: [rules.required()] },
    taxNumber: { value: form.value.taxNumber, rules: [rules.required(), rules.taxNumber()] },
    taxOffice: { value: form.value.taxOffice, rules: [rules.required()] },
  }
  if (!sameAsAddress.value) {
    companyRules.invoiceAddress = {
      value: form.value.invoiceAddress,
      rules: [rules.required('Fatura adresi zorunludur')],
    }
  }
  if (isCreateMode.value) {
    authorizedPersons.value.forEach((person, index) => {
      companyRules[`authorizedPerson${index}FirstName`] = {
        value: person.firstName,
        rules: [rules.required('Ad zorunludur')],
      }
      companyRules[`authorizedPerson${index}LastName`] = {
        value: person.lastName,
        rules: [rules.required('Soyad zorunludur')],
      }
      companyRules[`authorizedPerson${index}NationalId`] = {
        value: person.nationalId,
        rules: [rules.required('TC Kimlik No zorunludur'), rules.tckn()],
      }
      companyRules[`authorizedPerson${index}Phone`] = {
        value: person.phone,
        rules: [rules.required('Telefon zorunludur'), rules.phone()],
      }
    })
  }
  return companyRules
})

const { validateForm, getError, hasError, touch } = useValidation(() => formRules.value)

async function fetchLicenseClasses() {
  try {
    const list = await referenceDataApi.getLicenseClasses()
    licenseClassesList.value = list.map((lc) => ({ id: lc.id, code: lc.code }))
  } catch {
    licenseClassesList.value = []
  }
}

async function initCreateForm(type: CustomerType) {
  loading.value = true
  try {
    await loadCities()
    await fetchLicenseClasses()
    customerType.value = type
    displayName.value = ''
    publicId.value = ''
    form.value = emptyForm()
    selectedCityId.value = null
    sameAsAddress.value = true
    authorizedPersons.value = [
      { firstName: '', lastName: '', nationalId: '', phone: '', email: '', title: '', isPrimary: true },
    ]
  } finally {
    loading.value = false
  }
}

async function loadCustomer() {
  if (!props.customerId) return
  loading.value = true
  try {
    await loadCities()
    await fetchLicenseClasses()
    const data = await customersApi.getById(props.customerId)
    customerType.value = data.customerType
    displayName.value = data.displayName
    publicId.value = data.publicId

    let firstName = ''
    let lastName = ''
    if (customerType.value === 'PERSONAL') {
      if (data.personalInfo) {
        firstName = data.personalInfo.firstName || ''
        lastName = data.personalInfo.lastName || ''
      } else {
        const [first, ...last] = (data.displayName || '').split(' ')
        firstName = first || ''
        lastName = last.join(' ') || ''
      }
    }

    const invoiceAddress = data.invoiceAddress || data.address || ''
    sameAsAddress.value =
      customerType.value !== 'COMPANY' || invoiceAddress === (data.address || '')

    form.value = {
      phone: formatPhoneInput(data.phone),
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      firstName,
      lastName,
      nationalId: data.personalInfo?.nationalId || data.nationalId || '',
      birthDate: data.personalInfo?.birthDate
        ? (data.personalInfo.birthDate.split('T')[0] ?? '')
        : data.birthDate
          ? (data.birthDate.split('T')[0] ?? '')
          : '',
      licenseNumber: data.personalInfo?.licenseNumber || data.licenseNumber || '',
      licenseClassId: data.personalInfo?.licenseClassId ?? null,
      licenseExpiryDate: data.personalInfo?.licenseExpiryDate
        ? (data.personalInfo.licenseExpiryDate.split('T')[0] ?? '')
        : data.licenseExpiryDate
          ? (data.licenseExpiryDate.split('T')[0] ?? '')
          : '',
      companyName: data.companyInfo?.companyName || data.displayName || '',
      taxNumber: data.companyInfo?.taxNumber || data.taxNumber || '',
      taxOffice: data.companyInfo?.taxOffice || data.taxOffice || '',
      tradeRegisterNo: data.tradeRegisterNo || data.tradeRegistryNumber || '',
      invoiceAddress,
      sector: data.sector || '',
      employeeCount: employeeCountFromApi(data.employeeCount ?? data.companyInfo?.employeeCount),
      creditScore: typeof data.creditScore === 'number' ? String(data.creditScore) : '',
    }
    const cityMatch = cities.value.find((c) => c.name === (data.city || ''))
    selectedCityId.value = cityMatch ? cityMatch.id : null
    originalBirthDate.value = form.value.birthDate
  } catch {
    toast.error('Müşteri bilgileri yüklenemedi')
    emit('close')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!validateForm(formRules.value)) {
    toast.error('Lütfen formdaki hataları düzeltin')
    return
  }

  saving.value = true
  try {
    if (isCreateMode.value) {
      let createdId: number
      if (customerType.value === 'PERSONAL') {
        const payload: CreatePersonalCustomerForm = {
          firstName: form.value.firstName,
          lastName: form.value.lastName,
          nationalId: form.value.nationalId,
          birthDate: form.value.birthDate,
          phone: form.value.phone,
          email: form.value.email,
          address: form.value.address,
          city: form.value.city,
          licenseNumber: form.value.licenseNumber,
          licenseClassId: form.value.licenseClassId ?? undefined,
          licenseExpiryDate: form.value.licenseExpiryDate,
        }
        const created = await customersApi.createPersonal(payload)
        createdId = created.id
      } else {
        if (sameAsAddress.value) {
          form.value.invoiceAddress = form.value.address
        }
        const normalized = authorizedPersons.value.map(normalizeAuthorizedPerson)
        if (!validateCompanyAuthorizedPersons(normalized)) {
          saving.value = false
          return
        }
        const payload: CreateCompanyCustomerForm = {
          companyName: form.value.companyName,
          taxNumber: form.value.taxNumber,
          taxOffice: form.value.taxOffice,
          phone: form.value.phone,
          email: form.value.email,
          address: form.value.address,
          city: form.value.city,
          invoiceAddress: form.value.invoiceAddress,
          tradeRegisterNo: form.value.tradeRegisterNo || undefined,
          sector: form.value.sector || undefined,
          employeeCount: toOptionalNumber(form.value.employeeCount),
          creditScore: toOptionalNumber(form.value.creditScore),
          authorizedPersons: normalized,
        }
        const created = await customersApi.createCompany(payload)
        createdId = created.id
      }
      toast.success('Müşteri başarıyla oluşturuldu')
      emit('saved', createdId)
      emit('close')
      return
    }

    if (!props.customerId) return

    if (customerType.value === 'PERSONAL') {
      const payload: CreatePersonalCustomerForm = {
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        nationalId: form.value.nationalId,
        birthDate: birthDateReadOnly.value ? originalBirthDate.value : form.value.birthDate,
        phone: form.value.phone,
        email: form.value.email,
        address: form.value.address,
        city: form.value.city,
        licenseNumber: form.value.licenseNumber,
        licenseClassId: form.value.licenseClassId ?? undefined,
        licenseExpiryDate: form.value.licenseExpiryDate,
      }
      await customersApi.update(props.customerId, { ...payload, customerType: customerType.value } as never)
    } else {
      if (sameAsAddress.value) {
        form.value.invoiceAddress = form.value.address
      }
      const payload: UpdateCompanyCustomerForm = {
        companyName: form.value.companyName,
        taxNumber: form.value.taxNumber,
        taxOffice: form.value.taxOffice,
        phone: form.value.phone,
        email: form.value.email,
        address: form.value.address,
        city: form.value.city,
        invoiceAddress: form.value.invoiceAddress,
        tradeRegisterNo: form.value.tradeRegisterNo || undefined,
        sector: form.value.sector || undefined,
        employeeCount: toOptionalNumber(form.value.employeeCount),
        creditScore: toOptionalNumber(form.value.creditScore),
      }
      await customersApi.update(props.customerId, { ...payload, customerType: customerType.value } as never)
    }
    toast.success('Müşteri başarıyla güncellendi')
    emit('saved', props.customerId)
    emit('close')
  } catch (err) {
    toast.apiError(err, isCreateMode.value ? 'Kaydetme işlemi başarısız' : 'Güncelleme işlemi başarısız')
  } finally {
    saving.value = false
  }
}

function handleBlur(field: string) {
  touch(field)
}

function syncInvoiceAddress() {
  if (sameAsAddress.value) {
    form.value.invoiceAddress = form.value.address
  }
}

watch(
  () => [props.open, props.customerId, props.initialType] as const,
  ([isOpen, id, initialType]) => {
    if (!isOpen) return
    if (id) loadCustomer()
    else initCreateForm(initialType ?? 'PERSONAL')
  },
  { immediate: true },
)
</script>

<template>
  <RcModal :open="open" wide xl @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon
            :name="isCreateMode ? 'plus' : 'edit'"
            :size="18"
            style="color: var(--rc-blue-500); vertical-align: -3px; margin-right: 8px"
          />
          {{ isCreateMode ? 'Yeni müşteri' : 'Müşteriyi düzenle' }}
        </h2>
        <div v-if="!isCreateMode && publicId" class="rc-modal__sub">{{ publicId }} · {{ displayName }}</div>
        <div v-else-if="isCreateMode" class="rc-modal__sub">Liste üzerinde kalır; kayıt sonrası önizleme açılır</div>
      </div>
    </template>

    <div v-if="loading" class="rc-cust-edit__loading">Yükleniyor…</div>

    <form v-else class="rc-cust-edit" @submit.prevent="handleSubmit">
      <p class="rc-cust-edit__section-label">Müşteri tipi</p>
      <div v-if="isCreateMode" class="rc-segtabs rc-cust-edit__type-tabs">
        <RcSegTab
          id="PERSONAL"
          :active="customerType"
          @select="customerType = $event as CustomerType"
        >
          Bireysel
        </RcSegTab>
        <RcSegTab
          id="COMPANY"
          :active="customerType"
          @select="customerType = $event as CustomerType"
        >
          Kurumsal
        </RcSegTab>
      </div>
      <div v-else class="rcv-form-grid rc-cust-edit__type-row">
        <RcField label="Tip">
          <select class="rc-select" :value="customerType" disabled>
            <option value="PERSONAL">Bireysel</option>
            <option value="COMPANY">Kurumsal</option>
          </select>
        </RcField>
      </div>

      <p class="rc-cust-edit__section-label">Kimlik & iletişim</p>
      <div class="rcv-form-grid">
        <template v-if="customerType === 'PERSONAL'">
          <RcField label="Ad" :class="{ 'rc-field--error': hasError('firstName') }">
            <RcInput v-model="form.firstName" @blur="handleBlur('firstName')" />
            <span v-if="hasError('firstName')" class="rc-field__hint rc-field__hint--error">{{ getError('firstName') }}</span>
          </RcField>
          <RcField label="Soyad" :class="{ 'rc-field--error': hasError('lastName') }">
            <RcInput v-model="form.lastName" @blur="handleBlur('lastName')" />
            <span v-if="hasError('lastName')" class="rc-field__hint rc-field__hint--error">{{ getError('lastName') }}</span>
          </RcField>
          <RcField label="TC Kimlik No" :class="{ 'rc-field--error': hasError('nationalId') }">
            <RcInput v-model="form.nationalId" class="rc-mono" maxlength="11" @blur="handleBlur('nationalId')" />
            <span v-if="hasError('nationalId')" class="rc-field__hint rc-field__hint--error">{{ getError('nationalId') }}</span>
          </RcField>
          <RcField label="Doğum tarihi" :class="{ 'rc-field--error': hasError('birthDate') }">
            <DatePicker
              v-model="form.birthDate"
              placeholder="Doğum tarihi"
              :disabled="birthDateReadOnly"
              @closed="touch('birthDate')"
            />
            <span v-if="birthDateReadOnly" class="rc-field__hint">
              Düzeltme için müşteri detayındaki «Doğum tarihini düzelt» aksiyonunu kullanın.
            </span>
            <span v-else-if="hasError('birthDate')" class="rc-field__hint rc-field__hint--error">{{ getError('birthDate') }}</span>
          </RcField>
        </template>

        <template v-else>
          <RcField label="Firma adı" class="span-2" :class="{ 'rc-field--error': hasError('companyName') }">
            <RcInput v-model="form.companyName" @blur="handleBlur('companyName')" />
            <span v-if="hasError('companyName')" class="rc-field__hint rc-field__hint--error">{{ getError('companyName') }}</span>
          </RcField>
          <RcField label="Vergi no" :class="{ 'rc-field--error': hasError('taxNumber') }">
            <RcInput v-model="form.taxNumber" class="rc-mono" @blur="handleBlur('taxNumber')" />
            <span v-if="hasError('taxNumber')" class="rc-field__hint rc-field__hint--error">{{ getError('taxNumber') }}</span>
          </RcField>
          <RcField label="Vergi dairesi" :class="{ 'rc-field--error': hasError('taxOffice') }">
            <RcInput v-model="form.taxOffice" @blur="handleBlur('taxOffice')" />
            <span v-if="hasError('taxOffice')" class="rc-field__hint rc-field__hint--error">{{ getError('taxOffice') }}</span>
          </RcField>
          <RcField label="Sektör">
            <select v-model="form.sector" class="rc-select">
              <option value="">Seçiniz</option>
              <option v-for="opt in SECTOR_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </RcField>
          <RcField label="Çalışan sayısı">
            <select v-model="form.employeeCount" class="rc-select">
              <option v-for="opt in EMPLOYEE_COUNT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </RcField>
          <RcField label="Ticaret sicil no">
            <RcInput v-model="form.tradeRegisterNo" />
          </RcField>
          <RcField label="Kredi skoru">
            <RcInput v-model="form.creditScore" type="number" min="0" max="2000" />
          </RcField>
        </template>

        <RcField label="Telefon" :class="{ 'rc-field--error': hasError('phone') }">
          <RcInput
            :model-value="form.phone"
            class="rc-mono"
            @update:model-value="form.phone = formatPhoneInput($event)"
            @blur="handleBlur('phone')"
          />
          <span v-if="hasError('phone')" class="rc-field__hint rc-field__hint--error">{{ getError('phone') }}</span>
        </RcField>
        <RcField label="E-posta" :class="{ 'rc-field--error': hasError('email') }">
          <RcInput v-model="form.email" type="email" @blur="handleBlur('email')" />
          <span v-if="hasError('email')" class="rc-field__hint rc-field__hint--error">{{ getError('email') }}</span>
        </RcField>
        <RcField label="Şehir" :class="{ 'rc-field--error': hasError('city') }">
          <SearchableSelect
            v-model="selectedCityId"
            :options="cityOptions"
            placeholder="Şehir seçin"
            search-placeholder="Ara..."
            :error="hasError('city')"
            @blur="handleBlur('city')"
          />
          <span v-if="hasError('city')" class="rc-field__hint rc-field__hint--error">{{ getError('city') }}</span>
        </RcField>
        <RcField label="Adres" class="span-2" :class="{ 'rc-field--error': hasError('address') }">
          <textarea v-model="form.address" class="rc-textarea" rows="2" @blur="handleBlur('address')" />
          <span v-if="hasError('address')" class="rc-field__hint rc-field__hint--error">{{ getError('address') }}</span>
        </RcField>

        <template v-if="customerType === 'COMPANY'">
          <label class="rc-cust-edit__checkbox span-2">
            <input v-model="sameAsAddress" type="checkbox" @change="syncInvoiceAddress" />
            Fatura adresi iletişim adresi ile aynı
          </label>
          <RcField
            v-if="!sameAsAddress"
            label="Fatura adresi"
            class="span-2"
            :class="{ 'rc-field--error': hasError('invoiceAddress') }"
          >
            <textarea v-model="form.invoiceAddress" class="rc-textarea" rows="2" @blur="handleBlur('invoiceAddress')" />
            <span v-if="hasError('invoiceAddress')" class="rc-field__hint rc-field__hint--error">{{ getError('invoiceAddress') }}</span>
          </RcField>
        </template>
      </div>

      <template v-if="isCreateMode && customerType === 'COMPANY'">
        <div class="rc-cust-edit__auth-head">
          <p class="rc-cust-edit__section-label">Yetkili kişiler</p>
          <RcButton type="button" variant="ghost" size="sm" @click="addAuthorizedPerson">
            <RcIcon name="plus" :size="14" />
            Yetkili ekle
          </RcButton>
        </div>
        <div
          v-for="(person, index) in authorizedPersons"
          :key="index"
          class="rc-cust-edit__auth-card"
        >
          <div class="rc-cust-edit__auth-card-head">
            <span>Yetkili {{ index + 1 }}</span>
            <RcButton
              v-if="authorizedPersons.length > 1"
              type="button"
              variant="ghost"
              size="sm"
              class="rc-btn--danger"
              @click="removeAuthorizedPerson(index)"
            >
              Kaldır
            </RcButton>
          </div>
          <div class="rcv-form-grid">
            <RcField label="Ad" :class="{ 'rc-field--error': hasError(`authorizedPerson${index}FirstName`) }">
              <RcInput v-model="person.firstName" @blur="handleBlur(`authorizedPerson${index}FirstName`)" />
              <span v-if="hasError(`authorizedPerson${index}FirstName`)" class="rc-field__hint rc-field__hint--error">{{ getError(`authorizedPerson${index}FirstName`) }}</span>
            </RcField>
            <RcField label="Soyad" :class="{ 'rc-field--error': hasError(`authorizedPerson${index}LastName`) }">
              <RcInput v-model="person.lastName" @blur="handleBlur(`authorizedPerson${index}LastName`)" />
              <span v-if="hasError(`authorizedPerson${index}LastName`)" class="rc-field__hint rc-field__hint--error">{{ getError(`authorizedPerson${index}LastName`) }}</span>
            </RcField>
            <RcField label="TC Kimlik No" :class="{ 'rc-field--error': hasError(`authorizedPerson${index}NationalId`) }">
              <RcInput v-model="person.nationalId" class="rc-mono" maxlength="11" @blur="handleBlur(`authorizedPerson${index}NationalId`)" />
              <span v-if="hasError(`authorizedPerson${index}NationalId`)" class="rc-field__hint rc-field__hint--error">{{ getError(`authorizedPerson${index}NationalId`) }}</span>
            </RcField>
            <RcField label="Telefon" :class="{ 'rc-field--error': hasError(`authorizedPerson${index}Phone`) }">
              <input
                :value="person.phone"
                class="rc-input rc-mono"
                type="tel"
                maxlength="13"
                @blur="handleBlur(`authorizedPerson${index}Phone`)"
                @input="handleAuthorizedPhoneInput(index, $event)"
              />
              <span v-if="hasError(`authorizedPerson${index}Phone`)" class="rc-field__hint rc-field__hint--error">{{ getError(`authorizedPerson${index}Phone`) }}</span>
            </RcField>
            <RcField label="E-posta">
              <RcInput v-model="person.email" type="email" />
            </RcField>
            <RcField label="Ünvan">
              <SearchableSelect
                :model-value="person.title || null"
                :options="commonTitles"
                placeholder="Ünvan seçin"
                search-placeholder="Ara..."
                createable
                clearable
                @update:model-value="(value) => (person.title = value || '')"
                @create="(value) => (person.title = value)"
              />
            </RcField>
            <label class="rc-cust-edit__checkbox span-2">
              <input
                :checked="person.isPrimary"
                type="radio"
                name="primaryAuthorizedPerson"
                @change="setPrimaryAuthorizedPerson(index)"
              />
              Ana yetkili
            </label>
          </div>
        </div>
      </template>

      <template v-if="customerType === 'PERSONAL'">
        <p class="rc-cust-edit__section-label">Ehliyet</p>
        <div class="rcv-form-grid">
          <RcField label="Ehliyet no" :class="{ 'rc-field--error': hasError('licenseNumber') }">
            <RcInput v-model="form.licenseNumber" @blur="handleBlur('licenseNumber')" />
            <span v-if="hasError('licenseNumber')" class="rc-field__hint rc-field__hint--error">{{ getError('licenseNumber') }}</span>
          </RcField>
          <RcField label="Sınıf" :class="{ 'rc-field--error': hasError('licenseClassId') }">
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
          <RcField label="Geçerlilik" :class="{ 'rc-field--error': hasError('licenseExpiryDate') }">
            <DatePicker
              v-model="form.licenseExpiryDate"
              placeholder="Bitiş tarihi"
              @closed="handleBlur('licenseExpiryDate')"
            />
            <span v-if="hasError('licenseExpiryDate')" class="rc-field__hint rc-field__hint--error">{{ getError('licenseExpiryDate') }}</span>
          </RcField>
        </div>
      </template>
    </form>

    <template #footer>
      <RcButton variant="ghost" @click="emit('close')">İptal</RcButton>
      <span class="rc-spacer" />
      <RcButton variant="accent" :disabled="loading" :loading="saving" @click="handleSubmit">
        <RcIcon name="check" :size="14" />
        {{ isCreateMode ? 'Müşteri oluştur' : 'Değişiklikleri kaydet' }}
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rc-cust-edit__loading {
  padding: 32px;
  text-align: center;
  color: var(--rc-text-muted);
}

.rc-cust-edit__section-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--rc-text-soft);
  margin: 0 0 8px;
}

.rc-cust-edit__section-label:not(:first-child) {
  margin-top: 18px;
}

.rc-cust-edit__type-row {
  margin-bottom: 4px;
}

.rc-cust-edit__type-tabs {
  margin-bottom: 8px;
}

.rc-cust-edit__auth-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.rc-cust-edit__auth-head .rc-cust-edit__section-label {
  margin: 0;
}

.rc-cust-edit__auth-card {
  margin-top: 10px;
  padding: 14px;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-10);
  background: var(--rc-surface-2);
}

.rc-cust-edit__auth-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
}

.rc-cust-edit__checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--rc-text-soft);
  cursor: pointer;
}

.rc-field__hint--error {
  color: var(--rc-danger-600);
}
</style>
