<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { installmentsApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleInstallmentResponse } from '@/types'
import { formatCurrency, calculateProgress } from '@/utils/installmentHelpers'
import PaymentScheduleTable from '@/components/installments/PaymentScheduleTable.vue'
import InstallmentEarlyClosureModal from '@/components/InstallmentEarlyClosureModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loading = ref(false)
const installment = ref<VehicleInstallmentResponse | null>(null)
const showCloseModal = ref(false)

const installmentId = computed(() => Number(route.params.id))
const payments = computed(() => installment.value?.payments ?? [])
const paidCount = computed(() => payments.value.filter(p => p.status === 'PAID').length)
const progress = computed(() => {
  if (!installment.value) return 0
  return calculateProgress(paidCount.value, installment.value.numberOfInstallments)
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
        <p v-if="installment">Plan #{{ installment.id }}</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn btn-outline" @click="router.push({ name: 'installments-dashboard' })">
          Dashboard
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

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <template v-else-if="installment">
      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">Araç ID</span>
          <span class="value">#{{ installment.vehicleId }}</span>
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
          <span class="label">Kalan Taksit</span>
          <span class="value">{{ installment.remainingInstallments }} / {{ installment.numberOfInstallments }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Kalan Bakiye</span>
          <span class="value">{{ formatCurrency(installment.outstandingBalance, installment.outstandingCurrency) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Sonraki Ödeme</span>
          <span class="value">{{ new Date(installment.nextPaymentDueDate).toLocaleDateString('tr-TR') }}</span>
        </div>
      </div>

      <div class="progress-box">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <p>{{ paidCount }} / {{ installment.numberOfInstallments }} ödeme tamamlandı (%{{ progress }})</p>
      </div>

      <div class="schedule-box">
        <h2>Ödeme Planı</h2>
        <PaymentScheduleTable :payments="payments" @payment-recorded="loadInstallment" />
      </div>
    </template>

    <div v-else class="empty-state">
      Taksit planı bulunamadı.
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
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.page-header p {
  margin: 6px 0 0;
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading,
.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--color-text-secondary);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.summary-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-item .label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.summary-item .value {
  font-size: 18px;
  font-weight: 600;
}

.progress-box,
.schedule-box {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
}

.progress-box p {
  margin: 10px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.progress-bar {
  height: 8px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-success);
}

.schedule-box h2 {
  margin: 0 0 16px;
  font-size: 18px;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 9px 14px;
  cursor: pointer;
  font-weight: 500;
}

.btn-outline {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}
</style>
