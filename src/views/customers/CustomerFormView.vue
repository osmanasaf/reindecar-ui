<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi, referenceDataApi } from '@/api'
import { useValidation, rules, useToast, useReferenceData } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { SECTOR_OPTIONS } from '@/constants/sectors'
import { formatPhoneInput } from '@/utils/phone'
import type { ValidationRule } from '@/composables/useValidation'
import type {
  CustomerType,
  CreatePersonalCustomerForm,
  CreateCompanyCustomerForm,
  UpdateCompanyCustomerForm,
  AuthorizedPerson
} from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const isEditMode = computed(() => route.params.id !== undefined)
const customerType = ref<CustomerType>(
  (route.params.type as CustomerType)?.toUpperCase() as CustomerType || 'PERSONAL'
)

const loading = ref(false)

const { cities, loadCities } = useReferenceData()
const selectedCityId = ref<number | null>(null)

const cityOptions = computed(() =>
  cities.value.map(c => ({ value: c.id as number, label: c.name }))
)

watch(selectedCityId, (cityId) => {
  if (!cityId) {
    form.value.city = ''
    return
  }
  const c = cities.value.find(x => x.id === cityId)
  form.value.city = c ? c.name : ''
})

const form = ref({

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
  creditScore: ''
})

const authorizedPersons = ref<AuthorizedPerson[]>([
  { firstName: '', lastName: '', nationalId: '', phone: '', email: '', title: '', isPrimary: true }
])
const sameAsAddress = ref(true)

const commonTitles = [
  { value: 'Genel Müdür', label: 'Genel Müdür' },
  { value: 'Müdür', label: 'Müdür' },
  { value: 'Yönetici', label: 'Yönetici' },
  { value: 'Mali Müşavir', label: 'Mali Müşavir' },
  { value: 'İmza Yetkilisi', label: 'İmza Yetkilisi' },
  { value: 'Muhasebe Müdürü', label: 'Muhasebe Müdürü' },
  { value: 'İnsan Kaynakları Müdürü', label: 'İnsan Kaynakları Müdürü' }
]

const licenseClassesList = ref<{ id: number; code: string }[]>([])
const licenseClassOptions = computed(() =>
  licenseClassesList.value.map(lc => ({ value: lc.id, label: lc.code }))
)

async function fetchLicenseClasses() {
  try {
    const list = await referenceDataApi.getLicenseClasses()
    licenseClassesList.value = list.map(lc => ({ id: lc.id, code: lc.code }))
  } catch {
    licenseClassesList.value = []
  }
}



/** Kurumsal müşteri çalışan sayısı aralıkları (backend’e üst sınır sayı gider) */
const EMPLOYEE_COUNT_OPTIONS = [
  { value: '', label: 'Seçiniz' },
  { value: '20', label: '1-20' },
  { value: '200', label: '21-200' },
  { value: '500', label: '201-500' },
  { value: '9999', label: '501+' }
] as const

function employeeCountFromApi(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return ''
  if (n <= 20) return '20'
  if (n <= 200) return '200'
  if (n <= 500) return '500'
  return '9999'
}

function addAuthorizedPerson() {
  authorizedPersons.value.push({ firstName: '', lastName: '', nationalId: '', phone: '', email: '', title: '', isPrimary: false })
}

function removeAuthorizedPerson(index: number) {
  if (authorizedPersons.value.length > 1) {
    const removed = authorizedPersons.value[index]
    authorizedPersons.value.splice(index, 1)
    if (removed?.isPrimary) {
      const first = authorizedPersons.value[0]
      if (first) first.isPrimary = true
    }
  }
}

function setPrimaryAuthorizedPerson(index: number) {
  authorizedPersons.value.forEach((person, currentIndex) => {
    person.isPrimary = currentIndex === index
  })
}

function syncInvoiceAddress() {
  if (sameAsAddress.value) {
    form.value.invoiceAddress = form.value.address
  }
}

function toOptionalNumber(value: unknown): number | undefined {
  const raw = typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
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
    isPrimary: person.isPrimary
  }
}

function validateCompanyAuthorizedPersons(list: AuthorizedPerson[]): boolean {
  if (list.length === 0) {
    toast.error('En az bir yetkili kişi eklenmelidir')
    return false
  }

  const uniqueNationalIds = new Set(list.map(person => person.nationalId))
  if (uniqueNationalIds.size !== list.length) {
    toast.error('Yetkili kişilerde TC Kimlik No benzersiz olmalıdır')
    return false
  }

  const primaryCount = list.filter(person => person.isPrimary).length
  if (primaryCount !== 1) {
    toast.error('Yetkili kişiler içinde tam 1 adet ana yetkili olmalıdır')
    return false
  }

  return true
}

const { validateForm, getError, hasError, touch, reset } = useValidation(() => formRules.value)


const formRules = computed(() => {
  const common = {
    phone: { value: form.value.phone, rules: [rules.required(), rules.phone()] },
    email: { value: form.value.email, rules: [rules.required(), rules.email()] },
    address: { value: form.value.address, rules: [rules.required()] },
    city: { value: form.value.city, rules: [rules.required()] }
  }

  if (customerType.value === 'PERSONAL') {
    return {
      ...common,
      firstName: { value: form.value.firstName, rules: [rules.required()] },
      lastName: { value: form.value.lastName, rules: [rules.required()] },
      nationalId: { value: form.value.nationalId, rules: [rules.required(), rules.tckn()] },
      birthDate: { value: form.value.birthDate, rules: [rules.required(), rules.minAge(18, 'Müşteri en az 18 yaşında olmalıdır')] },
      licenseNumber: { value: form.value.licenseNumber, rules: [rules.required()] },
      licenseClassId: { value: form.value.licenseClassId, rules: [rules.required('Ehliyet sınıfı zorunludur')] },
      licenseExpiryDate: { value: form.value.licenseExpiryDate, rules: [rules.required('Ehliyet geçerlilik tarihi zorunludur'), rules.futureDate('Ehliyet süresi dolmuş')] }
    }
  } else {
    const companyRules: Record<string, { value: unknown; rules: ValidationRule[] }> = {
      ...common,
      companyName: { value: form.value.companyName, rules: [rules.required()] },
      taxNumber: { value: form.value.taxNumber, rules: [rules.required(), rules.taxNumber()] },
      taxOffice: { value: form.value.taxOffice, rules: [rules.required()] }
    }
    if (!sameAsAddress.value) {
      companyRules.invoiceAddress = { value: form.value.invoiceAddress, rules: [rules.required('Fatura adresi zorunludur')] }
    }
    if (!isEditMode.value) {
      authorizedPersons.value.forEach((person, index) => {
        companyRules[`authorizedPerson${index}FirstName`] = { value: person.firstName, rules: [rules.required('Ad zorunludur')] }
        companyRules[`authorizedPerson${index}LastName`] = { value: person.lastName, rules: [rules.required('Soyad zorunludur')] }
        companyRules[`authorizedPerson${index}NationalId`] = { value: person.nationalId, rules: [rules.required('TC Kimlik No zorunludur'), rules.tckn()] }
        companyRules[`authorizedPerson${index}Phone`] = { value: person.phone, rules: [rules.required('Telefon zorunludur'), rules.phone()] }
      })
    }
    return companyRules
  }
})

async function fetchCustomer() {
  loading.value = true
  try {
    await loadCities()
    await fetchLicenseClasses()
    if (!isEditMode.value) return
    const data = await customersApi.getById(Number(route.params.id))
    customerType.value = data.customerType
    
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
    sameAsAddress.value = customerType.value !== 'COMPANY' || invoiceAddress === (data.address || '')

    form.value = {
      phone: formatPhoneInput(data.phone),
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      
      firstName,
      lastName,
      nationalId: data.personalInfo?.nationalId || data.nationalId || '',
      birthDate: data.personalInfo?.birthDate ? (data.personalInfo.birthDate.split('T')[0] ?? '') : (data.birthDate ? (data.birthDate.split('T')[0] ?? '') : ''),
      licenseNumber: data.personalInfo?.licenseNumber || data.licenseNumber || '',
      licenseClassId: data.personalInfo?.licenseClassId ?? null,
      licenseExpiryDate: data.personalInfo?.licenseExpiryDate ? (data.personalInfo.licenseExpiryDate.split('T')[0] ?? '') : (data.licenseExpiryDate ? (data.licenseExpiryDate.split('T')[0] ?? '') : ''),
      
      companyName: data.companyInfo?.companyName || data.displayName || '',
      taxNumber: data.companyInfo?.taxNumber || data.taxNumber || '',
      taxOffice: data.companyInfo?.taxOffice || data.taxOffice || '',
      tradeRegisterNo: data.tradeRegisterNo || data.tradeRegistryNumber || '',
      invoiceAddress,
      sector: data.sector || '',
      employeeCount: employeeCountFromApi(data.employeeCount ?? data.companyInfo?.employeeCount),
      creditScore: typeof data.creditScore === 'number' ? String(data.creditScore) : ''
    }
    const cityMatch = cities.value.find(c => c.name === (data.city || ''))
    selectedCityId.value = cityMatch ? cityMatch.id : null
  } catch {
    toast.error('Müşteri bilgileri yüklenemedi')
    router.push('/customers')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!validateForm(formRules.value)) {
    toast.error('Lütfen formdaki hataları düzeltin')
    return
  }

  loading.value = true
  try {
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
        licenseExpiryDate: form.value.licenseExpiryDate
      }

      if (isEditMode.value) {
        await customersApi.update(Number(route.params.id), { ...payload, customerType: customerType.value } as any)
        toast.success('Müşteri başarıyla güncellendi')
      } else {
        await customersApi.createPersonal(payload)
        toast.success('Müşteri başarıyla oluşturuldu')
      }
    } else {
      if (sameAsAddress.value) {
        form.value.invoiceAddress = form.value.address
      }

      const basePayload: UpdateCompanyCustomerForm = {
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
        creditScore: toOptionalNumber(form.value.creditScore)
      }

      if (isEditMode.value) {
        await customersApi.update(Number(route.params.id), { ...basePayload, customerType: customerType.value } as any)
        toast.success('Müşteri başarıyla güncellendi')
      } else {
        const normalizedAuthorizedPersons = authorizedPersons.value.map(normalizeAuthorizedPerson)
        if (!validateCompanyAuthorizedPersons(normalizedAuthorizedPersons)) {
          loading.value = false
          return
        }

        const payload: CreateCompanyCustomerForm = {
          ...basePayload,
          authorizedPersons: normalizedAuthorizedPersons
        }

        await customersApi.createCompany(payload)
        toast.success('Müşteri başarıyla oluşturuldu')
      }
    }

    router.push('/customers')
  } catch (err) {
    toast.apiError(err, isEditMode.value ? 'Güncelleme işlemi başarısız' : 'Kaydetme işlemi başarısız')
  } finally {
    loading.value = false
  }
}

function handleBlur(field: string) {
  touch(field)
}

function handlePhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.phone = formatPhoneInput(target.value)
}

function handleAuthorizedPhoneInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const person = authorizedPersons.value[index]
  if (!person) return
  person.phone = formatPhoneInput(target.value)
}

onMounted(fetchCustomer)

watch(customerType, () => reset())
</script>

<template>
  <div class="customer-form-page">
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="router.back()">← Geri</button>
        <h1>{{ isEditMode ? 'Müşteriyi Düzenle' : 'Yeni Müşteri Ekle' }}</h1>
      </div>
    </header>

    <div class="form-container">

      <div v-if="!isEditMode" class="type-selector">
        <button 
          :class="['type-btn', { active: customerType === 'PERSONAL' }]"
          @click="customerType = 'PERSONAL'"
        >
          👤 Bireysel
        </button>
        <button 
          :class="['type-btn', { active: customerType === 'COMPANY' }]"
          @click="customerType = 'COMPANY'"
        >
          🏢 Kurumsal
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="main-form">

        <template v-if="customerType === 'PERSONAL'">
          <section class="form-section">
            <h3>Kişisel Bilgiler</h3>
            <div class="form-grid">
              <div class="form-group" :class="{ error: hasError('firstName') }">
                <label>Ad <span class="required">*</span></label>
                <input v-model="form.firstName" @blur="handleBlur('firstName')" type="text" placeholder="Ad" />
                <span class="error-text">{{ getError('firstName') }}</span>
              </div>
              
              <div class="form-group" :class="{ error: hasError('lastName') }">
                <label>Soyad <span class="required">*</span></label>
                <input v-model="form.lastName" @blur="handleBlur('lastName')" type="text" placeholder="Soyad" />
                <span class="error-text">{{ getError('lastName') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('nationalId') }">
                <label>TC Kimlik No <span class="required">*</span></label>
                <input v-model="form.nationalId" @blur="handleBlur('nationalId')" type="text" maxlength="11" placeholder="11 haneli TC No" />
                <span class="error-text">{{ getError('nationalId') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('birthDate') }">
                <DatePicker
                  v-model="form.birthDate"
                  label="Doğum Tarihi *"
                  placeholder="Doğum tarihi"
                  @closed="handleBlur('birthDate')"
                />
                <span class="error-text">{{ getError('birthDate') }}</span>
              </div>
            </div>
          </section>

          <section class="form-section">
            <h3>Ehliyet Bilgileri</h3>
            <div class="form-grid">
              <div class="form-group" :class="{ error: hasError('licenseNumber') }">
                <label>Ehliyet No <span class="required">*</span></label>
                <input v-model="form.licenseNumber" @blur="handleBlur('licenseNumber')" type="text" />
                <span class="error-text">{{ getError('licenseNumber') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('licenseClassId') }">
                <label>Sınıf <span class="required">*</span></label>
                <SearchableSelect
                  v-model="form.licenseClassId"
                  :options="licenseClassOptions"
                  placeholder="Sınıf seçin"
                  search-placeholder="Ara..."
                  :error="hasError('licenseClassId')"
                  @blur="handleBlur('licenseClassId')"
                />
                <span class="error-text">{{ getError('licenseClassId') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('licenseExpiryDate') }">
                <DatePicker
                  v-model="form.licenseExpiryDate"
                  label="Geçerlilik Tarihi *"
                  placeholder="Geçerlilik tarihi"
                  @closed="handleBlur('licenseExpiryDate')"
                />
                <span class="error-text">{{ getError('licenseExpiryDate') }}</span>
              </div>
            </div>
          </section>
        </template>


        <template v-else>
          <section class="form-section">
            <h3>Şirket Bilgileri</h3>
            <div class="form-grid">
              <div class="form-group full" :class="{ error: hasError('companyName') }">
                <label>Şirket Adı <span class="required">*</span></label>
                <input v-model="form.companyName" @blur="handleBlur('companyName')" type="text" />
                <span class="error-text">{{ getError('companyName') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('taxNumber') }">
                <label>Vergi No <span class="required">*</span></label>
                <input v-model="form.taxNumber" @blur="handleBlur('taxNumber')" type="text" maxlength="11" />
                <span class="error-text">{{ getError('taxNumber') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('taxOffice') }">
                <label>Vergi Dairesi <span class="required">*</span></label>
                <input v-model="form.taxOffice" @blur="handleBlur('taxOffice')" type="text" />
                <span class="error-text">{{ getError('taxOffice') }}</span>
              </div>
              
              <div class="form-group">
                <label>Ticaret Sicil No</label>
                <input v-model="form.tradeRegisterNo" type="text" />
              </div>

              <div class="form-group">
                <label>Sektör</label>
                <SearchableSelect
                  :model-value="form.sector || null"
                  :options="SECTOR_OPTIONS"
                  placeholder="Sektör seçin"
                  search-placeholder="Sektör ara..."
                  clearable
                  @update:model-value="form.sector = $event ?? ''"
                />
              </div>

              <div class="form-group">
                <label>Çalışan Sayısı</label>
                <select v-model="form.employeeCount" class="form-select">
                  <option
                    v-for="opt in EMPLOYEE_COUNT_OPTIONS"
                    :key="opt.value || 'empty'"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Kredi Skoru</label>
                <input v-model="form.creditScore" type="number" min="0" max="2000" />
              </div>
            </div>
          </section>

          <section v-if="!isEditMode" class="form-section">
            <div class="section-header">
              <h3>Yetkili Kişiler</h3>
              <button type="button" class="btn-add" @click="addAuthorizedPerson">+ Yetkili Ekle</button>
            </div>
            <div v-for="(person, index) in authorizedPersons" :key="index" class="authorized-person-card">
              <div class="person-header">
                <span class="person-number">Yetkili {{ index + 1 }}</span>
                <button 
                  v-if="authorizedPersons.length > 1" 
                  type="button" 
                  class="btn-remove" 
                  @click="removeAuthorizedPerson(index)"
                >×</button>
              </div>
              <div class="form-grid">
                <div class="form-group" :class="{ error: hasError(`authorizedPerson${index}FirstName`) }">
                  <label>Ad <span class="required">*</span></label>
                  <input v-model="person.firstName" @blur="handleBlur(`authorizedPerson${index}FirstName`)" type="text" />
                  <span class="error-text">{{ getError(`authorizedPerson${index}FirstName`) }}</span>
                </div>
                <div class="form-group" :class="{ error: hasError(`authorizedPerson${index}LastName`) }">
                  <label>Soyad <span class="required">*</span></label>
                  <input v-model="person.lastName" @blur="handleBlur(`authorizedPerson${index}LastName`)" type="text" />
                  <span class="error-text">{{ getError(`authorizedPerson${index}LastName`) }}</span>
                </div>
                <div class="form-group" :class="{ error: hasError(`authorizedPerson${index}NationalId`) }">
                  <label>TC Kimlik No <span class="required">*</span></label>
                  <input v-model="person.nationalId" @blur="handleBlur(`authorizedPerson${index}NationalId`)" type="text" maxlength="11" placeholder="11 haneli TC No" />
                  <span class="error-text">{{ getError(`authorizedPerson${index}NationalId`) }}</span>
                </div>
                <div class="form-group" :class="{ error: hasError(`authorizedPerson${index}Phone`) }">
                  <label>Telefon <span class="required">*</span></label>
                  <input
                    v-model="person.phone"
                    @blur="handleBlur(`authorizedPerson${index}Phone`)"
                    @input="handleAuthorizedPhoneInput(index, $event)"
                    type="tel"
                    inputmode="numeric"
                    maxlength="13"
                    placeholder="555 111 11 11"
                  />
                  <span class="error-text">{{ getError(`authorizedPerson${index}Phone`) }}</span>
                </div>
                <div class="form-group">
                  <label>E-posta</label>
                  <input v-model="person.email" type="email" />
                </div>
                <div class="form-group">
                  <label>Ünvan</label>
                  <SearchableSelect
                    :model-value="person.title || null"
                    :options="commonTitles"
                    placeholder="Ünvan seçin veya yazın"
                    search-placeholder="Ünvan ara..."
                    createable
                    clearable
                    @update:model-value="(value) => person.title = value || ''"
                    @create="(value) => person.title = value"
                  />
                </div>
                <div class="form-group full">
                  <label class="checkbox-label">
                    <input
                      :checked="person.isPrimary"
                      type="radio"
                      name="primaryAuthorizedPerson"
                      @change="setPrimaryAuthorizedPerson(index)"
                    />
                    <span>Ana yetkili</span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </template>


        <section class="form-section">
          <h3>İletişim Bilgileri</h3>
          <div class="form-grid">
            <div class="form-group" :class="{ error: hasError('phone') }">
              <label>Telefon <span class="required">*</span></label>
              <input
                v-model="form.phone"
                @blur="handleBlur('phone')"
                @input="handlePhoneInput"
                type="tel"
                inputmode="numeric"
                maxlength="13"
                placeholder="555 111 11 11"
              />
              <span class="error-text">{{ getError('phone') }}</span>
            </div>

            <div class="form-group" :class="{ error: hasError('email') }">
              <label>E-posta <span class="required">*</span></label>
              <input v-model="form.email" @blur="handleBlur('email')" type="email" />
              <span class="error-text">{{ getError('email') }}</span>
            </div>

            <div class="form-group full" :class="{ error: hasError('address') }">
              <label>Adres <span class="required">*</span></label>
              <textarea v-model="form.address" @blur="handleBlur('address')" @input="syncInvoiceAddress" rows="3"></textarea>
              <span class="error-text">{{ getError('address') }}</span>
            </div>

            <div class="form-group" :class="{ error: hasError('city') }">
              <label>Şehir <span class="required">*</span></label>
              <SearchableSelect
                v-model="selectedCityId"
                :options="cityOptions"
                placeholder="İl seçin"
                search-placeholder="İl ara..."
                clearable
                :error="hasError('city')"
                @blur="handleBlur('city')"
              />
              <span class="error-text">{{ getError('city') }}</span>
            </div>
          </div>
        </section>

        <section v-if="customerType === 'COMPANY'" class="form-section">
          <h3>Fatura Adresi</h3>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="sameAsAddress" @change="syncInvoiceAddress" />
              <span>Müşteri adresi ile aynı</span>
            </label>
          </div>
          <div v-if="!sameAsAddress" class="form-grid">
            <div class="form-group full" :class="{ error: hasError('invoiceAddress') }">
              <label>Fatura Adresi <span class="required">*</span></label>
              <textarea v-model="form.invoiceAddress" @blur="handleBlur('invoiceAddress')" rows="3"></textarea>
              <span class="error-text">{{ getError('invoiceAddress') }}</span>
            </div>
          </div>
        </section>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" @click="router.back()">İptal</button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.customer-form-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  width: fit-content;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.form-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.type-selector {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.type-btn {
  flex: 1;
  padding: 16px;
  background: var(--color-bg-secondary);
  border: none;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  background: var(--color-border);
}

.type-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-primary);
}

.main-form {
  padding: 32px;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.form-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 20px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: span 2;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.required {
  color: var(--color-danger);
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-group.error input,
.form-group.error select {
  border-color: var(--color-danger);
  background: #fff5f5;
}

.error-text {
  font-size: 12px;
  color: var(--color-danger);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
}

.btn-primary:active {
  transform: translateY(1px);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
}

.btn-add {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  background: var(--color-primary);
  color: white;
}

.authorized-person-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.authorized-person-card:last-child {
  margin-bottom: 0;
}

.person-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.person-number {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.btn-remove {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-remove:hover {
  background: var(--color-danger-light);
}

.checkbox-group {
  margin-bottom: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.full {
    grid-column: span 1;
  }
}
</style>
