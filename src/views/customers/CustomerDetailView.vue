<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { customersApi, driversApi, referenceDataApi, rentalsApi, receivablesApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import { formatPhoneInput } from '@/utils/phone'
import { fmtTRY, formatDate as formatDateUtil } from '@/utils/format'
import type { Customer, CustomerType, CustomerStatus, CreditRating, CustomerStats, Driver, CreateDriverForm, UpdateDriverForm, Rental, ReceivableResponse } from '@/types'
import CompanyAuthorizedPersonsSection from '@/components/customers/CompanyAuthorizedPersonsSection.vue'
import CustomerEditModal from '@/components/customers/CustomerEditModal.vue'
import BirthDateCorrectionModal from '@/components/customers/BirthDateCorrectionModal.vue'
import CustomerDriverEditModal from '@/components/customers/CustomerDriverEditModal.vue'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcIcon } from '@/components/icons'
import {
  RcButton,
  RcBadge,
  RcAvatar,
  RcSegTab,
  RcStatusPill,
  RcEmpty,
  RcField,
  RcDetailSkeleton,
  RcSkeleton,
  RcTableSkeleton,
  RcListSkeleton,
} from '@/components/rc'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isEnabled } = useFeatures()

const customer = ref<Customer | null>(null)
const loading = ref(true)
const stats = ref<CustomerStats | null>(null)
const loadingStats = ref(false)
const drivers = ref<Driver[]>([])
const loadingDrivers = ref(false)
const showDriverForm = ref(false)
const savingDriver = ref(false)
const editingDriver = ref<Driver | null>(null)
const showDriverEditModal = ref(false)
const showCustomerEditModal = ref(false)
const showBirthDateModal = ref(false)
const updatingDriver = ref(false)

const previewRentals = ref<Rental[]>([])
const loadingPreviewRentals = ref(false)

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

const activeTab = ref<'info' | 'rentals' | 'finance' | 'drivers' | 'documents'>('info')

const rentals = ref<Rental[]>([])
const loadingRentals = ref(false)
const rentalsLoaded = ref(false)

const receivables = ref<ReceivableResponse[]>([])
const loadingFinance = ref(false)
const financeLoaded = ref(false)

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
    fetchPreviewRentals()
  } catch {
    toast.error('Müşteri bilgileri yüklenemedi')
    router.push('/customers')
  } finally {
    loading.value = false
  }
}

async function fetchPreviewRentals() {
  loadingPreviewRentals.value = true
  try {
    const response = await rentalsApi.getByCustomer(customerId.value, {
      page: 0,
      size: 5,
      sort: 'startDate',
      direction: 'desc',
    })
    previewRentals.value = response.content
  } catch {
    previewRentals.value = []
  } finally {
    loadingPreviewRentals.value = false
  }
}

function openCustomerEdit() {
  showCustomerEditModal.value = true
}

async function onCustomerSaved() {
  await fetchCustomer()
  await fetchStats()
  rentalsLoaded.value = false
  financeLoaded.value = false
}

function onBirthDateUpdated(updated: Customer) {
  customer.value = updated
}

const canCorrectBirthDate = computed(
  () =>
    isEnabled('MANUAL_BIRTH_DATE_EDIT') &&
    customer.value?.customerType === 'PERSONAL',
)

const lastActivityLabel = computed(() => {
  const at = customer.value?.lastActivityAt
  if (at) return formatDate(at)
  const latest = previewRentals.value[0]
  if (latest?.startDate) return formatDate(latest.startDate)
  return customer.value?.createdAt ? formatDate(customer.value.createdAt) : '—'
})

const outstandingBalance = computed(() => customer.value?.outstandingBalance ?? 0)

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

function formatDate(date: string | null | undefined): string {
  return formatDateUtil(date)
}

async function fetchRentals() {
  if (rentalsLoaded.value) return
  loadingRentals.value = true
  try {
    const response = await rentalsApi.getByCustomer(customerId.value, { page: 0, size: 50, sort: 'startDate', direction: 'desc' })
    rentals.value = response.content
    rentalsLoaded.value = true
  } catch (err) {
    toast.apiError(err, 'Kiralamalar yüklenemedi')
  } finally {
    loadingRentals.value = false
  }
}

async function fetchFinance() {
  if (financeLoaded.value) return
  loadingFinance.value = true
  try {
    receivables.value = await receivablesApi.getByCustomer(customerId.value)
    financeLoaded.value = true
  } catch (err) {
    toast.apiError(err, 'Finans verileri yüklenemedi')
  } finally {
    loadingFinance.value = false
  }
}

function startRental() {
  router.push({ name: 'rental-create', query: { customerId: String(customerId.value) } })
}

watch(activeTab, (tab) => {
  if (tab === 'rentals') fetchRentals()
  if (tab === 'finance') fetchFinance()
})

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
const showArchiveModal = ref(false)
const archivingCustomer = ref(false)

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

async function confirmArchiveCustomer() {
  archivingCustomer.value = true
  try {
    await customersApi.deleteById(customerId.value)
    toast.success('Müşteri listeden kaldırıldı (arşivlendi)')
    showArchiveModal.value = false
    router.push('/customers')
  } catch (err) {
    toast.apiError(err, 'Müşteri arşivlenemedi')
  } finally {
    archivingCustomer.value = false
  }
}

const financeSummary = computed(() => {
  const open = receivables.value.filter((r) => r.remainingAmount > 0)
  return {
    totalOutstanding: open.reduce((s, r) => s + r.remainingAmount, 0),
    openCount: open.length,
    totalPaid: receivables.value.reduce((s, r) => s + r.paidAmount, 0),
  }
})

const detailTabs = computed(() => [
  { id: 'info', label: 'Genel' },
  { id: 'rentals', label: 'Kiralamalar', count: stats.value?.totalCompletedRentals || undefined },
  {
    id: 'finance',
    label: 'Finans',
    count: financeSummary.value.openCount || undefined,
  },
  { id: 'drivers', label: 'Sürücüler', count: drivers.value.length || undefined },
  { id: 'documents', label: 'Belgeler' },
])

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

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
  showDriverEditModal.value = true
}

function closeEditModal() {
  showDriverEditModal.value = false
  editingDriver.value = null
}

function handleNewDriverPhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  newDriver.value.phone = formatPhoneInput(target.value)
}

async function updateDriver(form: UpdateDriverForm) {
  if (!editingDriver.value) return

  updatingDriver.value = true
  try {
    const updated = await driversApi.update(editingDriver.value.id, form)
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

onMounted(() => {
  fetchCustomer()
  if (route.query.edit === '1') {
    showCustomerEditModal.value = true
    router.replace({ query: {} })
  }
})
</script>

<template>
  <div class="customer-detail rc-page">
    <RcDetailSkeleton v-if="loading" :sections="2" />

    <template v-else-if="customer">
      <div class="rc-cust-detail-nav">
        <RouterLink to="/customers" class="rc-btn rc-btn--ghost rc-btn--sm">
          <RcIcon name="chevronLeft" :size="14" />
          Müşterilere dön
        </RouterLink>
        <span class="rc-cust-detail-nav__activity">Son aktivite: {{ lastActivityLabel }}</span>
      </div>

      <div class="rcv-hero rcv-hero--tight">
        <RcAvatar size="lg" class="rc-cust-hero-avatar">{{ initials(customer.displayName) }}</RcAvatar>
        <div class="rcv-hero__info">
          <div class="rcv-hero__badges" style="margin-top: 0">
            <span class="rcv-hero__plate">{{ customer.publicId }}</span>
            <RcBadge :variant="customer.customerType === 'COMPANY' ? 'purple' : 'accent'">
              {{ typeLabels[customer.customerType] }}
            </RcBadge>
            <RcBadge v-if="customer.blacklisted" variant="danger" dot>Kara liste</RcBadge>
            <RcBadge v-else variant="success" dot>{{ statusLabels[customer.status] ?? 'Aktif' }}</RcBadge>
          </div>
          <h1 class="rcv-hero__title">{{ customer.displayName }}</h1>
          <div class="rcv-hero__meta">
            <span v-if="customer.city">
              <RcIcon name="pin" :size="13" />
              {{ customer.city }}
            </span>
            <span v-if="customer.createdAt">
              <RcIcon name="calendar" :size="13" />
              Kayıt: {{ formatDate(customer.createdAt) }}
            </span>
            <span>
              <RcIcon name="phone" :size="13" />
              {{ formatPhone(customer.phone) }}
            </span>
          </div>
        </div>
        <div class="rcv-hero__actions">
          <RcButton
            variant="accent"
            :disabled="customer.blacklisted"
            style="min-width: 160px"
            @click="startRental"
          >
            <RcIcon name="plus" :size="14" />
            Yeni kiralama
          </RcButton>
          <a :href="`tel:${customer.phone}`" class="rc-btn rc-btn--secondary">
            <RcIcon name="phone" :size="14" />
            Ara
          </a>
          <RcButton variant="ghost" @click="openCustomerEdit">
            <RcIcon name="edit" :size="14" />
            Düzenle
          </RcButton>
          <RcButton
            v-if="customer.blacklisted"
            variant="secondary"
            :disabled="processingBlacklist"
            @click="handleUnblacklist"
          >
            Kara listeden çıkar
          </RcButton>
          <RcButton
            v-else
            variant="danger"
            :disabled="processingBlacklist"
            @click="handleBlacklist"
          >
            Kara listeye ekle
          </RcButton>
          <RcButton variant="ghost" @click="showArchiveModal = true">
            Listeden kaldır
          </RcButton>
        </div>
      </div>

      <div v-if="customer.blacklisted" class="rc-alert rc-alert--danger" role="alert" style="margin-top: 14px">
        <RcIcon name="warning" :size="16" />
        <span>Bu müşteri kara listede: {{ customer.blacklistReason }}</span>
      </div>

      <div v-if="loadingStats" style="margin-top: 14px">
        <RcSkeleton height="88px" />
      </div>
      <div v-else class="rcv-stats rcv-stats--airy" style="margin-top: 14px">
        <div class="rcv-stat">
          <div class="rcv-stat__label">Toplam harcama</div>
          <div class="rcv-stat__value">{{ fmtTRY(stats?.totalSpending ?? 0) }}</div>
          <div class="rcv-stat__sub">{{ stats?.totalCompletedRentals ?? 0 }} tamamlanan kiralama</div>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Toplam kiralama</div>
          <div class="rcv-stat__value">{{ customer.totalRentals ?? stats?.totalCompletedRentals ?? 0 }}</div>
          <div class="rcv-stat__sub">kayıtlı kiralama</div>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Aktif kiralama</div>
          <div class="rcv-stat__value">{{ stats?.hasActiveRental ? 'Var' : 'Yok' }}</div>
          <div class="rcv-stat__sub">{{ stats?.hasActiveRental ? 'devam eden sözleşme' : 'açık kiralama yok' }}</div>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Açık bakiye</div>
          <div class="rcv-stat__value" :class="{ 'rcv-stat__value--warn': outstandingBalance > 0 }">
            {{ fmtTRY(outstandingBalance) }}
          </div>
          <div class="rcv-stat__sub">{{ outstandingBalance > 0 ? 'tahsil edilecek' : 'borç yok' }}</div>
        </div>
      </div>

      <div class="rc-card rc-cust-tab-card" style="margin-top: 14px">
        <div class="rc-segtabs">
          <RcSegTab
            v-for="tab in detailTabs"
            :id="tab.id"
            :key="tab.id"
            :active="activeTab"
            :count="tab.count"
            @select="activeTab = $event as typeof activeTab"
          >
            {{ tab.label }}
          </RcSegTab>
        </div>
      </div>

      <div class="rc-cust-tab-panel">
      <!-- Genel -->
      <div v-show="activeTab === 'info'" class="rc-detail">
        <div class="rc-detail__main">
          <div class="rc-card" style="overflow: hidden">
            <div class="rc-card__head">
              <h3 class="rc-card__title">Son kiralamalar</h3>
              <RcButton variant="ghost" size="sm" @click="activeTab = 'rentals'; fetchRentals()">
                Tümü
                <RcIcon name="chevronRight" :size="14" />
              </RcButton>
            </div>
            <RcListSkeleton v-if="loadingPreviewRentals" :rows="3" />
            <RcEmpty
              v-else-if="previewRentals.length === 0"
              title="Kiralama kaydı yok"
              description="Bu müşteriye ait kiralama bulunamadı"
            />
            <table v-else class="rc-table rcv-table--slim">
              <thead>
                <tr>
                  <th>Kiralama</th>
                  <th>Araç</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                  <th class="rc-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="rental in previewRentals"
                  :key="rental.id"
                  style="cursor: pointer"
                  @click="router.push(`/rentals/${rental.id}`)"
                >
                  <td><span class="rc-mono" style="font-size: 12.5px; font-weight: 500">{{ rental.rentalNumber }}</span></td>
                  <td>
                    <div class="rcv-row__primary">{{ rental.vehiclePlate || rental.vehicleName || '—' }}</div>
                  </td>
                  <td><span class="rc-mono" style="font-size: 12.5px">{{ formatDate(rental.startDate) }}</span></td>
                  <td><RcStatusPill :status="rental.status" /></td>
                  <td class="rc-right rc-num" style="font-weight: 500">{{ fmtTRY(rental.grandTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="customer.customerType === 'COMPANY'" class="rc-card">
            <CompanyAuthorizedPersonsSection :customer-id="customer.id" />
          </div>
        </div>

        <div class="rc-detail__side">
          <div class="rc-card">
            <div class="rc-card__head">
              <h3 class="rc-card__title">İletişim</h3>
            </div>
            <div class="rc-card__body">
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Telefon</span>
                <a :href="`tel:${customer.phone}`" class="rc-meta-row__value">{{ formatPhone(customer.phone) }}</a>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">E-posta</span>
                <a :href="`mailto:${customer.email}`" class="rc-meta-row__value">{{ customer.email || '—' }}</a>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Adres</span>
                <span class="rc-meta-row__value">
                  {{ [customer.address, customer.city].filter(Boolean).join(', ') || '—' }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="customer.customerType === 'PERSONAL'" class="rc-card">
            <div class="rc-card__head">
              <h3 class="rc-card__title">Kimlik & ehliyet</h3>
              <FeatureGate feature="MANUAL_BIRTH_DATE_EDIT">
                <RcButton
                  v-if="canCorrectBirthDate"
                  variant="ghost"
                  size="sm"
                  @click="showBirthDateModal = true"
                >
                  <RcIcon name="edit" :size="14" />
                  Doğum tarihini düzelt
                </RcButton>
              </FeatureGate>
            </div>
            <div class="rc-card__body">
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">TC Kimlik</span>
                <span class="rc-meta-row__value rc-mono">{{ maskId(customer.personalInfo?.nationalId || customer.nationalId || '') }}</span>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Doğum tarihi</span>
                <span class="rc-meta-row__value">
                  {{ customer.personalInfo?.birthDate ? formatDate(customer.personalInfo.birthDate) : (customer.birthDate ? formatDate(customer.birthDate) : '—') }}
                </span>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Ehliyet no</span>
                <span class="rc-meta-row__value">{{ customer.personalInfo?.licenseNumber || customer.licenseNumber || '—' }}</span>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Ehliyet sınıfı</span>
                <span class="rc-meta-row__value">{{ customer.personalInfo?.licenseClassName || customer.personalInfo?.licenseClass || customer.licenseClass || '—' }}</span>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Ehliyet bitiş</span>
                <span class="rc-meta-row__value">{{ customer.personalInfo?.licenseExpiryDate ? formatDate(customer.personalInfo.licenseExpiryDate) : (customer.licenseExpiryDate ? formatDate(customer.licenseExpiryDate) : '—') }}</span>
              </div>
            </div>
          </div>

          <div v-else class="rc-card">
            <div class="rc-card__head">
              <h3 class="rc-card__title">Şirket bilgileri</h3>
            </div>
            <div class="rc-card__body">
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Vergi no</span>
                <span class="rc-meta-row__value rc-mono">{{ maskTaxNumber(customer.companyInfo?.taxNumber || customer.taxNumber || '') }}</span>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Vergi dairesi</span>
                <span class="rc-meta-row__value">{{ customer.companyInfo?.taxOffice || customer.taxOffice || '—' }}</span>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Sektör</span>
                <span class="rc-meta-row__value">{{ customer.companyInfo?.sector ?? customer.sector ?? '—' }}</span>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Çalışan sayısı</span>
                <span class="rc-meta-row__value">{{ formatEmployeeCount(customer.companyInfo?.employeeCount ?? customer.employeeCount ?? undefined) }}</span>
              </div>
              <div class="rc-meta-row">
                <span class="rc-meta-row__label">Kredi skoru</span>
                <span class="rc-meta-row__value">
                  {{ customer.creditScore ?? '—' }}
                  <RcBadge v-if="customer.creditRating" variant="warning" style="margin-left: 6px">{{ creditRatingLabels[customer.creditRating] }}</RcBadge>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kiralamalar -->
      <div v-show="activeTab === 'rentals'">
        <RcTableSkeleton v-if="loadingRentals" :rows="5" :cols="4" />
        <RcEmpty
          v-else-if="rentals.length === 0"
          title="Kiralama kaydı yok"
          description="Bu müşteriye ait kiralama bulunamadı"
        />
        <div v-else class="rc-card" style="overflow: hidden">
          <table class="rc-table rcv-table--slim">
            <thead>
              <tr>
                <th>Kiralama</th>
                <th>Araç</th>
                <th>Tarih</th>
                <th class="rc-right">Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rental in rentals"
                :key="rental.id"
                style="cursor: pointer"
                @click="router.push(`/rentals/${rental.id}`)"
              >
                <td>
                  <div class="rcv-row__primary">{{ rental.rentalNumber }}</div>
                  <div class="rcv-row__secondary">{{ rental.rentalType }}</div>
                </td>
                <td>
                  <div class="rcv-row__primary">{{ rental.vehiclePlate || rental.vehicleName || '—' }}</div>
                </td>
                <td>
                  <div class="rcv-row__primary">{{ formatDate(rental.startDate) }} – {{ formatDate(rental.endDate) }}</div>
                  <div v-if="rental.actualReturnDate" class="rcv-row__secondary">İade: {{ formatDate(rental.actualReturnDate) }}</div>
                </td>
                <td class="rc-right rc-num">{{ fmtTRY(rental.grandTotal) }}</td>
                <td><RcStatusPill :status="rental.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Finans -->
      <div v-show="activeTab === 'finance'">
        <RcTableSkeleton v-if="loadingFinance" :rows="5" :cols="4" />
        <template v-else>
          <div class="rc-kpi-grid" style="margin-bottom: 16px">
            <div class="rc-kpi">
              <div class="rc-kpi__label">Açık alacak</div>
              <div class="rc-kpi__value rc-num">{{ fmtTRY(financeSummary.totalOutstanding) }}</div>
              <div class="rc-kpi__sub">{{ financeSummary.openCount }} kayıt</div>
            </div>
            <div class="rc-kpi">
              <div class="rc-kpi__label">Tahsil edilen</div>
              <div class="rc-kpi__value rc-num">{{ fmtTRY(financeSummary.totalPaid) }}</div>
            </div>
          </div>
          <RcEmpty
            v-if="receivables.length === 0"
            title="Alacak kaydı yok"
            description="Bu müşteriye ait alacak bulunamadı"
          />
          <div v-else class="rc-card" style="overflow: hidden">
            <table class="rc-table rcv-table--slim">
              <thead>
                <tr>
                  <th>Alacak</th>
                  <th>Açıklama</th>
                  <th>Vade</th>
                  <th class="rc-right">Kalan</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in receivables"
                  :key="row.id"
                  style="cursor: pointer"
                  @click="router.push(`/accounting/receivables/${row.id}`)"
                >
                  <td class="rcv-row__plate">{{ row.receivableNumber }}</td>
                  <td>
                    <div class="rcv-row__primary">{{ row.description }}</div>
                    <div v-if="row.vehiclePlate" class="rcv-row__secondary">{{ row.vehiclePlate }}</div>
                  </td>
                  <td>{{ formatDate(row.dueDate) }}</td>
                  <td class="rc-right rc-num">{{ fmtTRY(row.remainingAmount) }}</td>
                  <td><RcStatusPill :status="row.status" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <!-- Sürücüler -->
      <div v-show="activeTab === 'drivers'" class="rc-cust-tab-panel">
        <div class="rc-card">
          <div class="rc-card__head">
            <h3 class="rc-card__title">Sürücüler</h3>
            <RcButton variant="accent" size="sm" @click="showDriverForm = !showDriverForm">
              <RcIcon :name="showDriverForm ? 'close' : 'plus'" :size="14" />
              {{ showDriverForm ? 'İptal' : 'Sürücü ekle' }}
            </RcButton>
          </div>

          <div v-if="showDriverForm" class="rc-card__body rc-cust-drivers-form">
            <div class="rcv-form-grid">
              <RcField label="Ad *">
                <input id="new-driver-first-name" v-model="newDriver.firstName" class="rc-input" type="text" placeholder="Ad" />
              </RcField>
              <RcField label="Soyad *">
                <input id="new-driver-last-name" v-model="newDriver.lastName" class="rc-input" type="text" placeholder="Soyad" />
              </RcField>
              <RcField label="TC Kimlik No *">
                <input
                  id="new-driver-national-id"
                  v-model="newDriver.nationalId"
                  class="rc-input rc-mono"
                  type="text"
                  maxlength="11"
                  placeholder="11 haneli TC No"
                />
              </RcField>
              <RcField label="Telefon">
                <input
                  id="new-driver-phone"
                  v-model="newDriver.phone"
                  class="rc-input rc-mono"
                  type="tel"
                  inputmode="numeric"
                  maxlength="13"
                  placeholder="555 111 11 11"
                  @input="handleNewDriverPhoneInput"
                />
              </RcField>
              <RcField label="Ehliyet no *">
                <input
                  id="new-driver-license-number"
                  v-model="newDriver.licenseNumber"
                  class="rc-input"
                  type="text"
                  placeholder="Ehliyet numarası"
                />
              </RcField>
              <RcField label="Ehliyet sınıfı">
                <SearchableSelect
                  :model-value="newDriver.licenseClassId ?? null"
                  :options="licenseClassOptions"
                  placeholder="Sınıf seçin"
                  search-placeholder="Ara..."
                  clearable
                  @update:model-value="newDriver.licenseClassId = ($event as number | undefined) ?? undefined"
                />
              </RcField>
              <RcField label="Ehliyet geçerlilik *" class="span-2">
                <DatePicker
                  v-model="newDriver.licenseExpiryDate"
                  placeholder="Ehliyet geçerlilik tarihi"
                />
              </RcField>
            </div>
            <div class="rc-cust-drivers-form__actions">
              <RcButton variant="ghost" @click="showDriverForm = false; resetDriverForm()">İptal</RcButton>
              <RcButton variant="accent" :disabled="savingDriver" @click="createDriver">
                {{ savingDriver ? 'Kaydediliyor…' : 'Kaydet' }}
              </RcButton>
            </div>
          </div>

          <div v-if="loadingDrivers" class="rc-card__body">
            <RcSkeleton height="120px" radius="lg" />
          </div>
          <RcEmpty
            v-else-if="drivers.length === 0 && !showDriverForm"
            title="Henüz sürücü yok"
            description="Bu müşteriye bağlı ek sürücü ekleyebilirsiniz"
          />
          <div v-else-if="drivers.length > 0" class="rc-card__body rc-cust-drivers-list">
            <div
              v-for="driver in drivers"
              :key="driver.id"
              class="rc-cust-driver-row"
              :class="{
                'rc-cust-driver-row--expiring': isLicenseExpiringSoon(driver.licenseExpiryDate),
                'rc-cust-driver-row--expired': isLicenseExpired(driver.licenseExpiryDate),
              }"
            >
              <RcAvatar size="sm">{{ driver.firstName?.charAt(0) || '?' }}</RcAvatar>
              <div class="rc-cust-driver-row__info">
                <div class="rc-cust-driver-row__name">
                  {{ getDriverDisplayName(driver) }}
                  <RcBadge v-if="driver.primary" variant="accent">Ana sürücü</RcBadge>
                  <RcBadge v-if="driver.linkedToCustomer" variant="info">Müşteri kartı</RcBadge>
                  <RcBadge v-if="!driver.active" variant="default">Pasif</RcBadge>
                  <RcBadge v-if="isLicenseExpired(driver.licenseExpiryDate)" variant="danger">Ehliyet süresi dolmuş</RcBadge>
                  <RcBadge v-else-if="isLicenseExpiringSoon(driver.licenseExpiryDate)" variant="warning">Ehliyet yaklaşıyor</RcBadge>
                </div>
                <div class="rc-cust-driver-row__meta">
                  {{ formatPhone(driver.phone || '') }} · {{ driver.licenseNumber }} · {{ formatDate(driver.licenseExpiryDate) }}
                </div>
                <p v-if="driver.linkedToCustomer" class="rc-cust-driver-row__hint">
                  Bu kart müşteri bilgileriyle eşitlenir; düzenlemek için müşteri bilgilerini güncelleyin.
                </p>
              </div>
              <div v-if="!driver.linkedToCustomer" class="rc-cust-driver-row__actions">
                <RcButton variant="ghost" size="sm" @click="openEditModal(driver)">Düzenle</RcButton>
                <RcButton variant="ghost" size="sm" class="rc-btn--danger" @click="confirmDeleteDriver(driver)">Sil</RcButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Belgeler Sekmesi -->
      <div v-show="activeTab === 'documents'" class="tab-panel documents-panel">
        <DocumentsSection
          reference-type="CUSTOMER"
          :reference-id="customer.id"
          title="Belgeler"
        />
      </div>
      </div>

      <CustomerEditModal
        :open="showCustomerEditModal"
        :customer-id="customer.id"
        @close="showCustomerEditModal = false"
        @saved="onCustomerSaved"
      />

      <BirthDateCorrectionModal
        :open="showBirthDateModal"
        :customer="customer"
        @close="showBirthDateModal = false"
        @updated="onBirthDateUpdated"
      />

      <CustomerDriverEditModal
        :open="showDriverEditModal"
        :driver="editingDriver"
        :license-class-options="licenseClassOptions"
        :saving="updatingDriver"
        @close="closeEditModal"
        @save="updateDriver"
      />
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

    <div v-if="showArchiveModal && customer" class="modal-overlay" @click.self="showArchiveModal = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>Listeden kaldır</h3>
          <button class="close-btn" type="button" @click="showArchiveModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            <strong>{{ customer.displayName }}</strong> adlı müşteri listede gösterilmeyecek; kayıt sistemde arşivlenir (soft delete).
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" type="button" @click="showArchiveModal = false">Vazgeç</button>
          <button class="btn btn-danger" type="button" :disabled="archivingCustomer" @click="confirmArchiveCustomer">Evet, kaldır</button>
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

.btn-archive-customer {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.btn-archive-customer:hover {
  background: var(--color-danger-light, rgba(220, 38, 38, 0.1));
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






