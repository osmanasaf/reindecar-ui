<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInstallmentStore } from '@/stores/installment.store'
import { formatCurrency } from '@/utils/installmentHelpers'
import PaymentScheduleTable from '@/components/installments/PaymentScheduleTable.vue'

const installmentStore = useInstallmentStore()
const router = useRouter()

onMounted(async () => {
  await installmentStore.fetchDashboard()
  startAutoRefresh()
})

let refreshInterval: ReturnType<typeof setInterval> | null = null

function startAutoRefresh(): void {
  refreshInterval = setInterval(() => {
    installmentStore.fetchDashboard()
  }, 300000)
}

onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

const upcomingPayments = computed(() => installmentStore.upcomingPayments)

async function handlePaymentRecorded(): Promise<void> {
  await installmentStore.fetchDashboard()
}

function handleViewInstallment(installmentId: number): void {
  router.push({ name: 'installment-detail', params: { id: installmentId } })
}
</script>

<template>
  <div class="payment-dashboard">
    <header class="page-header">
      <h1>Taksit Ödeme Yönetimi</h1>
    </header>

    <div v-if="installmentStore.loading" class="loading">Yükleniyor...</div>

    <template v-else-if="installmentStore.dashboard">
      <div class="summary-cards">
        <div class="card">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <span class="card-label">Aylık Yükümlülük</span>
            <span class="card-value">
              {{ formatCurrency(installmentStore.totalMonthlyObligations, installmentStore.dashboard.currency) }}
            </span>
          </div>
        </div>

        <div class="card">
          <div class="card-icon">⚠️</div>
          <div class="card-content">
            <span class="card-label">Gecikmiş Ödeme</span>
            <span class="card-value danger">{{ installmentStore.overduePaymentsCount }}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <span class="card-label">Toplam Bakiye</span>
            <span class="card-value">
              {{ formatCurrency(installmentStore.totalOutstandingBalance, installmentStore.dashboard.outstandingCurrency) }}
            </span>
          </div>
        </div>

        <div class="card">
          <div class="card-icon">🚗</div>
          <div class="card-content">
            <span class="card-label">Taksitli Araç</span>
            <span class="card-value">{{ installmentStore.vehiclesWithInstallments }}</span>
          </div>
        </div>
      </div>

      <div class="upcoming-payments">
        <h2>Yaklaşan Ödemeler</h2>
        <PaymentScheduleTable
          :payments="upcomingPayments"
          show-vehicle-info
          @payment-recorded="handlePaymentRecorded"
          @view-installment="handleViewInstallment"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.payment-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 24px 0;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.card-icon {
  font-size: 32px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.card-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
}

.card-value.danger {
  color: var(--color-danger);
}

.upcoming-payments {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.upcoming-payments h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
}
</style>
