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
import { RcButton, RcEmpty, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'

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

function isInvalidOrEpochDate(date: string | number | null | undefined): boolean {
  if (date === null || date === undefined) return true
  if (typeof date === 'string' && (date === '' || date.startsWith('1970-01-01') || date.startsWith('1970'))) return true
  if (typeof date === 'number' && (date === 0 || date < 86400000)) return true
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

const progressTone = computed(() => {
  if (progress.value >= 75) return 'var(--rc-green-500)'
  if (progress.value >= 40) return 'var(--rc-blue-500)'
  return 'var(--rc-orange-500)'
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
      notes,
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
  <div class="rc-page rca-detail">
    <button type="button" class="rca-detail__back" @click="router.push({ name: 'installments-dashboard' })">
      <RcIcon name="chevronLeft" :size="14" />
      Araç taksitleri
    </button>

    <div v-if="loading" class="rc-skeleton rc-card-skeleton" style="height: 280px" />

    <RcEmpty
      v-else-if="!installment"
      title="Taksit planı bulunamadı"
      description="Kayıt silinmiş veya erişim yok olabilir"
    >
      <template #action>
        <RcButton variant="secondary" @click="router.push({ name: 'installments-dashboard' })">
          Listeye dön
        </RcButton>
      </template>
    </RcEmpty>

    <template v-else>
      <div class="rca-detail__head">
        <div>
          <h1 class="rca-detail__title">Taksit planı #{{ installment.id }}</h1>
          <p class="rca-detail__subtitle">
            <button type="button" class="rci-vehicle-link" @click="goToVehicle">{{ vehicleLabel }}</button>
          </p>
        </div>
        <div class="rca-detail__badges">
          <RcBadge v-if="isCompleted" variant="success">Tamamlandı</RcBadge>
          <RcBadge v-else-if="overdueCount > 0" variant="danger">{{ overdueCount }} gecikmiş</RcBadge>
          <RcBadge v-else variant="info">Aktif</RcBadge>
        </div>
      </div>

      <div class="rca-detail__actions">
        <RcButton variant="secondary" @click="goToVehicle">Araca git</RcButton>
        <RcButton
          v-if="installment.outstandingBalance > 0"
          variant="danger"
          @click="showCloseModal = true"
        >
          Erken kapat
        </RcButton>
      </div>

      <div v-if="overdueCount > 0" class="rca-pay-alert rca-pay-alert--warn" style="margin-bottom: 16px">
        Bu planda <strong>{{ overdueCount }}</strong> adet gecikmiş ödeme bulunmaktadır.
      </div>

      <div class="rca-detail__grid">
        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Plan özeti</h3>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Araç</span>
            <button type="button" class="rci-vehicle-link" @click="goToVehicle">{{ vehicleLabel }}</button>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Aylık ödeme</span>
            <span class="rca-meta-row__value">
              {{ formatCurrency(installment.monthlyPayment, installment.monthlyPaymentCurrency) }}
            </span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Taksit sayısı</span>
            <span class="rca-meta-row__value">{{ installment.numberOfInstallments }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Sonraki ödeme</span>
            <span class="rca-meta-row__value">{{ nextPaymentDisplay }}</span>
          </div>
          <div v-if="installment.earlyClosedAt" class="rca-meta-row">
            <span class="rca-meta-row__label">Erken kapatılma</span>
            <span class="rca-meta-row__value">{{ formatDate(installment.earlyClosedAt) }}</span>
          </div>
        </div>

        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Tutar bilgileri</h3>
          <div class="rca-amounts">
            <div class="rca-amount-row">
              <span>Toplam</span>
              <span>{{ formatCurrency(installment.totalAmount, installment.totalCurrency) }}</span>
            </div>
            <div class="rca-amount-row">
              <span>Ödenen taksit</span>
              <span style="color: var(--rc-green-600)">
                {{ displayPaidCount }} / {{ installment.numberOfInstallments }}
              </span>
            </div>
            <div class="rca-amount-row rca-amount-row--highlight">
              <span>Kalan bakiye</span>
              <span class="rca-amount-row__remaining">
                {{ formatCurrency(installment.outstandingBalance, installment.outstandingCurrency) }}
              </span>
            </div>
          </div>
          <div style="margin-top: 16px">
            <div class="rca-progress__head">
              <span class="rca-progress__label">Ödeme ilerlemesi</span>
              <span class="rca-progress__pct">{{ progress }}%</span>
            </div>
            <div class="rca-progress__bar">
              <div
                class="rca-progress__fill"
                :style="{ width: `${progress}%`, background: progressTone }"
              />
            </div>
            <div class="rca-progress__amounts">
              <span>{{ displayPaidCount }} ödendi</span>
              <span>{{ installment.numberOfInstallments }} taksit</span>
            </div>
          </div>
        </div>
      </div>

      <div class="rca-panel-card">
        <h3 class="rca-panel-card__title">Ödeme planı</h3>
        <PaymentScheduleTable
          :payments="payments"
          :installment="installment"
          @payment-recorded="loadInstallment"
        />
      </div>

      <div class="rca-panel-card">
        <DocumentsSection
          reference-type="INSTALLMENT"
          :reference-id="installment.id"
          title="Taksit belgeleri"
        />
      </div>
    </template>

    <InstallmentEarlyClosureModal
      v-if="installment"
      :open="showCloseModal"
      :installment="installment"
      @close="showCloseModal = false"
      @submit="handleEarlyClosureSubmit"
    />
  </div>
</template>

<style scoped>
.rci-vehicle-link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: var(--rc-accent);
  cursor: pointer;
  text-align: left;
}

.rci-vehicle-link:hover {
  text-decoration: underline;
}
</style>
