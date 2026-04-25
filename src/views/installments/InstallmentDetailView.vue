<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { installmentsApi, vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleInstallmentResponse, Vehicle } from '@/types'
import { formatCurrency, formatDate, calculateProgress } from '@/utils/installmentHelpers'
import PaymentScheduleTable from '@/components/installments/PaymentScheduleTable.vue'
import InstallmentEarlyClosureModal from '@/components/InstallmentEarlyClosureModal.vue'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loading = ref(false)
const installment = ref<VehicleInstallmentResponse | null>(null)
const vehicle = ref<Vehicle | null>(null)
const showCloseModal = ref(false)

const installmentId = computed(() => Number(route.params.id))
const payments = computed(() => installment.value?.payments ?? [])
const paidCount = computed(() => payments.value.filter(p => p.status === 'PAID').length)
const overdueCount = computed(() => payments.value.filter(p => p.isOverdue).length)
const progress = computed(() => {
  if (!installment.value) return 0
  const total = installment.value.numberOfInstallments ?? 0
  const paid = total > 0 && (installment.value.remainingInstallments === 0 || installment.value.outstandingBalance <= 0)
    ? total
    : paidCount.value
  return calculateProgress(paid, total)
})

const isCompleted = computed(() => {
  if (!installment.value) return false
  const rem = Number(installment.value.remainingInstallments)
  const bal = Number(installment.value.outstandingBalance)
  return rem === 0 || bal <= 0 || !!installment.value.earlyClosedAt
})

const displayPaidCount = computed(() => {
  if (!installment.value) return 0
  const total = installment.value.numberOfInstallments ?? 0
  if (total > 0 && isCompleted.value) return total
  return paidCount.value
})

const remainingDisplay = computed(() => {
  if (!installment.value) return '0 / 0'
  const total = Number(installment.value.numberOfInstallments) || 0
  return `${displayPaidCount.value} / ${total}`
})

function isInvalidOrEpochDate(date: string | number | null | undefined): boolean {
  if (date === null || date === undefined) return true
  if (typeof date === 'string' && (date === '' || date.startsWith('1970-01-01') || date.startsWith('1970'))) return true
  if (typeof date === 'number' && (date === 0 || date < 86400000)) return true // 0 veya 1 günden küçük ms
  const d = new Date(date as string)
  if (Number.isNaN(d.getTime())) return true
  const y = d.getUTCFullYear()
  return y < 1980 || y === 1970
}

const nextPaymentDisplay = computed(() => {
  if (!installment.value) return '—'
  if (isCompleted.value) return 'Tamamlandı'
  const date = installment.value.nextPaymentDueDate
  if (isInvalidOrEpochDate(date ?? undefined)) return '—'
  return new Date(date as string).toLocaleDateString('tr-TR')
})

const progressColor = computed(() => {
  if (progress.value >= 75) return '#22c55e'
  if (progress.value >= 40) return '#3b82f6'
  return '#f59e0b'
})

const vehicleLabel = computed(() => {
  if (vehicle.value) {
    return `${vehicle.value.plateNumber} — ${vehicle.value.brand} ${vehicle.value.model}`
  }
  return `Araç #${installment.value?.vehicleId ?? ''}`
})

async function loadInstallment(): Promise<void> {
  if (Number.isNaN(installmentId.value) || installmentId.value <= 0) {
    toast.error('Geçersiz taksit planı')
    router.push({ name: 'installments-dashboard' })
    return
  }

  loading.value = true
  try {
    installment.value = await installmentsApi.getById(installmentId.value)
    if (installment.value?.vehicleId) {
      try {
        vehicle.value = await vehiclesApi.getById(installment.value.vehicleId)
      } catch {
        vehicle.value = null
      }
    }
  } catch (err) {
    installment.value = null
    toast.apiError(err, 'Taksit planı yüklenemedi')
  } finally {
    loading.value = false
  }
}

function goToVehicle(): void {
  if (!installment.value) return
  router.push({ name: 'vehicle-detail', params: { id: installment.value.vehicleId } })
}

async function handleEarlyClosureSubmit(
  paymentAmount: number,
  discountPercentage: number | undefined,
  notes: string
): Promise<void> {
  if (!installment.value) return

  try {
    await installmentsApi.closeEarly(installment.value.id, {
      paymentAmount,
      paymentCurrency: installment.value.outstandingCurrency || installment.value.totalCurrency || 'TRY',
      discountPercentage,
      notes
    })
    toast.success('Taksit planı başarıyla kapatıldı')
    showCloseModal.value = false
    await loadInstallment()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

onMounted(loadInstallment)
watch(() => route.params.id, loadInstallment)
</script>

<template>
  <div class="installment-detail-view">
    <div class="page-header">
      <div>
        <h1>Taksit Planı Detayı</h1>
        <p v-if="installment" class="page-subtitle">
          Plan #{{ installment.id }}
          <span v-if="vehicle" class="vehicle-badge">{{ vehicleLabel }}</span>
        </p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn btn-outline" @click="router.push({ name: 'installments-dashboard' })">
          ← Dashboard
        </button>
        <button v-if="installment" type="button" class="btn btn-outline" @click="goToVehicle">
          Araca Git
        </button>
        <button
          v-if="installment && installment.outstandingBalance > 0"
          type="button"
          class="btn btn-danger"
          @click="showCloseModal = true"
        >
          Erken Kapat
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>Yükleniyor...</span>
    </div>

    <template v-else-if="installment">
      <div v-if="overdueCount > 0" class="overdue-banner">
        <span>⚠️</span>
        <span>Bu planda <strong>{{ overdueCount }}</strong> adet gecikmiş ödeme bulunmaktadır.</span>
      </div>

      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">Araç</span>
          <span class="value vehicle-value" @click="goToVehicle">{{ vehicleLabel }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Toplam Tutar</span>
          <span class="value">{{ formatCurrency(installment.totalAmount, installment.totalCurrency) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Aylık Ödeme</span>
          <span class="value">{{ formatCurrency(installment.monthlyPayment, installment.monthlyPaymentCurrency) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Ödenen Taksit</span>
          <span class="value">
            {{ remainingDisplay }}
            <span v-if="isCompleted" class="badge-done">(Tamamlandı)</span>
          </span>
        </div>
        <div class="summary-item" :class="{ 'summary-item--warning': installment.outstandingBalance > 0 }">
          <span class="label">Kalan Bakiye</span>
          <span class="value">{{ formatCurrency(installment.outstandingBalance, installment.outstandingCurrency) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Sonraki Ödeme</span>
          <span class="value">{{ nextPaymentDisplay }}</span>
        </div>
        <div v-if="installment.earlyClosedAt" class="summary-item summary-item--highlight">
          <span class="label">Erken kapatılma tarihi</span>
          <span class="value">{{ formatDate(installment.earlyClosedAt) }}</span>
        </div>
      </div>

      <div class="progress-box">
        <div class="progress-header">
          <span class="progress-label">Ödeme İlerlemesi</span>
          <span class="progress-percent">{{ progress }}%</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progress}%`, background: progressColor }"
          ></div>
        </div>
        <p class="progress-text">
          {{ displayPaidCount }} / {{ installment.numberOfInstallments }} ödeme tamamlandı
        </p>
      </div>

      <div class="schedule-box">
        <h2>Ödeme Planı</h2>
        <PaymentScheduleTable :payments="payments" @payment-recorded="loadInstallment" />
      </div>

      <div v-if="installment?.id" class="documents-box">
        <DocumentsSection
          reference-type="INSTALLMENT"
          :reference-id="installment.id"
          title="Taksit Belgeleri"
        />
      </div>
    </template>

    <div v-else class="empty-state">
      <p>Taksit planı bulunamadı.</p>
      <button class="btn btn-outline" @click="router.push({ name: 'installments-dashboard' })">
        Dashboard'a Dön
      </button>
    </div>

    <teleport to="body">
      <InstallmentEarlyClosureModal
        v-if="installment"
        :show="showCloseModal"
        :installment="installment"
        @close="showCloseModal = false"
        @submit="handleEarlyClosureSubmit"
      />
    </teleport>
  </div>
</template>

<style scoped>
.installment-detail-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text, #111827);
}

.page-subtitle {
  margin: 0.375rem 0 0;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.9375rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vehicle-badge {
  display: inline-block;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 9999px;
  padding: 0.125rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem;
  color: var(--color-text-secondary, #6b7280);
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border, #e5e7eb);
  border-top-color: var(--color-primary, #2563eb);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.overdue-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 0.875rem 1.25rem;
  font-size: 0.9375rem;
  color: #991b1b;
}

.empty-state {
  text-align: center;
  padding: 4rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.summary-item {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.625rem;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.summary-item--warning {
  border-color: #fcd34d;
  background: #fffbeb;
}

.summary-item--highlight {
  border-color: #86efac;
  background: #f0fdf4;
}

.summary-item .label {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
}

.summary-item .value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111827);
}

.badge-done {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-success, #059669);
  margin-left: 0.25rem;
}

.vehicle-value {
  cursor: pointer;
  color: var(--color-primary, #2563eb) !important;
  font-size: 0.9375rem !important;
}

.vehicle-value:hover {
  text-decoration: underline;
}

.progress-box {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.625rem;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #111827);
}

.progress-percent {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-secondary, #6b7280);
}

.progress-bar {
  height: 0.625rem;
  background: var(--color-background, #f3f4f6);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.progress-text {
  margin: 0.5rem 0 0;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.8125rem;
}

.schedule-box {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.schedule-box h2 {
  margin: 0 0 1rem;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-text, #111827);
}

.btn {
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn-outline {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  color: var(--color-text, #111827);
}

.btn-outline:hover {
  background: var(--color-background, #f3f4f6);
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

@media (max-width: 1024px) {
  .installment-detail-view {
    padding: 1.5rem 1rem;
  }

  .page-subtitle {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .page-header,
  .header-actions,
  .progress-header {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .overdue-banner,
  .progress-box,
  .schedule-box,
  .documents-box,
  .empty-state {
    padding: 1rem;
  }

  .btn {
    width: 100%;
  }
}
</style>
