<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi } from '@/api'
import { useValidation, rules, useToast } from '@/composables'
import { SearchableSelect } from '@/components/common'
import type { CustomerType, CreatePersonalCustomerForm, CreateCompanyCustomerForm, AuthorizedPerson } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const isEditMode = computed(() => route.params.id !== undefined)
const customerType = ref<CustomerType>(
  (route.params.type as CustomerType)?.toUpperCase() as CustomerType || 'PERSONAL'
)

const loading = ref(false)


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
  licenseClass: '',
  licenseExpiryDate: '',
  

  companyName: '',
  taxNumber: '',
  taxOffice: '',
  tradeRegistryNumber: '',
  invoiceAddress: ''
})

const authorizedPersons = ref<AuthorizedPerson[]>([{ firstName: '', lastName: '', nationalId: '', phone: '', email: '', title: '' }])
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

function addAuthorizedPerson() {
  authorizedPersons.value.push({ firstName: '', lastName: '', nationalId: '', phone: '', email: '', title: '' })
}

function removeAuthorizedPerson(index: number) {
  if (authorizedPersons.value.length > 1) {
    authorizedPersons.value.splice(index, 1)
  }
}

function syncInvoiceAddress() {
  if (sameAsAddress.value) {
    form.value.invoiceAddress = form.value.address
  }
}

const { validateForm, getError, hasError, touch, reset, isValid } = useValidation()


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
      licenseClass: { value: form.value.licenseClass, rules: [rules.required()] },
      licenseExpiryDate: { value: form.value.licenseExpiryDate, rules: [rules.required('Ehliyet geçerlilik tarihi zorunludur'), rules.futureDate('Ehliyet süresi dolmuş')] }
    }
  } else {
    const companyRules: Record<string, { value: unknown; rules: unknown[] }> = {
      ...common,
      companyName: { value: form.value.companyName, rules: [rules.required()] },
      taxNumber: { value: form.value.taxNumber, rules: [rules.required(), rules.taxNumber()] },
      taxOffice: { value: form.value.taxOffice, rules: [rules.required()] }
    }
    if (!sameAsAddress.value) {
      companyRules.invoiceAddress = { value: form.value.invoiceAddress, rules: [rules.required('Fatura adresi zorunludur')] }
    }
    authorizedPersons.value.forEach((person, index) => {
      companyRules[`authorizedPerson${index}FirstName`] = { value: person.firstName, rules: [rules.required('Ad zorunludur')] }
      companyRules[`authorizedPerson${index}LastName`] = { value: person.lastName, rules: [rules.required('Soyad zorunludur')] }
      companyRules[`authorizedPerson${index}NationalId`] = { value: person.nationalId, rules: [rules.required('TC Kimlik No zorunludur'), rules.tckn()] }
      companyRules[`authorizedPerson${index}Phone`] = { value: person.phone, rules: [rules.required('Telefon zorunludur'), rules.phone()] }
    })
    return companyRules
  }
})

async function fetchCustomer() {
  if (!isEditMode.value) return
  
  loading.value = true
  try {
    const data = await customersApi.getById(Number(route.params.id))
    customerType.value = data.customerType
    

    const [first, ...last] = (data.displayName || '').split(' ')
    form.value = {
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      
      firstName: first || '',
      lastName: last.join(' ') || '',
      nationalId: data.nationalId || '',
      birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
      licenseNumber: data.licenseNumber || '',
      licenseClass: data.licenseClass || '',
      licenseExpiryDate: data.licenseExpiryDate ? data.licenseExpiryDate.split('T')[0] : '',
      
      companyName: data.displayName || '',
      taxNumber: data.taxNumber || '',
      taxOffice: '', 
      contactPersonName: data.authorizedPersonName || '',
      contactPersonPhone: data.authorizedPersonPhone || '',
      tradeRegistryNumber: data.tradeRegistryNumber || ''
    }
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
        licenseClass: form.value.licenseClass,
        licenseExpiryDate: form.value.licenseExpiryDate
      }
      
      if (isEditMode.value) {
        await customersApi.update(Number(route.params.id), payload)
        toast.success('Müşteri başarıyla güncellendi')
      } else {
        await customersApi.createPersonal(payload)
        toast.success('Müşteri başarıyla oluşturuldu')
      }
    } else {
      if (sameAsAddress.value) {
        form.value.invoiceAddress = form.value.address
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
        tradeRegistryNumber: form.value.tradeRegistryNumber,
        authorizedPersons: authorizedPersons.value.filter(p => p.firstName && p.lastName && p.nationalId && p.phone)
      }
      
      if (isEditMode.value) {
        await customersApi.update(Number(route.params.id), payload)
        toast.success('Müşteri başarıyla güncellendi')
      } else {
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
                <label>Doğum Tarihi <span class="required">*</span></label>
                <input v-model="form.birthDate" @blur="handleBlur('birthDate')" type="date" />
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

              <div class="form-group" :class="{ error: hasError('licenseClass') }">
                <label>Sınıf <span class="required">*</span></label>
                <input v-model="form.licenseClass" @blur="handleBlur('licenseClass')" type="text" placeholder="B, E..." />
                <span class="error-text">{{ getError('licenseClass') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('licenseExpiryDate') }">
                <label>Geçerlilik Tarihi <span class="required">*</span></label>
                <input v-model="form.licenseExpiryDate" @blur="handleBlur('licenseExpiryDate')" type="date" />
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
                <input v-model="form.tradeRegistryNumber" type="text" />
              </div>
            </div>
          </section>

          <section class="form-section">
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
                  <input v-model="person.phone" @blur="handleBlur(`authorizedPerson${index}Phone`)" type="tel" placeholder="05XX..." />
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
              </div>
            </div>
          </section>
        </template>


        <section class="form-section">
          <h3>İletişim Bilgileri</h3>
          <div class="form-grid">
            <div class="form-group" :class="{ error: hasError('phone') }">
              <label>Telefon <span class="required">*</span></label>
              <input v-model="form.phone" @blur="handleBlur('phone')" type="tel" placeholder="05XX..." />
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
              <input v-model="form.city" @blur="handleBlur('city')" type="text" />
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
  overflow: hidden;
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
.form-group textarea {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-group.error input {
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

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.full {
    grid-column: span 1;
  }
}
</style>
