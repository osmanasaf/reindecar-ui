<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { rentalsApi, vehiclesApi, customersApi, branchesApi, kmPackagesApi } from '@/api'
import { useToast } from '@/composables'
import type { Rental, RentalStatus, RentalType, Vehicle, Customer, Branch, RentalDriver, KmPackage } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const rental = ref<Rental | null>(null)
const vehicle = ref<Vehicle | null>(null)
const customer = ref<Customer | null>(null)
const branch = ref<Branch | null>(null)
const returnBranch = ref<Branch | null>(null)

const kmPackage = ref<KmPackage | null>(null)
const drivers = ref<RentalDriver[]>([])
const loading = ref(true)
const generatingPdf = ref(false)
const showDriverModal = ref(false)
const newDriverId = ref<number | null>(null)

const rentalId = computed(() => Number(route.params.id))

const statusConfig: Record<RentalStatus, { label: string; color: string; icon: string }> = {
  DRAFT: { label: 'Taslak', color: 'secondary', icon: '📝' },
  RESERVED: { label: 'Rezerve', color: 'info', icon: '📅' },
  ACTIVE: { label: 'Aktif', color: 'success', icon: '🚗' },
  RETURN_PENDING: { label: 'İade Bekliyor', color: 'warning', icon: '🔄' },
  CLOSED: { label: 'Tamamlandı', color: 'muted', icon: '✅' },
  CANCELLED: { label: 'İptal', color: 'danger', icon: '❌' },
  OVERDUE: { label: 'Gecikmiş', color: 'danger', icon: '⚠️' }
}

const typeConfig: Record<RentalType, { label: string; icon: string }> = {
  DAILY: { label: 'Günlük Kiralama', icon: '📆' },
  WEEKLY: { label: 'Haftalık Kiralama', icon: '📅' },
  MONTHLY: { label: 'Aylık Kiralama', icon: '🗓️' },
  LEASING: { label: 'Uzun Dönem Leasing', icon: '📋' }
}

const currentStatus = computed(() => {
  if (!rental.value) return statusConfig.DRAFT
  return statusConfig[rental.value.status] || statusConfig.DRAFT
})

const currentType = computed(() => {
  if (!rental.value) return typeConfig.DAILY
  return typeConfig[rental.value.rentalType] || typeConfig.DAILY
})

const remainingDays = computed(() => {
  if (!rental.value) return 0
  const end = new Date(rental.value.endDate)
  const today = new Date()
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
})

const progressPercentage = computed(() => {
  if (!rental.value) return 0
  const start = new Date(rental.value.startDate)
  const end = new Date(rental.value.endDate)
  const today = new Date()
  const total = end.getTime() - start.getTime()
  const elapsed = today.getTime() - start.getTime()
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
})

const unitPriceLabel = computed(() => {
  if (!rental.value) return 'Günlük Fiyat'
  switch (rental.value.rentalType) {
    case 'MONTHLY':
    case 'LEASING':
      return 'Aylık Fiyat'
    case 'WEEKLY':
      return 'Haftalık Fiyat'
    default:
      return 'Günlük Fiyat'
  }
})

const durationLabel = computed(() => {
  if (!rental.value) return ''
  const days = rental.value.totalDays
  switch (rental.value.rentalType) {
    case 'MONTHLY':
    case 'LEASING': {
      const months = Math.floor(days / 30)
      const remainingDays = days % 30
      if (remainingDays > 0) return `${months} Ay ${remainingDays} Gün`
      return `${months} Ay`
    }
    case 'WEEKLY': {
      const weeks = Math.floor(days / 7)
      const remainingDays = days % 7
      if (remainingDays > 0) return `${weeks} Hafta ${remainingDays} Gün`
      return `${weeks} Hafta`
    }
    default:
      return `${days} Gün`
  }
})

async function fetchRental() {
  loading.value = true
  try {
    rental.value = await rentalsApi.getById(rentalId.value)
    await Promise.all([fetchRelatedData(), fetchDrivers()])
  } catch {
    toast.error('Kiralama bilgileri yüklenemedi')
    router.push('/rentals')
  } finally {
    loading.value = false
  }
}

async function fetchRelatedData() {
  if (!rental.value) return

  const promises: Promise<void>[] = []

  if (rental.value.vehicleId && !rental.value.vehicle) {
    promises.push(
      vehiclesApi.getById(rental.value.vehicleId)
        .then(v => { vehicle.value = v })
        .catch(() => { vehicle.value = null })
    )
  } else if (rental.value.vehicle) {
    vehicle.value = rental.value.vehicle
  }

  if (rental.value.customerId && !rental.value.customer) {
    promises.push(
      customersApi.getById(rental.value.customerId)
        .then(c => { customer.value = c })
        .catch(() => { customer.value = null })
    )
  } else if (rental.value.customer) {
    customer.value = rental.value.customer
  }

  if (rental.value.branchId && !rental.value.branch) {
    promises.push(
      branchesApi.getById(rental.value.branchId)
        .then(b => { branch.value = b })
        .catch(() => { branch.value = null })
    )
  } else if (rental.value.branch) {
    branch.value = rental.value.branch
  }

  if (rental.value.returnBranchId && !rental.value.returnBranch) {
    promises.push(
      branchesApi.getById(rental.value.returnBranchId)
        .then(b => { returnBranch.value = b })
        .catch(() => { returnBranch.value = null })
    )
  } else if (rental.value.returnBranch) {
    returnBranch.value = rental.value.returnBranch
  }

  if (rental.value.kmPackageId) {
    promises.push(
      kmPackagesApi.getById(rental.value.kmPackageId)
        .then(p => { kmPackage.value = p })
        .catch(() => { kmPackage.value = null })
    )
  }

  await Promise.all(promises)
}

async function fetchDrivers() {
  if (!rental.value) return
  try {
    drivers.value = await rentalsApi.getDrivers(rental.value.id)
  } catch {
    drivers.value = []
  }
}

async function addDriver() {
  if (!rental.value || !newDriverId.value) return
  try {
    await rentalsApi.addDriver(rental.value.id, { driverId: newDriverId.value, primary: drivers.value.length === 0 })
    toast.success('Sürücü eklendi')
    showDriverModal.value = false
    newDriverId.value = null
    fetchDrivers()
  } catch (err) {
    toast.apiError(err, 'Sürücü eklenemedi')
  }
}

async function removeDriver(driverId: number) {
  if (!rental.value) return
  if (!confirm('Sürücüyü kaldırmak istediğinizden emin misiniz?')) return
  try {
    await rentalsApi.removeDriver(rental.value.id, driverId)
    toast.success('Sürücü kaldırıldı')
    fetchDrivers()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function setPrimaryDriver(driverId: number) {
  if (!rental.value) return
  try {
    await rentalsApi.setPrimaryDriver(rental.value.id, driverId)
    toast.success('Ana sürücü güncellendi')
    fetchDrivers()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function handleReserve() {
  if (!rental.value) return
  try {
    await rentalsApi.reserve(rental.value.id)
    toast.success('Kiralama rezerve edildi')
    fetchRental()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function handleActivate() {
  if (!rental.value) return
  const startKm = prompt('Başlangıç KM değerini girin:', String(vehicle.value?.currentKm || 0))
  if (startKm === null) return
  try {
    await rentalsApi.activate(rental.value.id, { startKm: Number(startKm) })
    toast.success('Araç teslim edildi')
    fetchRental()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function handleStartReturn() {
  if (!rental.value) return
  try {
    await rentalsApi.startReturn(rental.value.id)
    toast.success('İade süreci başlatıldı')
    fetchRental()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function handleComplete() {
  if (!rental.value) return
  const endKm = prompt('Bitiş KM değerini girin:', String(rental.value.startKm || 0))
  if (endKm === null) return
  const today = new Date()
  const returnDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  try {
    await rentalsApi.complete(rental.value.id, { 
      actualReturnDate: returnDate,
      endKm: Number(endKm)
    })
    toast.success('Kiralama tamamlandı')
    fetchRental()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function handleCancel() {
  if (!rental.value) return
  if (!confirm('Kiralamayı iptal etmek istediğinizden emin misiniz?')) return
  try {
    await rentalsApi.cancel(rental.value.id)
    toast.success('Kiralama iptal edildi')
    fetchRental()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function generatePdf() {
  if (!rental.value) return
  generatingPdf.value = true
  
  try {
    const content = buildPdfContent()
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
    
    toast.success('PDF hazırlandı')
  } catch (err) {
    toast.apiError(err, 'PDF oluşturulamadı')
  } finally {
    generatingPdf.value = false
  }
}

function buildPdfContent(): string {
  if (!rental.value) return ''
  
  const r = rental.value
  const statusLabel = statusConfig[r.status]?.label || r.status
  const typeLabel = typeConfig[r.rentalType]?.label || r.rentalType
  
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Kiralama Sözleşmesi - ${r.rentalNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a56db; padding-bottom: 20px; }
    .header h1 { font-size: 24px; color: #1a56db; margin-bottom: 5px; }
    .header p { color: #666; }
    .contract-number { font-size: 14px; font-weight: bold; background: #f0f4ff; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-top: 10px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: 600; color: #1a56db; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 10px; color: #666; text-transform: uppercase; }
    .info-value { font-size: 13px; font-weight: 500; }
    .price-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .price-table th, .price-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .price-table th { background: #f9fafb; font-weight: 600; }
    .price-table .total { font-size: 16px; font-weight: bold; color: #1a56db; background: #f0f4ff; }
    .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 50px; }
    .signature-box { border-top: 1px solid #333; padding-top: 10px; text-align: center; }
    .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>ARAÇ KİRALAMA SÖZLEŞMESİ</h1>
    <p>ReindeCar Araç Kiralama</p>
    <div class="contract-number">${r.rentalNumber}</div>
  </div>

  <div class="section">
    <div class="section-title">Kiralama Bilgileri</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Kiralama Tipi</span>
        <span class="info-value">${typeLabel}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Durum</span>
        <span class="info-value">${statusLabel}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Başlangıç Tarihi</span>
        <span class="info-value">${formatDate(r.startDate)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Bitiş Tarihi</span>
        <span class="info-value">${formatDate(r.endDate)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Toplam Süre</span>
        <span class="info-value">${r.totalDays} Gün</span>
      </div>
      <div class="info-item">
        <span class="info-label">Oluşturulma</span>
        <span class="info-value">${formatDateTime(r.createdAt)}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Müşteri Bilgileri</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Müşteri Adı</span>
        <span class="info-value">${customer.value?.displayName || '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Telefon</span>
        <span class="info-value">${customer.value?.phone || '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">E-posta</span>
        <span class="info-value">${customer.value?.email || '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Adres</span>
        <span class="info-value">${customer.value?.address || '-'}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Araç Bilgileri</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Plaka</span>
        <span class="info-value">${vehicle.value?.plateNumber || '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Marka / Model</span>
        <span class="info-value">${vehicle.value ? `${vehicle.value.brand} ${vehicle.value.model}` : '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Başlangıç KM</span>
        <span class="info-value">${r.startKm ? formatKm(r.startKm) : '-'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Bitiş KM</span>
        <span class="info-value">${r.endKm ? formatKm(r.endKm) : '-'}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Ücretlendirme</div>
    <table class="price-table">
      <tr>
        <th>Açıklama</th>
        <th style="text-align: right;">Tutar</th>
      </tr>
      <tr>
        <td>Günlük Birim Fiyat</td>
        <td style="text-align: right;">${formatCurrency(r.dailyPrice)}</td>
      </tr>
      <tr>
        <td>Ara Toplam (${r.totalDays} gün)</td>
        <td style="text-align: right;">${formatCurrency(r.totalPrice)}</td>
      </tr>
      ${r.discountAmount > 0 ? `<tr><td>İndirim</td><td style="text-align: right; color: green;">-${formatCurrency(r.discountAmount)}</td></tr>` : ''}
      ${r.extraKmCharge > 0 ? `<tr><td>Ekstra KM Ücreti</td><td style="text-align: right;">${formatCurrency(r.extraKmCharge)}</td></tr>` : ''}
      <tr class="total">
        <td>Genel Toplam</td>
        <td style="text-align: right;">${formatCurrency(r.grandTotal)}</td>
      </tr>
    </table>
  </div>

  ${r.notes ? `
  <div class="section">
    <div class="section-title">Notlar</div>
    <p>${r.notes}</p>
  </div>
  ` : ''}

  <div class="signatures">
    <div class="signature-box">
      <p><strong>Kiralayan</strong></p>
      <p>ReindeCar Araç Kiralama</p>
    </div>
    <div class="signature-box">
      <p><strong>Kiracı</strong></p>
      <p>${customer.value?.displayName || '-'}</p>
    </div>
  </div>

  <div class="footer">
    <p>Bu belge ${formatDateTime(new Date().toISOString())} tarihinde oluşturulmuştur.</p>
  </div>
</body>
</html>
  `
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

onMounted(fetchRental)
</script>

<template>
  <div class="rental-detail">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Yükleniyor...</span>
    </div>

    <template v-else-if="rental">
      <header class="page-header">
        <div class="header-top">
          <button class="back-btn" @click="router.back()">
            <span class="icon">←</span>
            <span>Geri</span>
          </button>
          <div class="header-actions">
            <button class="btn btn-outline" :disabled="generatingPdf" @click="generatePdf">
              <span v-if="generatingPdf" class="spinner-sm"></span>
              <span v-else>📄</span>
              PDF İndir
            </button>
            <button 
              v-if="rental.status === 'DRAFT'" 
              class="btn btn-info"
              @click="handleReserve"
            >
              📅 Rezerve Et
            </button>
            <button 
              v-if="rental.status === 'RESERVED'" 
              class="btn btn-success"
              @click="handleActivate"
            >
              🚗 Teslim Et
            </button>
            <button 
              v-if="rental.status === 'ACTIVE'" 
              class="btn btn-warning"
              @click="handleStartReturn"
            >
              🔄 İade Başlat
            </button>
            <button 
              v-if="rental.status === 'RETURN_PENDING'" 
              class="btn btn-primary"
              @click="handleComplete"
            >
              ✓ Tamamla
            </button>
            <button 
              v-if="rental.status !== 'CLOSED' && rental.status !== 'CANCELLED'"
              class="btn btn-danger-outline"
              @click="handleCancel"
            >
              İptal Et
            </button>
          </div>
        </div>

        <div class="header-main">
          <div class="title-section">
            <span class="rental-number">{{ rental.rentalNumber }}</span>
            <div class="title-row">
              <h1>Kiralama Detayı</h1>
              <span :class="['status-badge', currentStatus.color]">
                {{ currentStatus.icon }} {{ currentStatus.label }}
              </span>
            </div>
            <div class="type-badge">
              {{ currentType.icon }} {{ currentType.label }}
            </div>
          </div>

          <div v-if="rental.status === 'ACTIVE'" class="progress-section">
            <div class="progress-info">
              <span>Kalan Süre</span>
              <strong>{{ remainingDays }} gün</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            </div>
          </div>
        </div>
      </header>

      <div class="content-grid">
        <section class="main-content">
          <div class="card">
            <h3>Araç Bilgileri</h3>
            <div class="vehicle-info">
              <div class="vehicle-avatar">
                {{ vehicle?.brand?.charAt(0) || 'A' }}
              </div>
              <div class="vehicle-details">
                <RouterLink v-if="rental.vehicleId" :to="`/vehicles/${rental.vehicleId}`" class="vehicle-link">
                  <span class="plate">{{ vehicle?.plateNumber || '-' }}</span>
                  <span class="name">{{ vehicle ? `${vehicle.brand} ${vehicle.model}` : '-' }}</span>
                </RouterLink>
                <div v-else class="vehicle-text">
                  <span class="plate">-</span>
                  <span class="name">-</span>
                </div>
                <div v-if="vehicle" class="vehicle-specs">
                  <span>{{ vehicle.year }}</span>
                  <span>{{ vehicle.color }}</span>
                  <span>{{ vehicle.categoryName }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3>Müşteri Bilgileri</h3>
            <div class="customer-info">
              <div class="customer-avatar">
                {{ customer?.displayName?.charAt(0) || 'M' }}
              </div>
              <div class="customer-details">
                <RouterLink v-if="rental.customerId" :to="`/customers/${rental.customerId}`" class="customer-link">
                  <span class="name">{{ customer?.displayName || '-' }}</span>
                </RouterLink>
                <div v-if="customer" class="customer-contact">
                  <span>{{ customer.phone }}</span>
                  <span>{{ customer.email }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3>Tarih ve Süre</h3>
            <div class="dates-grid">
              <div class="date-item">
                <span class="label">Başlangıç</span>
                <span class="value">{{ formatDate(rental.startDate) }}</span>
              </div>
              <div class="date-item">
                <span class="label">Bitiş</span>
                <span class="value">{{ formatDate(rental.endDate) }}</span>
              </div>
              <div class="date-item highlight">
                <span class="label">Toplam Süre</span>
                <span class="value">{{ durationLabel }}</span>
              </div>
              <div v-if="rental.actualReturnDate" class="date-item">
                <span class="label">Fiili İade</span>
                <span class="value">{{ formatDateTime(rental.actualReturnDate) }}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <h3>Kilometre</h3>
            <div class="km-grid">
              <div class="km-item">
                <span class="label">Başlangıç KM</span>
                <span class="value">{{ rental.startKm ? formatKm(rental.startKm) : '-' }}</span>
              </div>
              <div class="km-item">
                <span class="label">Bitiş KM</span>
                <span class="value">{{ rental.endKm ? formatKm(rental.endKm) : '-' }}</span>
              </div>
              <div v-if="rental.totalKm > 0" class="km-item total">
                <span class="label">Toplam KM</span>
                <span class="value">{{ formatKm(rental.totalKm) }}</span>
              </div>
            </div>

            <!-- KM Package Info -->
            <div v-if="kmPackage || rental.customIncludedKm" class="km-package-info">
                <div class="package-header">
                    <h4>KM Paketi: {{ kmPackage?.name || 'Özel Paket' }}</h4>
                </div>
                <div class="package-details-grid">
                    <div class="detail-item">
                        <span class="label">Dahil Olan</span>
                        <span class="value">{{ formatKm(rental.customIncludedKm || kmPackage?.includedKm || 0) }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Aşım Ücreti</span>
                        <span class="value">{{ formatCurrency(rental.customExtraKmPrice || kmPackage?.extraKmPrice || 0) }} / km</span>
                    </div>
                     <div class="detail-item">
                        <span class="label">Kullanılan</span>
                        <span class="value" :class="{ 'text-danger': (rental.totalKm > (rental.customIncludedKm || kmPackage?.includedKm || 0)) }">
                            {{ formatKm(rental.totalKm) }}
                        </span>
                    </div>
                     <div class="detail-item" v-if="rental.extraKmCharge > 0">
                        <span class="label">Ceza Tutar</span>
                        <span class="value text-danger">{{ formatCurrency(rental.extraKmCharge) }}</span>
                    </div>
                </div>
            </div>
          </div>

          <div class="card">
            <h3>Şube Bilgileri</h3>
            <div class="branch-grid">
              <div class="branch-item">
                <span class="label">Teslim Şubesi</span>
                <span class="value">{{ branch?.name || '-' }}</span>
                <span v-if="branch" class="sub-value">{{ branch.city }} / {{ branch.district }}</span>
              </div>
              <div class="branch-item">
                <span class="label">İade Şubesi</span>
                <span class="value">{{ returnBranch?.name || '-' }}</span>
                <span v-if="returnBranch" class="sub-value">{{ returnBranch.city }} / {{ returnBranch.district }}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>Sürücüler</h3>
              <button 
                v-if="rental.status === 'DRAFT' || rental.status === 'RESERVED'"
                class="btn-sm btn-outline"
                @click="showDriverModal = true"
              >
                + Sürücü Ekle
              </button>
            </div>
            <div v-if="drivers.length === 0" class="empty-drivers">
              <p>Henüz sürücü eklenmemiş</p>
            </div>
            <div v-else class="drivers-list">
              <div v-for="driver in drivers" :key="driver.id" class="driver-item">
                <div class="driver-info">
                  <span class="driver-name">{{ driver.driverName }}</span>
                  <span class="driver-license">{{ driver.licenseNumber }}</span>
                  <span v-if="driver.primary" class="primary-badge">Ana Sürücü</span>
                </div>
                <div v-if="rental.status === 'DRAFT' || rental.status === 'RESERVED'" class="driver-actions">
                  <button 
                    v-if="!driver.primary" 
                    class="btn-icon" 
                    title="Ana sürücü yap"
                    @click="setPrimaryDriver(driver.driverId)"
                  >
                    ★
                  </button>
                  <button class="btn-icon danger" title="Kaldır" @click="removeDriver(driver.driverId)">
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="rental.notes" class="card">
            <h3>Notlar</h3>
            <p class="notes-text">{{ rental.notes }}</p>
          </div>
        </section>

        <aside class="sidebar">
          <div class="card price-card">
            <h3>Ücret Özeti</h3>
            <div class="price-list">
              <div class="price-item">
                <span class="label">{{ unitPriceLabel }}</span>
                <span class="value">{{ formatCurrency(rental.dailyPrice) }}</span>
              </div>
              <div class="price-item">
                <span class="label">Ara Toplam</span>
                <span class="value">{{ formatCurrency(rental.totalPrice) }}</span>
              </div>
              <div v-if="rental.discountAmount > 0" class="price-item discount">
                <span class="label">İndirim</span>
                <span class="value">-{{ formatCurrency(rental.discountAmount) }}</span>
              </div>
              <div v-if="rental.extraKmCharge > 0" class="price-item">
                <span class="label">Ekstra KM</span>
                <span class="value">{{ formatCurrency(rental.extraKmCharge) }}</span>
              </div>
            </div>
            <div class="price-total">
              <span class="label">Genel Toplam</span>
              <span class="value">{{ formatCurrency(rental.grandTotal) }}</span>
            </div>
          </div>

          <div class="card info-card">
            <h3>Kiralama Bilgileri</h3>
            <div class="info-list">
              <div class="info-item">
                <span class="label">Kiralama No</span>
                <span class="value">{{ rental.rentalNumber }}</span>
              </div>
              <div class="info-item">
                <span class="label">Oluşturulma</span>
                <span class="value">{{ formatDateTime(rental.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="label">Para Birimi</span>
                <span class="value">{{ rental.currency }}</span>
              </div>
              <div v-if="rental.isOverdue" class="info-item overdue">
                <span class="label">Gecikme</span>
                <span class="value">{{ rental.overdueDays }} gün</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Teleport to="body">
        <div v-if="showDriverModal" class="modal-overlay" @click.self="showDriverModal = false">
          <div class="modal-content driver-modal">
            <div class="modal-header">
              <h3>Sürücü Ekle</h3>
              <button class="close-btn" @click="showDriverModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Sürücü ID</label>
                <input v-model.number="newDriverId" type="number" placeholder="Müşteri ID girin" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" @click="showDriverModal = false">İptal</button>
              <button class="btn btn-primary" :disabled="!newDriverId" @click="addDriver">Ekle</button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.rental-detail {
    padding-bottom: 40px;
    max-width: 1400px;
    margin: 0 auto;
}

.km-package-info {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid var(--color-border);
}

.package-header h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: var(--color-primary);
}

.package-details-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.detail-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.detail-item .label {
    font-size: 12px;
    color: var(--color-text-secondary);
}

.detail-item .value {
    font-weight: 500;
    font-size: 14px;
}

.text-danger {
    color: #ef4444;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  color: var(--color-text-secondary);
  gap: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.page-header {
  margin-bottom: 32px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.back-btn .icon {
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-outline {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-info { background: var(--color-info); color: white; }
.btn-success { background: var(--color-success); color: white; }
.btn-warning { background: var(--color-warning); color: white; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-danger-outline {
  background: transparent;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
}
.btn-danger-outline:hover {
  background: var(--color-danger);
  color: white;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rental-number {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: monospace;
  background: var(--color-bg-secondary);
  padding: 4px 10px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-row h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  color: var(--color-text);
}

.status-badge {
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-badge.success { background: #dcfce7; color: #166534; }
.status-badge.warning { background: #fef3c7; color: #92400e; }
.status-badge.info { background: #dbeafe; color: #1e40af; }
.status-badge.primary { background: #e0e7ff; color: #3730a3; }
.status-badge.danger { background: #fee2e2; color: #991b1b; }
.status-badge.muted { background: #f3f4f6; color: #6b7280; }
.status-badge.secondary { background: #f3f4f6; color: #4b5563; }

.type-badge {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.progress-section {
  min-width: 200px;
  text-align: right;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.progress-info span {
  color: var(--color-text-secondary);
}

.progress-info strong {
  color: var(--color-text);
}

.progress-bar {
  height: 8px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 4px;
  transition: width 0.3s;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
}

.card h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 20px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.vehicle-info,
.customer-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.vehicle-avatar,
.customer-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  flex-shrink: 0;
}

.vehicle-details,
.customer-details {
  flex: 1;
}

.vehicle-link,
.customer-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.vehicle-link:hover .plate,
.customer-link:hover .name {
  color: var(--color-primary);
}

.plate {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  display: block;
  font-family: monospace;
  transition: color 0.2s;
}

.vehicle-details .name,
.vehicle-text .name {
  font-size: 14px;
  color: var(--color-text-secondary);
  display: block;
  margin-top: 4px;
}

.vehicle-specs {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.vehicle-specs span {
  padding: 4px 8px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
}

.customer-details .name {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  display: block;
  transition: color 0.2s;
}

.customer-contact {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.dates-grid,
.km-grid,
.branch-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.date-item,
.km-item,
.branch-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-item .label,
.km-item .label,
.branch-item .label {
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.date-item .value,
.km-item .value,
.branch-item .value {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text);
}

.branch-item .sub-value {
  font-size: 12px;
  color: var(--color-text-muted);
}

.date-item.highlight .value,
.km-item.total .value {
  color: var(--color-primary);
  font-weight: 600;
}

.notes-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-sm.btn-outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.empty-drivers {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
}

.drivers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.driver-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.driver-name {
  font-weight: 500;
}

.driver-license {
  font-size: 13px;
  color: var(--color-text-muted);
  font-family: monospace;
}

.primary-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--color-primary);
  color: white;
  border-radius: 12px;
}

.driver-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-icon:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-icon.danger:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  margin: 16px;
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
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
}

.modal-body {
  padding: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.price-card {
  background: linear-gradient(135deg, var(--color-primary) 0%, #1e40af 100%);
  color: white;
  border: none;
}

.price-card h3 {
  color: rgba(255, 255, 255, 0.8);
}

.price-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 16px;
}

.price-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-item .label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.price-item .value {
  font-size: 15px;
  font-weight: 500;
}

.price-item.discount .value {
  color: #86efac;
}

.price-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-total .label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.price-total .value {
  font-size: 28px;
  font-weight: 700;
}

.info-card h3 {
  margin-bottom: 16px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item .label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.info-item .value {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.info-item.overdue .value {
  color: var(--color-danger);
  font-weight: 600;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    order: -1;
  }
}

@media (max-width: 640px) {
  .header-main {
    flex-direction: column;
  }
  
  .progress-section {
    width: 100%;
    text-align: left;
  }
  
  .title-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .title-row h1 {
    font-size: 24px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .dates-grid,
  .km-grid,
  .branch-grid {
    grid-template-columns: 1fr;
  }
}
</style>
