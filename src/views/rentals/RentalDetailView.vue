<script setup lang="ts">
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { rentalsApi } from '@/api'
import { useToast } from '@/composables'
import ReturnCompleteModal from '@/components/rentals/ReturnCompleteModal.vue'
import RentalReserveModal from '@/components/rentals/RentalReserveModal.vue'
import RentalActivateModal from '@/components/rentals/RentalActivateModal.vue'
import RentalCancelModal from '@/components/rentals/RentalCancelModal.vue'
import RentalPaymentModal from '@/components/rentals/RentalPaymentModal.vue'
import RentalAddDriverModal from '@/components/rentals/RentalAddDriverModal.vue'
import RentalExtendModal from '@/components/rentals/RentalExtendModal.vue'
import RentalCloseConfirmModal from '@/components/rentals/RentalCloseConfirmModal.vue'
import RentalEditModal from '@/components/rentals/RentalEditModal.vue'
import RentalStatusRail from '@/components/rentals/RentalStatusRail.vue'
import RentalActionBar from '@/components/rentals/RentalActionBar.vue'
import type { RentalActionKind } from '@/components/rentals/RentalActionBar.vue'
import CreateDamageForm from '@/components/vehicles/CreateDamageForm.vue'
import DamageDetailModal from '@/components/vehicles/DamageDetailModal.vue'
import CreatePenaltyModal from '@/components/penalties/CreatePenaltyModal.vue'
import CreateTollModal from '@/components/tolls/CreateTollModal.vue'
import { RcIcon } from '@/components/icons'
import {
  RcButton,
  RcBadge,
  RcSegTab,
  RcStatusPill,
  RcEmpty,
  resolvePaymentMethod,
  RcDetailSkeleton,
  RcSkeletonText,
} from '@/components/rc'
import { PaymentStatus } from '@/types/enums'
import { fmtTRY } from '@/utils/format'
import type { Rental, RentalType, Vehicle, Customer, Branch, RentalDriver, KmPackage, Payment, PenaltyResponse, DamageReport, TollRecord, DamageHistoryItem, RentalExtraItem } from '@/types'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'

type TabKey = 'overview' | 'vehicle' | 'drivers' | 'km' | 'damages' | 'penalties' | 'payments' | 'docs' | 'timeline'

const VALID_TABS = new Set<TabKey>([
  'overview', 'vehicle', 'drivers', 'km', 'damages', 'penalties', 'payments', 'docs', 'timeline',
])

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
const generatingOfferPdf = ref(false)
const payments = ref<Payment[]>([])
const paymentSummary = ref<{ totalPaid: number; totalRemaining: number; currency: string } | null>(null)
const showReturnModal = ref(false)
const showReserveModal = ref(false)
const showActivateModal = ref(false)
const showCancelModal = ref(false)
const showPaymentModal = ref(false)
const showAddDriverModal = ref(false)
const showExtendModal = ref(false)
const showEditModal = ref(false)

const penalties = ref<PenaltyResponse[]>([])
const damages = ref<DamageReport[]>([])
const tolls = ref<TollRecord[]>([])
const loadingPenalties = ref(false)
const loadingDamages = ref(false)
const loadingTolls = ref(false)
const showCreateDamageForm = ref(false)
const selectedDamage = ref<DamageReport | null>(null)
const showCreatePenaltyModal = ref(false)
const showCreateTollModal = ref(false)

const rentalExtraItems = ref<RentalExtraItem[]>([])

const rentalId = computed(() => Number(route.params.id))
const showCloseConfirmModal = ref(false)

function getTabFromQuery(): TabKey {
  const raw = route.query.tab as string
  return VALID_TABS.has(raw as TabKey) ? (raw as TabKey) : 'overview'
}

const activeTab = ref<TabKey>(getTabFromQuery())

function setTab(tab: TabKey) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } })
}

watch(
  () => route.query.tab,
  (newTab) => {
    const t = VALID_TABS.has(newTab as TabKey) ? (newTab as TabKey) : 'overview'
    if (t !== activeTab.value) activeTab.value = t
  },
)

const detailTabs = computed(() => [
  { id: 'overview' as TabKey, label: 'Özet' },
  { id: 'vehicle' as TabKey, label: 'Araç' },
  { id: 'drivers' as TabKey, label: 'Sürücüler', count: drivers.value.length || undefined },
  { id: 'km' as TabKey, label: 'KM & Yakıt' },
  { id: 'damages' as TabKey, label: 'Hasarlar', count: damages.value.length || undefined },
  {
    id: 'penalties' as TabKey,
    label: 'Ceza & HGS',
    count: (penalties.value.length + tolls.value.length) || undefined,
  },
  { id: 'payments' as TabKey, label: 'Ödemeler', count: payments.value.length || undefined },
  { id: 'docs' as TabKey, label: 'Belgeler' },
  { id: 'timeline' as TabKey, label: 'Geçmiş' },
])

const pageTitle = computed(() => {
  if (!rental.value) return ''
  const customerLabel = customer.value?.displayName || rental.value.customerName || '—'
  const plate = vehicle.value?.plateNumber || rental.value.vehiclePlate || '—'
  return `${customerLabel} · ${plate}`
})

const modalCustomerName = computed(
  () => customer.value?.displayName || rental.value?.customerName || '',
)

const modalVehicleLabel = computed(() => {
  if (!vehicle.value && !rental.value) return ''
  const v = vehicle.value
  if (v?.brand || v?.model) {
    return [v.brand, v.model].filter(Boolean).join(' ')
  }
  return rental.value?.vehicleName || ''
})

const typeLabels: Record<RentalType, string> = {
  DAILY: 'Günlük',
  WEEKLY: 'Haftalık',
  MONTHLY: 'Aylık',
  LEASING: 'Leasing',
}

function handleAction(kind: RentalActionKind) {
  switch (kind) {
    case 'edit':
      showEditModal.value = true
      break
    case 'reserve':
      handleReserve()
      break
    case 'activate':
      handleActivate()
      break
    case 'return':
      handleStartReturn()
      break
    case 'cancel':
      handleCancel()
      break
    case 'payment':
      openPaymentModal()
      break
    case 'damage':
      showCreateDamageForm.value = true
      break
    case 'penalty':
      showCreatePenaltyModal.value = true
      break
    case 'toll':
      showCreateTollModal.value = true
      break
    case 'extend':
      showExtendModal.value = true
      break
    case 'pdf':
      generatePdf()
      break
    case 'offer-pdf':
      generateOfferPdf()
      break
    case 'close':
      handleCloseRental()
      break
    case 'driver':
      showAddDriverModal.value = true
      break
  }
}

const timelineEvents = computed(() => {
  if (!rental.value) return []
  const r = rental.value
  const events: { label: string; at: string; tone?: string }[] = [
    { label: 'Kiralama oluşturuldu', at: formatDateTime(r.createdAt) },
    { label: 'Planlanan başlangıç', at: formatDate(r.startDate) },
    { label: 'Planlanan bitiş', at: formatDate(r.endDate) },
  ]
  if (r.actualReturnDate) {
    events.push({ label: 'Fiili iade', at: formatDateTime(r.actualReturnDate), tone: 'success' })
  }
  if (r.isOverdue) {
    events.push({ label: 'Gecikme', at: `${r.overdueDays} gün`, tone: 'warn' })
  }
  return events
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

const totalPaid = computed(() => {
  if (paymentSummary.value?.totalPaid != null) {
    return Number(paymentSummary.value.totalPaid)
  }
  return payments.value
    .filter(p => p.status === PaymentStatus.COMPLETED)
    .reduce((sum, p) => sum + p.amount, 0)
})

/** Alacak kayıtları üzerinden tahsil edilebilir toplam (ödenen + kalan) */
const totalCollectible = computed(() => {
  if (
    paymentSummary.value?.totalPaid != null
    && paymentSummary.value?.totalRemaining != null
  ) {
    return Number(paymentSummary.value.totalPaid) + Number(paymentSummary.value.totalRemaining)
  }
  return grandTotal.value
})

const penaltyTotalAmount = computed(() => {
  const unpaidStatuses = new Set(['PENDING', 'NOTIFIED', 'DISPUTED', 'PAID_BY_COMPANY'])
  return penalties.value
    .filter(p => unpaidStatuses.has(String(p.status)))
    .reduce((sum, p) => sum + (p.penaltyAmount ?? 0), 0)
})

const damageTotalAmount = computed(() => {
  return damages.value
    .filter(d => d.customerResponsible === true)
    .reduce((sum, d) => {
      const cost = d.repaired && d.repairCostAmount != null ? d.repairCostAmount : (d.estimatedCostAmount ?? 0)
      return sum + cost
    }, 0)
})

const tollTotalAmount = computed(() => {
  const unpaidStatuses = new Set(['PENDING', 'CHARGED_TO_CUSTOMER'])
  return tolls.value
    .filter(t => unpaidStatuses.has(String(t.status)))
    .reduce((sum, t) => sum + (t.tollAmount ?? 0), 0)
})

const grandTotal = computed(() => {
  if (!rental.value) return 0
  const total = rental.value.totalPrice || 0
  const extraKm = rental.value.extraKmCharge || 0
  const discount = rental.value.discountAmount || 0
  return total + extraItemsTotalDisplay.value + extraKm - discount + penaltyTotalAmount.value + damageTotalAmount.value + tollTotalAmount.value
})

function getExtraItemTotal(item: RentalExtraItem): number {
  if (item.calculatedTotal != null) return Number(item.calculatedTotal)
  const r = rental.value
  if (!r) return item.amount ?? 0
  switch (item.calculationType) {
    case 'PER_MONTH': {
      const months = Math.ceil((r.totalDays || 0) / 30) || 1
      return (item.amount ?? 0) * months
    }
    case 'FIXED':
    case 'PERCENTAGE':
    default:
      return item.amount ?? 0
  }
}

const safeRentalExtraItems = computed(() => rentalExtraItems.value ?? [])

const extraItemsTotalDisplay = computed(() =>
  safeRentalExtraItems.value.reduce((sum, item) => sum + getExtraItemTotal(item), 0)
)

const remainingAmount = computed(() => {
  if (paymentSummary.value?.totalRemaining != null) {
    return Math.max(0, Number(paymentSummary.value.totalRemaining))
  }
  return 0
})

async function refreshPaymentSummary() {
  if (!rental.value) return
  try {
    paymentSummary.value = await rentalsApi.getPaymentSummary(rental.value.id)
  } catch {
    toast.error('Ödeme özeti güncellenemedi')
  }
}

async function openPaymentModal() {
  await refreshPaymentSummary()
  if (remainingAmount.value <= 0) {
    toast.info('Tahsil edilecek açık alacak bulunmuyor')
    return
  }
  showPaymentModal.value = true
}

const paymentStatus = computed(() => {
  if (totalPaid.value === 0) return 'Ödenmedi'
  if (remainingAmount.value === 0) return 'Tamamlandı'
  return 'Kısmen Ödendi'
})

const showPenaltiesAndDamages = computed(() => {
  const s = rental.value?.status
  return s === 'ACTIVE' || s === 'OVERDUE' || s === 'RETURN_PENDING' || s === 'CLOSED' || s === 'PENDING_PAYMENT'
})

const isPendingPayment = computed(() => rental.value?.status === 'PENDING_PAYMENT')
const canCloseRental = computed(() => isPendingPayment.value && remainingAmount.value === 0)

const existingDriverIds = computed(() => drivers.value.map((d) => d.driverId))

async function fetchRental() {
  loading.value = true
  try {
    const detail = await rentalsApi.getDetail(rentalId.value)
    rental.value = detail.rental
    vehicle.value = detail.vehicle ?? null
    customer.value = detail.customer ?? null
    branch.value = detail.branch ?? null
    returnBranch.value = detail.returnBranch ?? null
    kmPackage.value = detail.kmPackage ?? null
    drivers.value = detail.drivers ?? []
    paymentSummary.value = detail.paymentSummary ?? null
    payments.value = detail.payments ?? []
    rentalExtraItems.value = detail.extraItems ?? []
    penalties.value = detail.penalties ?? []
    damages.value = detail.damages ?? []
    tolls.value = detail.tolls ?? []
  } catch {
    toast.error('Kiralama bilgileri yüklenemedi')
    router.push('/rentals')
  } finally {
    loading.value = false
  }
}

function damageForModal(d: DamageReport | null): DamageHistoryItem | null {
  if (!d) return null
  return {
    id: d.id,
    reportDate: d.reportDate,
    damageType: d.damageType,
    location: d.location,
    severity: d.severity,
    repaired: d.repaired,
    repairedDate: d.repairedDate
  }
}

function handleDamageCreated() {
  showCreateDamageForm.value = false
  fetchRental()
}

function handlePenaltyCreated() {
  showCreatePenaltyModal.value = false
  fetchRental().catch(err => {
    toast.apiError(err, 'Ceza listesi yenilenemedi')
  })
}

function handleTollCreated() {
  showCreateTollModal.value = false
  fetchRental()
}

async function removeDriver(driverId: number) {
  if (!rental.value) return
  if (!confirm('Sürücüyü kaldırmak istediğinizden emin misiniz?')) return
  try {
    await rentalsApi.removeDriver(rental.value.id, driverId)
    toast.success('Sürücü kaldırıldı')
    fetchRental()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function setPrimaryDriver(driverId: number) {
  if (!rental.value) return
  try {
    await rentalsApi.setPrimaryDriver(rental.value.id, driverId)
    toast.success('Ana sürücü güncellendi')
    fetchRental()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function handleReserve() {
  showReserveModal.value = true
}

async function handleActivate() {
  showActivateModal.value = true
}

function handleStartReturn() {
  if (!rental.value) return
  showReturnModal.value = true
}

function handleReturnCompleted(updatedRental: Rental) {
  rental.value = updatedRental
  showReturnModal.value = false
  fetchRental()
}

async function handleCancel() {
  showCancelModal.value = true
}

function handleRentalUpdated(updated: Rental) {
  rental.value = updated
  fetchRental()
}

function handlePaymentRecorded() {
  fetchRental()
  setTab('payments')
}

async function handleCloseRental() {
  if (!rental.value) return
  showCloseConfirmModal.value = true
}

function handleRentalClosed(updated: Rental) {
  rental.value = updated
  fetchRental()
}

async function generatePdf() {
  if (!rental.value) return
  generatingPdf.value = true

  try {
    const blob = await rentalsApi.downloadCompletionPdf(rental.value.id)
    downloadBlob(blob, `kiralama-teslim-tutanagi-${rental.value.rentalNumber}.pdf`)
    toast.success('Teslim tutanağı PDF indirildi')
  } catch (err) {
    toast.apiError(err, 'PDF oluşturulamadı')
  } finally {
    generatingPdf.value = false
  }
}

async function generateOfferPdf() {
  if (!rental.value) return
  generatingOfferPdf.value = true

  try {
    const blob = await rentalsApi.downloadOfferPdf(rental.value.id)
    downloadBlob(blob, `kiralama-teklif-${rental.value.rentalNumber}.pdf`)
    toast.success('Kiralama teklif PDF indirildi')
  } catch (err) {
    toast.apiError(err, 'Teklif PDF oluşturulamadı')
  } finally {
    generatingOfferPdf.value = false
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
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

const lastFetchedRentalId = ref<number | null>(null)
onMounted(async () => {
  activeTab.value = getTabFromQuery()
  await fetchRental()
  lastFetchedRentalId.value = rentalId.value
})

onActivated(() => {
  if (lastFetchedRentalId.value !== rentalId.value) {
    fetchRental().then(() => { lastFetchedRentalId.value = rentalId.value })
  }
})
</script>

<template>
  <div class="rc-page rcr-detail">
    <RcDetailSkeleton v-if="loading" :sections="3" />

    <template v-else-if="rental">
      <div class="rc-cust-detail-nav">
        <RouterLink to="/rentals" class="rc-btn rc-btn--ghost rc-btn--sm">
          <RcIcon name="chevronLeft" :size="14" />
          Kiralamalar
        </RouterLink>
      </div>

      <div class="rcr-detail__head">
        <div>
          <div class="rcr-detail__badges">
            <span class="rcr-detail__no">{{ rental.rentalNumber }}</span>
            <RcBadge>{{ typeLabels[rental.rentalType] || rental.rentalType }}</RcBadge>
            <RcStatusPill :status="rental.status" />
          </div>
          <h1 class="rcr-detail__title">{{ pageTitle }}</h1>
          <p class="rcr-detail__sub">
            {{ formatDate(rental.startDate) }} → {{ formatDate(rental.endDate) }}
            · {{ durationLabel }}
            <span v-if="branch?.name"> · {{ branch.name }}</span>
            <span v-if="returnBranch?.name && returnBranch.name !== branch?.name"> → {{ returnBranch.name }}</span>
          </p>
        </div>
        <div class="rcr-detail__head-actions">
          <RcButton
            v-if="['RETURN_PENDING', 'PENDING_PAYMENT', 'CLOSED'].includes(rental.status)"
            variant="ghost"
            size="sm"
            :disabled="generatingPdf"
            @click="generatePdf"
          >
            <RcIcon name="receipt" :size="14" />
            Teslim tutanağı
          </RcButton>
          <RcButton
            v-if="['DRAFT', 'RESERVED'].includes(rental.status)"
            variant="ghost"
            size="sm"
            :disabled="generatingOfferPdf"
            @click="generateOfferPdf"
          >
            <RcIcon name="download" :size="14" />
            Teklif PDF
          </RcButton>
        </div>
      </div>

      <RentalStatusRail :status="rental.status" />

      <RentalActionBar
        :rental="rental"
        :balance="remainingAmount"
        :can-close="canCloseRental"
        @action="handleAction"
      />

      <div v-if="isPendingPayment" class="rc-alert rc-alert--warning" style="margin-top: 14px">
        <RcIcon name="warning" :size="16" />
        <div>
          <strong>Ödeme bekleniyor</strong>
          <span v-if="remainingAmount > 0"> · Kalan: {{ formatCurrency(remainingAmount) }}</span>
          <span v-else> · Tüm alacaklar ödendi, kapatılabilir.</span>
        </div>
      </div>

      <div
        v-else-if="remainingAmount > 0 && rental.status === 'ACTIVE'"
        class="rc-alert rc-alert--warning"
        style="margin-top: 14px"
      >
        <RcIcon name="warning" :size="16" />
        <div>
          <strong>Kalan ödeme: {{ formatCurrency(remainingAmount) }}</strong>
          <span> · Tahsilat için Ödemeler sekmesini veya aksiyon çubuğunu kullanın.</span>
        </div>
      </div>

      <div class="rcv-stats rcv-stats--airy" style="margin-top: 14px">
        <div class="rcv-stat">
          <div class="rcv-stat__label">Genel toplam</div>
          <div class="rcv-stat__value rc-num">{{ fmtTRY(totalCollectible) }}</div>
          <div class="rcv-stat__sub">{{ safeRentalExtraItems.length }} ek kalem</div>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Ödenen</div>
          <div class="rcv-stat__value rc-num">{{ fmtTRY(totalPaid) }}</div>
          <div class="rcv-stat__sub">{{ paymentStatus }}</div>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Bakiye</div>
          <div class="rcv-stat__value rc-num" :class="{ 'rcv-stat__value--warn': remainingAmount > 0 }">
            {{ fmtTRY(remainingAmount) }}
          </div>
          <div class="rcv-stat__sub">{{ remainingAmount > 0 ? 'tahsil bekliyor' : 'borç yok' }}</div>
        </div>
        <div v-if="rental.status === 'ACTIVE' || rental.status === 'OVERDUE'" class="rcv-stat">
          <div class="rcv-stat__label">Kalan süre</div>
          <div class="rcv-stat__value">{{ remainingDays }} gün</div>
          <div class="rcv-bar" style="margin-top: 8px; width: 100%">
            <div class="rcv-bar__fill" :style="{ width: `${progressPercentage}%` }" />
          </div>
        </div>
      </div>

      <div class="rc-card rcr-tab-card" style="margin-top: 14px">
        <div class="rc-segtabs">
          <RcSegTab
            v-for="tab in detailTabs"
            :id="tab.id"
            :key="tab.id"
            :active="activeTab"
            :count="tab.count"
            @select="setTab($event as TabKey)"
          >
            {{ tab.label }}
          </RcSegTab>
        </div>
      </div>

      <div class="rcr-tab-panel">
        <!-- Özet -->
        <div v-show="activeTab === 'overview'" class="rcr-tab-panel__grid">
          <div class="rc-card rcr-panel-card">
            <h3 class="rcr-panel-card__title">Müşteri</h3>
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

          <div class="rc-card rcr-panel-card">
            <h3 class="rcr-panel-card__title">Tarih ve süre</h3>
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

          <div class="rc-card rcr-panel-card">
            <h3 class="rcr-panel-card__title">Şube bilgileri</h3>
            <div class="branch-grid">
              <div class="branch-item">
                <span class="label">Teslim şubesi</span>
                <span class="value">{{ branch?.name || '—' }}</span>
                <span v-if="branch" class="sub-value">{{ branch.city }} / {{ branch.district }}</span>
              </div>
              <div class="branch-item">
                <span class="label">İade şubesi</span>
                <span class="value">{{ returnBranch?.name || '—' }}</span>
                <span v-if="returnBranch" class="sub-value">{{ returnBranch.city }} / {{ returnBranch.district }}</span>
              </div>
            </div>
          </div>

          <div class="rc-card rcr-panel-card">
            <h3 class="rcr-panel-card__title">Ücret özeti</h3>
            <div class="price-list">
              <div class="price-item">
                <span class="label">{{ unitPriceLabel }}</span>
                <span class="value">{{ formatCurrency(rental.dailyPrice) }}</span>
              </div>
              <div class="price-item">
                <span class="label">Ara toplam</span>
                <span class="value">{{ formatCurrency(rental.totalPrice) }}</span>
              </div>
              <div v-if="safeRentalExtraItems.length > 0" class="price-item">
                <span class="label">Ek kalemler ({{ safeRentalExtraItems.length }})</span>
                <span class="value">{{ formatCurrency(extraItemsTotalDisplay) }}</span>
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
              <span class="label">Genel toplam</span>
              <span class="value">{{ formatCurrency(grandTotal) }}</span>
            </div>
          </div>

          <div v-if="rental.notes" class="rc-card rcr-panel-card rcr-panel-card--full">
            <h3 class="rcr-panel-card__title">Notlar</h3>
            <p class="notes-text">{{ rental.notes }}</p>
          </div>
        </div>

        <!-- Araç -->
        <div v-show="activeTab === 'vehicle'" class="rc-card rcr-panel-card">
          <h3 class="rcr-panel-card__title">Araç bilgileri</h3>
          <div class="vehicle-info">
            <div class="vehicle-avatar">
              {{ vehicle?.brand?.charAt(0) || 'A' }}
            </div>
            <div class="vehicle-details">
              <RouterLink v-if="rental.vehicleId" :to="`/vehicles/${rental.vehicleId}`" class="vehicle-link">
                <span class="plate">{{ vehicle?.plateNumber || '—' }}</span>
                <span class="name">{{ vehicle ? `${vehicle.brand} ${vehicle.model}` : '—' }}</span>
              </RouterLink>
              <div v-else class="vehicle-text">
                <span class="plate">—</span>
                <span class="name">—</span>
              </div>
              <div v-if="vehicle" class="vehicle-specs">
                <span>{{ vehicle.year }}</span>
                <span>{{ vehicle.color }}</span>
                <span>{{ vehicle.categoryName }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- KM -->
        <div v-show="activeTab === 'km'" class="rc-card rcr-panel-card">
          <h3 class="rcr-panel-card__title">Kilometre</h3>
            <div class="km-grid">
              <div class="km-item">
                <span class="label">Başlangıç KM</span>
                <span class="value">
                  <template v-if="['DRAFT', 'RESERVED', 'ACTIVE'].includes(rental.status)">
                    {{ vehicle?.currentKm ? formatKm(vehicle.currentKm) : '-' }}
                    <span v-if="rental.status !== 'ACTIVE'" class="km-hint">(araç mevcut KM)</span>
                  </template>
                  <template v-else>
                    {{ rental.startKm ? formatKm(rental.startKm) : '-' }}
                  </template>
                </span>
              </div>
              <div class="km-item">
                <span class="label">Bitiş KM</span>
                <span class="value">{{ rental.endKm !== undefined && rental.endKm !== null ? formatKm(rental.endKm) : '-' }}</span>
              </div>
              <div v-if="rental.totalKm > 0" class="km-item total">
                <span class="label">Toplam KM</span>
                <span class="value">{{ formatKm(rental.totalKm) }}</span>
              </div>
            </div>

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

        <!-- Sürücüler -->
        <div v-show="activeTab === 'drivers'" class="rc-card rcr-panel-card">
          <div class="rcr-panel-card__head">
            <h3 class="rcr-panel-card__title">Sürücüler</h3>
            <RcButton
              v-if="rental.status === 'DRAFT' || rental.status === 'RESERVED'"
              variant="ghost"
              size="sm"
              @click="showAddDriverModal = true"
            >
              <RcIcon name="plus" :size="14" />
              Sürücü ekle
            </RcButton>
          </div>
          <RcEmpty v-if="drivers.length === 0" title="Sürücü yok" description="Henüz sürücü eklenmemiş" />
          <div v-else class="drivers-list">
            <div v-for="driver in drivers" :key="driver.id" class="driver-item">
              <div class="driver-info">
                <span class="driver-name">{{ driver.driverName }}</span>
                <span class="driver-license">{{ driver.licenseNumber }}</span>
                <RcBadge v-if="driver.primary" variant="accent">Ana sürücü</RcBadge>
              </div>
              <div v-if="rental.status === 'DRAFT' || rental.status === 'RESERVED'" class="driver-actions">
                <RcButton
                  v-if="!driver.primary"
                  variant="ghost"
                  size="sm"
                  title="Ana sürücü yap"
                  @click="setPrimaryDriver(driver.driverId)"
                >
                  ★
                </RcButton>
                <RcButton variant="ghost" size="sm" @click="removeDriver(driver.driverId)">Kaldır</RcButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Hasarlar -->
        <div v-show="activeTab === 'damages'" class="rc-card rcr-panel-card">
          <div class="rcr-panel-card__head">
            <h3 class="rcr-panel-card__title">Hasarlar</h3>
            <RcButton
              v-if="showPenaltiesAndDamages && rental.status !== 'CLOSED' && rental.status !== 'CANCELLED'"
              variant="ghost"
              size="sm"
              @click="showCreateDamageForm = true"
            >
              <RcIcon name="plus" :size="14" />
              Hasar ekle
            </RcButton>
          </div>
          <RcEmpty
            v-if="!showPenaltiesAndDamages"
            title="Hasar kaydı yok"
            description="Bu aşamada hasar kaydı görüntülenmiyor"
          />
          <RcSkeletonText v-else-if="loadingDamages" :lines="2" />
          <RcEmpty v-else-if="damages.length === 0" title="Hasar yok" description="Bu kiralamaya ait hasar kaydı bulunmuyor" />
          <div v-else class="damage-list">
            <div
              v-for="d in damages"
              :key="d.id"
              class="list-row list-row-clickable"
              role="button"
              tabindex="0"
              @click="selectedDamage = d"
              @keydown.enter="selectedDamage = d"
              @keydown.space.prevent="selectedDamage = d"
            >
              <div class="list-row-main">
                <span class="list-row-title">{{ d.description || d.damageTypeDisplayName || d.damageType }}</span>
                <span class="list-row-meta">
                  {{ d.locationDisplayName || d.location }} · {{ d.severityDisplayName || d.severity }} ·
                  {{ d.repaired ? 'Onarıldı' : 'Beklemede' }}
                </span>
              </div>
              <span class="list-row-value">{{
                formatCurrency(d.repaired && d.repairCostAmount != null ? d.repairCostAmount : (d.estimatedCostAmount ?? 0))
              }}</span>
            </div>
          </div>
        </div>

        <!-- Ceza & HGS -->
        <div v-show="activeTab === 'penalties'" class="rcr-tab-panel__stack">
          <div class="rc-card rcr-panel-card">
            <div class="rcr-panel-card__head">
              <h3 class="rcr-panel-card__title">Trafik cezaları</h3>
              <RcButton
                v-if="showPenaltiesAndDamages && rental.status !== 'CANCELLED'"
                variant="ghost"
                size="sm"
                @click="showCreatePenaltyModal = true"
              >
                <RcIcon name="plus" :size="14" />
                Ceza ekle
              </RcButton>
            </div>
            <RcSkeletonText v-if="loadingPenalties" :lines="2" />
            <RcEmpty v-else-if="penalties.length === 0" title="Ceza yok" description="Trafik cezası kaydı bulunmuyor" />
            <div v-else class="penalty-list">
              <div v-for="p in penalties" :key="p.id" class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">{{ p.penaltyNumber }}</span>
                  <span class="list-row-meta">{{ p.violationType }} · {{ p.status }}</span>
                </div>
                <span class="list-row-value">{{ formatCurrency(p.penaltyAmount) }}</span>
              </div>
            </div>
          </div>
          <div class="rc-card rcr-panel-card">
            <div class="rcr-panel-card__head">
              <h3 class="rcr-panel-card__title">HGS / OGS geçişleri</h3>
              <RcButton
                v-if="showPenaltiesAndDamages && rental.status !== 'CLOSED' && rental.status !== 'CANCELLED'"
                variant="ghost"
                size="sm"
                @click="showCreateTollModal = true"
              >
                <RcIcon name="plus" :size="14" />
                Geçiş ekle
              </RcButton>
            </div>
            <RcSkeletonText v-if="loadingTolls" :lines="2" />
            <RcEmpty v-else-if="tolls.length === 0" title="Geçiş yok" description="HGS/OGS kaydı bulunmuyor" />
            <div v-else class="toll-list">
              <div v-for="t in tolls" :key="t.id" class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">{{ t.tollNumber }}</span>
                  <span class="list-row-meta">
                    {{ t.tollTypeDisplayName }} · {{ t.passageLocation || '—' }} · {{ t.status }}
                  </span>
                </div>
                <span class="list-row-value">{{ formatCurrency(t.tollAmount) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ödemeler -->
        <div v-show="activeTab === 'payments'" class="rc-card rcr-panel-card">
          <h3 class="rcr-panel-card__title">Ödeme geçmişi</h3>
          <div class="rcr-payment-summary">
            <div><span>Ödenen</span><strong class="rc-num">{{ formatCurrency(totalPaid) }}</strong></div>
            <div><span>Kalan</span><strong class="rc-num" :class="{ 'text-danger': remainingAmount > 0 }">{{ formatCurrency(remainingAmount) }}</strong></div>
            <div><span>Durum</span><strong>{{ paymentStatus }}</strong></div>
          </div>
          <RcEmpty v-if="payments.length === 0" title="Ödeme kaydı yok" description="Henüz tahsilat yapılmamış" />
          <table v-else class="rc-table rcv-table--slim">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Yöntem</th>
                <th>Durum</th>
                <th class="rc-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in payments" :key="p.id">
                <td>{{ p.paidAt ? formatDateTime(p.paidAt) : formatDateTime(p.createdAt) }}</td>
                <td>{{ resolvePaymentMethod(p.method) }}</td>
                <td><RcStatusPill :status="p.status" /></td>
                <td class="rc-right rc-num">{{ formatCurrency(p.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Belgeler -->
        <div v-show="activeTab === 'docs'" class="rc-card rcr-panel-card">
          <DocumentsSection reference-type="RENTAL" :reference-id="rental.id" title="Kiralama belgeleri" />
        </div>

        <!-- Geçmiş -->
        <div v-show="activeTab === 'timeline'" class="rc-card rcr-panel-card">
          <h3 class="rcr-panel-card__title">Zaman çizelgesi</h3>
          <div class="rcr-timeline">
            <div v-for="(ev, i) in timelineEvents" :key="i" class="rcr-timeline__item">
              <div class="rcr-timeline__dot" />
              <div>
                <div class="rcr-timeline__label">{{ ev.label }}</div>
                <div class="rcr-timeline__at" :class="{ 'rcr-timeline__at--warn': ev.tone === 'warn', 'rcr-timeline__at--success': ev.tone === 'success' }">
                  {{ ev.at }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Teleport to="body">
        <ReturnCompleteModal
          :visible="showReturnModal"
          :rental-id="rentalId"
          @close="showReturnModal = false"
          @completed="handleReturnCompleted"
        />

        <RentalReserveModal
          :open="showReserveModal"
          :rental="rental"
          :customer-name="modalCustomerName"
          :vehicle-label="modalVehicleLabel"
          :branch-label="branch?.name"
          :return-branch-label="returnBranch?.name"
          @close="showReserveModal = false"
          @reserved="handleRentalUpdated"
        />

        <RentalActivateModal
          :open="showActivateModal"
          :rental="rental"
          :vehicle="vehicle"
          :customer-name="modalCustomerName"
          :vehicle-label="modalVehicleLabel"
          :branch-label="branch?.name"
          :return-branch-label="returnBranch?.name"
          @close="showActivateModal = false"
          @activated="handleRentalUpdated"
        />

        <RentalEditModal
          :open="showEditModal"
          :rental="rental"
          :extra-items="rentalExtraItems"
          :vehicle-category-id="vehicle?.categoryId ?? null"
          @close="showEditModal = false"
          @updated="handleRentalUpdated"
        />

        <RentalCancelModal
          :open="showCancelModal"
          :rental="rental"
          @close="showCancelModal = false"
          @cancelled="handleRentalUpdated"
        />

        <RentalCloseConfirmModal
          :open="showCloseConfirmModal"
          :rental="rental"
          :total-paid="totalPaid"
          @close="showCloseConfirmModal = false"
          @closed="handleRentalClosed"
        />

        <RentalPaymentModal
          :open="showPaymentModal"
          :rental="rental"
          :remaining-amount="remainingAmount"
          @close="showPaymentModal = false"
          @recorded="handlePaymentRecorded"
        />

        <RentalAddDriverModal
          :open="showAddDriverModal"
          :rental="rental"
          :existing-driver-ids="existingDriverIds"
          @close="showAddDriverModal = false"
          @added="fetchRental"
        />

        <RentalExtendModal
          :open="showExtendModal"
          :rental="rental"
          @close="showExtendModal = false"
          @extended="handleRentalUpdated"
        />

        <CreateDamageForm
          v-if="showCreateDamageForm && rental"
          :vehicle-id="rental.vehicleId"
          :rental-id="rental.id"
          @close="showCreateDamageForm = false"
          @created="handleDamageCreated"
        />

        <DamageDetailModal
          :damage="damageForModal(selectedDamage)"
          :visible="selectedDamage !== null"
          @close="selectedDamage = null"
        />

        <CreatePenaltyModal
          v-if="rental"
          :show="showCreatePenaltyModal"
          :rental-id="rental.id"
          :vehicle-id="rental.vehicleId"
          :customer-id="rental.customerId"
          @close="showCreatePenaltyModal = false"
          @success="handlePenaltyCreated"
        />

        <CreateTollModal
          v-if="showCreateTollModal && rental"
          :rental-id="rental.id"
          :vehicle-id="rental.vehicleId"
          :customer-id="rental.customerId"
          @close="showCreateTollModal = false"
          @created="handleTollCreated"
        />
      </Teleport>
    </template>

  </div>
</template>