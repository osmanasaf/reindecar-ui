<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi, driversApi, referenceDataApi } from '@/api'
import { useToast } from '@/composables'
import { formatPhoneInput } from '@/utils/phone'
import type { Customer, CustomerType, CustomerStatus, CreditRating, CustomerStats, Driver, CreateDriverForm, UpdateDriverForm } from '@/types'
import CompanyAuthorizedPersonsSection from '@/components/customers/CompanyAuthorizedPersonsSection.vue'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const customer = ref<Customer | null>(null)
const loading = ref(true)
const stats = ref<CustomerStats | null>(null)
const loadingStats = ref(false)
const drivers = ref<Driver[]>([])
const loadingDrivers = ref(false)
const showDriverForm = ref(false)
const savingDriver = ref(false)
const editingDriver = ref<Driver | null>(null)
const showEditModal = ref(false)
const updatingDriver = ref(false)

const newDriver = ref<CreateDriverForm>({
  nationalId: '',
  firstName: '',
  lastName: '',
  licenseNumber: '',
  licenseExpiryDate: '',
  licenseClassId: undefined,
  phone: ''
})

const licenseClassOptions = ref<{ value: number; label: string }[]>([])

const editDriverForm = ref<UpdateDriverForm>({})

const customerId = computed(() => Number(route.params.id))

const typeLabels: Record<CustomerType, string> = {
  PERSONAL: 'Bireysel',
  COMPANY: 'Kurumsal'
}

const statusLabels: Record<CustomerStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  BLACKLISTED: 'Kara Liste'
}

/** Backend’de üst sınır olarak saklanan çalışan sayısını aralık etiketine çevirir */
function formatEmployeeCount(n: number | undefined | null): string {
  if (n == null) return '-'
  const map: Record<number, string> = { 20: '1-20', 200: '21-200', 500: '201-500', 9999: '501+' }
  return map[n] ?? String(n)
}

const creditRatingLabels: Record<CreditRating, string> = {
  EXCELLENT: 'Çok İyi',
  GOOD: 'İyi',
  FAIR: 'Orta',
  POOR: 'Zayıf',
  BAD: 'Kötü'
}

async function fetchStats() {
  loadingStats.value = true
  try {
    stats.value = await customersApi.getStats(customerId.value)
  } catch {
    stats.value = null
  } finally {
    loadingStats.value = false
  }
}

async function fetchLicenseClasses() {
  try {
    const list = await referenceDataApi.getLicenseClasses()
    licenseClassOptions.value = list.map(lc => ({ value: lc.id, label: lc.code }))
  } catch {
    licenseClassOptions.value = []
  }
}

async function fetchCustomer() {
  loading.value = true
  try {
    await fetchLicenseClasses()
    customer.value = await customersApi.getById(customerId.value)
    fetchDrivers()
    fetchStats()
  } catch {
    toast.error('Müşteri bilgileri yüklenemedi')
    router.push('/customers')
  } finally {
    loading.value = false
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function isLicenseExpiringSoon(expiryDate: string | undefined): boolean {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const in90Days = new Date()
  in90Days.setDate(in90Days.getDate() + 90)
  return expiry <= in90Days && expiry >= new Date()
}

function isLicenseExpired(expiryDate: string | undefined): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

async function fetchDrivers() {
  loadingDrivers.value = true
  try {
    drivers.value = await customersApi.getDrivers(customerId.value)
  } catch (err) {
    toast.apiError(err, 'Sürücüler yüklenemedi')
  } finally {
    loadingDrivers.value = false
  }
}

async function createDriver() {
  savingDriver.value = true
  try {
    const created = await customersApi.createDriver(customerId.value, newDriver.value)
    toast.success('Sürücü başarıyla eklendi')
    drivers.value.push(created)
    resetDriverForm()
    showDriverForm.value = false
  } catch (err) {
    toast.apiError(err, 'Sürücü eklenemedi')
  } finally {
    savingDriver.value = false
  }
}

function resetDriverForm() {
  newDriver.value = {
    nationalId: '',
    firstName: '',
    lastName: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    licenseClassId: undefined,
    phone: ''
  }
}

function getDriverDisplayName(driver: Driver): string {
  if (driver.fullName) return driver.fullName
  return `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'İsimsiz Sürücü'
}

function formatPhone(phone: string): string {
  const formatted = formatPhoneInput(phone)
  return formatted || phone
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR')
}

function maskId(id: string): string {
  if (id.length >= 11) {
    return `${id.slice(0, 3)}****${id.slice(-2)}`
  }
  return '***'
}

function maskTaxNumber(taxNo: string): string {
  if (!taxNo) return '-'
  if (taxNo.length >= 6) {
    return `${taxNo.slice(0, 3)}****${taxNo.slice(-2)}`
  }
  return '***'
}

const showBlacklistModal = ref(false)
const showUnblacklistModal = ref(false)
const blacklistReason = ref('')
const processingBlacklist = ref(false)

async function handleBlacklist() {
  showBlacklistModal.value = true
  blacklistReason.value = ''
}

async function confirmBlacklist() {
  if (!blacklistReason.value.trim()) {
    toast.error('Lütfen kara listeye ekleme sebebini giriniz')
    return
  }

  processingBlacklist.value = true
  try {
    await customersApi.addToBlacklist(customerId.value, blacklistReason.value)
    toast.success('Müşteri kara listeye eklendi')
    showBlacklistModal.value = false
    await fetchCustomer()
    await fetchStats()
  } catch (err) {
    toast.apiError(err, 'Kara listeye eklenemedi')
  } finally {
    processingBlacklist.value = false
  }
}

function handleUnblacklist() {
  showUnblacklistModal.value = true
}

async function confirmUnblacklist() {
  processingBlacklist.value = true
  try {
    await customersApi.removeFromBlacklist(customerId.value)
    toast.success('Müşteri kara listeden çıkarıldı')
    showUnblacklistModal.value = false
    await fetchCustomer()
    await fetchStats()
  } catch (err) {
    toast.apiError(err, 'Kara listeden çıkarılamadı')
  } finally {
    processingBlacklist.value = false
  }
}

const activeTab = ref<'info' | 'drivers' | 'documents'>('info')

const showDeleteDriverModal = ref(false)
const driverToDelete = ref<Driver | null>(null)

function confirmDeleteDriver(driver: Driver) {
  driverToDelete.value = driver
  showDeleteDriverModal.value = true
}

function closeDeleteDriverModal() {
  showDeleteDriverModal.value = false
  driverToDelete.value = null
}

async function doDeleteDriver() {
  if (!driverToDelete.value) return
  const driver = driverToDelete.value
  try {
    await driversApi.delete(driver.id)
    toast.success('Sürücü başarıyla silindi')
    drivers.value = drivers.value.filter(d => d.id !== driver.id)
    closeDeleteDriverModal()
  } catch (err) {
    toast.apiError(err, 'Sürücü silinemedi')
  }
}

function openEditModal(driver: Driver) {
  editingDriver.value = driver
  editDriverForm.value = {
    firstName: driver.firstName,
    lastName: driver.lastName,
    nationalId: driver.nationalId,
    phone: formatPhoneInput(driver.phone || ''),
    licenseNumber: driver.licenseNumber,
    licenseClassId: driver.licenseClassId,
    licenseExpiryDate: driver.licenseExpiryDate,
    active: driver.active
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingDriver.value = null
  editDriverForm.value = {}
}

function handleNewDriverPhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  newDriver.value.phone = formatPhoneInput(target.value)
}

function handleEditDriverPhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  editDriverForm.value.phone = formatPhoneInput(target.value)
}

async function updateDriver() {
  if (!editingDriver.value) return
  
  updatingDriver.value = true
  try {
    const updated = await driversApi.update(editingDriver.value.id, editDriverForm.value)
    toast.success('Sürücü başarıyla güncellendi')
    const index = drivers.value.findIndex(d => d.id === editingDriver.value!.id)
    if (index !== -1) {
      drivers.value[index] = updated
    }
    
    closeEditModal()
  } catch (err) {
    toast.apiError(err, 'Sürücü güncellenemedi')
  } finally {
    updatingDriver.value = false
  }
}

onMounted(fetchCustomer)
</script>

<template>
  <div class="customer-detail">
    <div v-if="loading" class="loading">Yükleniyor...</div>

    <template v-else-if="customer">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="router.back()">← Geri</button>
          <div class="title-group">
            <span class="avatar-large">{{ customer.displayName?.charAt(0) || '?' }}</span>
            <div>
              <h1>{{ customer.displayName }}</h1>
              <div class="subtitle">
                <span :class="['type-badge', customer.customerType.toLowerCase()]">
                  {{ typeLabels[customer.customerType] }}
                </span>
                <span :class="['status-badge', customer.status?.toLowerCase() ?? 'active']">
                  {{ statusLabels[customer.status] ?? 'Aktif' }}
                </span>
                <span class="public-id">{{ customer.publicId }}</span>
                <span v-if="customer.createdAt" class="created-at">Kayıt: {{ formatDate(customer.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button 
            v-if="customer.blacklisted" 
            class="btn btn-success"
            :disabled="processingBlacklist"
            @click="handleUnblacklist"
          >
            ✓ Kara Listeden Çıkar
          </button>
          <button 
            v-else 
            class="btn btn-danger"
            :disabled="processingBlacklist"
            @click="handleBlacklist"
          >
            ⚠️ Kara Listeye Ekle
          </button>
          <button class="btn btn-outline" @click="router.push(`/customers/${customer.id}/edit`)">✏️ Düzenle</button>
        </div>
      </header>

      <div v-if="customer.blacklisted" class="alert alert-danger">
        ⚠️ Bu müşteri kara listede: {{ customer.blacklistReason }}
      </div>

      <!-- Tab Navigasyonu -->
      <nav class="tab-nav">
        <button
          :class="['tab-btn', { active: activeTab === 'info' }]"
          @click="activeTab = 'info'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Genel Bilgiler
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'drivers' }]"
          @click="activeTab = 'drivers'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Sürücüler
          <span v-if="drivers.length > 0" class="tab-count">{{ drivers.length }}</span>
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'documents' }]"
          @click="activeTab = 'documents'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Belgeler
        </button>
      </nav>

      <!-- Genel Bilgiler Sekmesi -->
      <div v-show="activeTab === 'info'" class="detail-grid">
        <section class="card">
          <h2>İletişim Bilgileri</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Telefon</span>
              <span class="value">{{ formatPhone(customer.phone) }}</span>
            </div>
            <div class="info-item">
              <span class="label">E-posta</span>
              <span class="value">{{ customer.email }}</span>
            </div>
            <div class="info-item full">
              <span class="label">Adres</span>
              <span class="value">{{ [customer.address || customer.companyInfo?.invoiceAddress, customer.city].filter(Boolean).join(', ') || '-' }}</span>
            </div>
          </div>
        </section>

        <section class="card" v-if="customer.customerType === 'PERSONAL'">
          <h2>Kişisel Bilgiler</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Ad</span>
              <span class="value">{{ customer.personalInfo?.firstName || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Soyad</span>
              <span class="value">{{ customer.personalInfo?.lastName || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">TC Kimlik No</span>
              <span class="value mono">{{ maskId(customer.personalInfo?.nationalId || customer.nationalId || '') }}</span>
            </div>
            <div class="info-item">
              <span class="label">Doğum Tarihi</span>
              <span class="value">{{ customer.personalInfo?.birthDate ? formatDate(customer.personalInfo.birthDate) : (customer.birthDate ? formatDate(customer.birthDate) : '-') }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ehliyet No</span>
              <span class="value">{{ customer.personalInfo?.licenseNumber || customer.licenseNumber || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ehliyet Sınıfı</span>
              <span class="value">{{ customer.personalInfo?.licenseClassName || customer.personalInfo?.licenseClass || customer.licenseClass || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ehliyet Bitiş</span>
              <span class="value">{{ customer.personalInfo?.licenseExpiryDate ? formatDate(customer.personalInfo.licenseExpiryDate) : (customer.licenseExpiryDate ? formatDate(customer.licenseExpiryDate) : '-') }}</span>
            </div>
            <div class="info-item">
              <span class="label">Kredi Skoru</span>
              <span class="value">{{ customer.creditScore || '-' }}</span>
            </div>
          </div>
        </section>

        <section class="card" v-if="customer.customerType === 'COMPANY'">
          <h2>Şirket Bilgileri</h2>
          <div class="info-grid">
            <div class="info-item full">
              <span class="label">Şirket Adı</span>
              <span class="value">{{ customer.companyInfo?.companyName || customer.displayName || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Vergi No</span>
              <span class="value mono">{{ maskTaxNumber(customer.companyInfo?.taxNumber || customer.taxNumber || '') }}</span>
            </div>
            <div class="info-item">
              <span class="label">Vergi Dairesi</span>
              <span class="value">{{ customer.companyInfo?.taxOffice || customer.taxOffice || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Sektör</span>
              <span class="value">{{ customer.companyInfo?.sector ?? customer.sector ?? '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Çalışan Sayısı</span>
              <span class="value">{{ formatEmployeeCount(customer.companyInfo?.employeeCount ?? customer.employeeCount ?? undefined) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ticaret Sicil No</span>
              <span class="value">{{ customer.tradeRegisterNo || customer.tradeRegistryNumber || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ana Yetkili</span>
              <span class="value">{{ customer.authorizedPerson || customer.authorizedPersonName || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Yetkili Telefon</span>
              <span class="value">{{ customer.authorizedPersonPhone || '-' }}</span>
            </div>
          </div>
        </section>

        <section v-if="customer.customerType === 'COMPANY'" class="authorized-persons-card">
          <CompanyAuthorizedPersonsSection :customer-id="customer.id" />
        </section>

        <section class="card stats-card">
          <h2 class="card-title-with-icon">İstatistikler</h2>
          <div v-if="loadingStats" class="stats-loading">Yükleniyor...</div>
          <div v-else class="stats-grid">
            <div class="stat">
              <span class="stat-value">{{ stats?.totalCompletedRentals ?? 0 }}</span>
              <span class="stat-label">Tamamlanan Kiralama</span>
            </div>
            <div class="stat">
              <span :class="['stat-value', 'stat-badge', stats?.hasActiveRental ? 'stat-active' : 'stat-none']">
                {{ stats?.hasActiveRental ? 'Var' : 'Yok' }}
              </span>
              <span class="stat-label">Aktif Kiralama</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ formatCurrency(Number(stats?.totalSpending ?? 0)) }}</span>
              <span class="stat-label">Toplam Harcama</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ customer.creditScore ?? '-' }}</span>
              <span class="stat-label">
                Kredi Skoru
                <span v-if="customer.creditRating" :class="['credit-badge', customer.creditRating.toLowerCase()]">
                  {{ creditRatingLabels[customer.creditRating] }}
                </span>
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- Sürücüler Sekmesi -->
      <div v-show="activeTab === 'drivers'" class="tab-panel">
        <section class="card drivers-card">
          <div class="card-header">
            <h2>Sürücüler</h2>
            <button class="btn btn-primary btn-sm" @click="showDriverForm = !showDriverForm">
              {{ showDriverForm ? '✕ İptal' : '+ Sürücü Ekle' }}
            </button>
          </div>

          <div v-if="showDriverForm" class="driver-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="new-driver-first-name">Ad *</label>
                <input id="new-driver-first-name" v-model="newDriver.firstName" type="text" placeholder="Ad" />
              </div>
              <div class="form-group">
                <label for="new-driver-last-name">Soyad *</label>
                <input id="new-driver-last-name" v-model="newDriver.lastName" type="text" placeholder="Soyad" />
              </div>
              <div class="form-group">
                <label for="new-driver-national-id">TC Kimlik No *</label>
                <input
                  id="new-driver-national-id"
                  v-model="newDriver.nationalId"
                  type="text"
                  maxlength="11"
                  placeholder="11 haneli TC No"
                />
              </div>
              <div class="form-group">
                <label for="new-driver-phone">Telefon</label>
                <input
                  id="new-driver-phone"
                  v-model="newDriver.phone"
                  type="tel"
                  inputmode="numeric"
                  maxlength="13"
                  placeholder="555 111 11 11"
                  @input="handleNewDriverPhoneInput"
                />
              </div>
              <div class="form-group">
                <label for="new-driver-license-number">Ehliyet No *</label>
                <input
                  id="new-driver-license-number"
                  v-model="newDriver.licenseNumber"
                  type="text"
                  placeholder="Ehliyet numarası"
                />
              </div>
              <div class="form-group">
                <label>Ehliyet Sınıfı</label>
                <SearchableSelect
                  v-model="newDriver.licenseClassId"
                  :options="licenseClassOptions"
                  placeholder="Sınıf seçin"
                  search-placeholder="Ara..."
                  clearable
                />
              </div>
              <div class="form-group full">
                <DatePicker
                  v-model="newDriver.licenseExpiryDate"
                  label="Ehliyet Geçerlilik Tarihi *"
                  placeholder="Ehliyet geçerlilik tarihi"
                />
              </div>
            </div>
            <div class="form-actions">
              <button class="btn btn-outline" @click="showDriverForm = false; resetDriverForm()">İptal</button>
              <button class="btn btn-primary" :disabled="savingDriver" @click="createDriver">
                {{ savingDriver ? 'Kaydediliyor...' : 'Kaydet' }}
              </button>
            </div>
          </div>

          <div v-if="loadingDrivers" class="loading-small">Yükleniyor...</div>
          <div v-else-if="drivers.length === 0" class="empty-state">
            Henüz kayıtlı sürücü yok
          </div>
          <div v-else class="drivers-list">
            <div
              v-for="driver in drivers"
              :key="driver.id"
              :class="['driver-item', { 'license-expiring': isLicenseExpiringSoon(driver.licenseExpiryDate), 'license-expired': isLicenseExpired(driver.licenseExpiryDate) }]"
            >
              <div class="driver-avatar">{{ driver.firstName?.charAt(0) || '?' }}</div>
              <div class="driver-info">
                <div class="driver-name">
                  {{ getDriverDisplayName(driver) }}
                  <span v-if="driver.primary" class="badge-primary">Ana Sürücü</span>
                  <span v-if="driver.linkedToCustomer" class="badge-linked">Müşteri kartı</span>
                  <span v-if="!driver.active" class="badge-inactive">Pasif</span>
                  <span v-if="isLicenseExpired(driver.licenseExpiryDate)" class="badge-expired">Ehliyet süresi dolmuş</span>
                  <span v-else-if="isLicenseExpiringSoon(driver.licenseExpiryDate)" class="badge-expiring">Ehliyet süresi yaklaşıyor</span>
                </div>
                <div class="driver-details">
                  {{ formatPhone(driver.phone || '') }} |
                  {{ driver.licenseNumber }} |
                  {{ formatDate(driver.licenseExpiryDate) }}
                </div>
                <p v-if="driver.linkedToCustomer" class="driver-linked-hint">
                  Bu kart müşteri bilgileriyle eşitlenir; düzenlemek için müşteri bilgilerini güncelleyin.
                </p>
              </div>
              <div v-if="!driver.linkedToCustomer" class="driver-actions">
                <button class="btn-icon" @click="openEditModal(driver)" title="Düzenle">
                  Düzenle
                </button>
                <button class="btn-icon btn-danger" @click="confirmDeleteDriver(driver)" title="Sil">
                  Sil
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Belgeler Sekmesi -->
      <div v-show="activeTab === 'documents'" class="tab-panel documents-panel">
        <DocumentsSection
          reference-type="CUSTOMER"
          :reference-id="customer.id"
          title="Belgeler"
        />
      </div>

        <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
          <div class="modal">
            <div class="modal-header">
              <h3>Sürücü Düzenle</h3>
              <button class="close-btn" @click="closeEditModal">×</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group">
                  <label for="edit-driver-first-name">Ad *</label>
                  <input id="edit-driver-first-name" v-model="editDriverForm.firstName" type="text" placeholder="Ad" />
                </div>
                <div class="form-group">
                  <label for="edit-driver-last-name">Soyad *</label>
                  <input id="edit-driver-last-name" v-model="editDriverForm.lastName" type="text" placeholder="Soyad" />
                </div>
                <div class="form-group">
                  <label for="edit-driver-national-id">TC Kimlik No *</label>
                  <input
                    id="edit-driver-national-id"
                    v-model="editDriverForm.nationalId"
                    type="text"
                    maxlength="11"
                    placeholder="11 haneli TC No"
                  />
                </div>
                <div class="form-group">
                  <label for="edit-driver-phone">Telefon</label>
                  <input
                    id="edit-driver-phone"
                    v-model="editDriverForm.phone"
                    type="tel"
                    inputmode="numeric"
                    maxlength="13"
                    placeholder="555 111 11 11"
                    @input="handleEditDriverPhoneInput"
                  />
                </div>
                <div class="form-group">
                  <label for="edit-driver-license-number">Ehliyet No *</label>
                  <input
                    id="edit-driver-license-number"
                    v-model="editDriverForm.licenseNumber"
                    type="text"
                    placeholder="Ehliyet numarası"
                  />
                </div>
                <div class="form-group">
                  <label>Ehliyet Sınıfı</label>
                  <SearchableSelect
                    v-model="editDriverForm.licenseClassId"
                    :options="licenseClassOptions"
                    placeholder="Sınıf seçin"
                    search-placeholder="Ara..."
                    clearable
                  />
                </div>
                <div class="form-group full">
                  <DatePicker
                    v-model="editDriverForm.licenseExpiryDate"
                    label="Ehliyet Geçerlilik Tarihi *"
                    placeholder="Ehliyet geçerlilik tarihi"
                  />
                </div>
                <div class="form-group full">
                  <label class="checkbox-label">
                    <input v-model="editDriverForm.active" type="checkbox" />
                    <span>Aktif</span>
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" @click="closeEditModal">
                İptal
              </button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="updatingDriver"
                @click="updateDriver"
              >
                {{ updatingDriver ? 'Güncelleniyor...' : 'Güncelle' }}
              </button>
            </div>
          </div>
        </div>
    </template>

    <div v-if="showBlacklistModal" class="modal-overlay" @click.self="showBlacklistModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Kara Listeye Ekle</h3>
          <button class="close-btn" @click="showBlacklistModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            <strong>{{ customer?.displayName }}</strong> adlı müşteriyi kara listeye eklemek istediğinize emin misiniz?
          </p>
          <div class="form-group">
            <label for="blacklist-reason">Sebep *</label>
            <textarea
              id="blacklist-reason"
              v-model="blacklistReason"
              rows="4"
              placeholder="Kara listeye ekleme sebebini yazınız..."
              autofocus
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showBlacklistModal = false">İptal</button>
          <button 
            class="btn btn-danger" 
            :disabled="processingBlacklist || !blacklistReason.trim()"
            @click="confirmBlacklist"
          >
            {{ processingBlacklist ? 'İşleniyor...' : 'Kara Listeye Ekle' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showUnblacklistModal" class="modal-overlay" @click.self="showUnblacklistModal = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>Kara Listeden Çıkar</h3>
          <button class="close-btn" @click="showUnblacklistModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            <strong>{{ customer?.displayName }}</strong> adlı müşteriyi kara listeden çıkarmak istediğinize emin misiniz?
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showUnblacklistModal = false">Vazgeç</button>
          <button 
            class="btn btn-success" 
            :disabled="processingBlacklist"
            @click="confirmUnblacklist"
          >
            {{ processingBlacklist ? 'İşleniyor...' : 'Kara Listeden Çıkar' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteDriverModal && driverToDelete" class="modal-overlay" @click.self="closeDeleteDriverModal">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>Sürücüyü Sil</h3>
          <button class="close-btn" @click="closeDeleteDriverModal">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            <strong>{{ getDriverDisplayName(driverToDelete) }}</strong> adlı sürücüyü silmek istediğinize emin misiniz?
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeDeleteDriverModal">Vazgeç</button>
          <button class="btn btn-danger" @click="doDeleteDriver">Sil</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-large {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
}

.title-group h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.subtitle {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.type-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.personal {
  background: #dbeafe;
  color: #1d4ed8;
}

.type-badge.company {
  background: #f3e8ff;
  color: #7c3aed;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: var(--color-success-light, #dcfce7);
  color: var(--color-success, #166534);
}

.status-badge.inactive {
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
}

.status-badge.blacklisted {
  background: var(--color-danger-light, #fee2e2);
  color: var(--color-danger, #b91c1c);
}

.public-id,
.created-at {
  color: var(--color-text-muted);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.alert {
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
}

.alert-danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.tab-nav {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 24px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  border-radius: 6px 6px 0 0;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--color-text);
  background: var(--color-bg-secondary);
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  background: none;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
}

.tab-panel {
  width: 100%;
}

.tab-panel .drivers-card {
  grid-column: unset;
}

.documents-panel :deep(.documents-section) {
  border-radius: 12px;
}

.documents-panel :deep(.file-grid) {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.card h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: var(--color-text-secondary);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full {
  grid-column: span 2;
}

.info-item .label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.info-item .value {
  font-size: 15px;
  font-weight: 500;
}

.info-item .value.mono {
  font-family: monospace;
}

.stats-card {
  grid-column: span 2;
}

.card-title-with-icon {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: var(--color-text-secondary);
}

.stats-loading {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-value.stat-badge {
  font-size: 18px;
  font-weight: 600;
}

.stat-value.stat-active {
  color: var(--color-success, #166534);
}

.stat-value.stat-none {
  color: var(--color-text-muted);
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.credit-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.credit-badge.excellent { background: #dcfce7; color: #166534; }
.credit-badge.good { background: #dbeafe; color: #1d4ed8; }
.credit-badge.fair { background: #fef3c7; color: #b45309; }
.credit-badge.poor { background: #fed7aa; color: #c2410c; }
.credit-badge.bad { background: #fee2e2; color: #b91c1c; }

.authorized-persons-card {
  grid-column: span 2;
}

.drivers-card {
  grid-column: span 2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h2 {
  margin: 0;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 13px;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.driver-form {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
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

.form-group input {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-surface);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.loading-small {
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px dashed var(--color-border);
}

.drivers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.driver-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.driver-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
}

.driver-info {
  flex: 1;
}

.driver-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.driver-details {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.driver-linked-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.driver-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-primary);
}

.btn-icon.btn-danger:hover {
  background: #fee;
  border-color: var(--color-danger);
}

.badge-primary {
  padding: 2px 8px;
  background: var(--color-success-light);
  color: var(--color-success);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.badge-linked {
  padding: 2px 8px;
  background: var(--color-info-light, #dbeafe);
  color: var(--color-info, #2563eb);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.badge-inactive {
  padding: 2px 8px;
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.badge-expiring {
  padding: 2px 8px;
  background: #fef3c7;
  color: #b45309;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.badge-expired {
  padding: 2px 8px;
  background: var(--color-danger-light, #fee2e2);
  color: var(--color-danger, #b91c1c);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.driver-item.license-expiring {
  border-left: 3px solid #f59e0b;
}

.driver-item.license-expired {
  border-left: 3px solid var(--color-danger, #b91c1c);
}

.driver-expiry {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.driver-expiry .label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.driver-expiry .value {
  font-size: 13px;
  font-weight: 500;
}

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
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal.modal-sm {
  max-width: 420px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.modal-body {
  padding: 24px;
}

.modal-description {
  margin: 0 0 20px 0;
  color: var(--color-text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 16px 24px 20px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-card,
  .authorized-persons-card,
  .drivers-card {
    grid-column: span 1;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.full {
    grid-column: span 1;
  }
}
</style>


