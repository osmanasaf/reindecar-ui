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
const hasOverdue = computed(() => installmentStore.overduePaymentsCount > 0)

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
      <div>
        <h1>Taksit Ödeme Yönetimi</h1>
        <p class="page-subtitle">Araç taksit planları ve ödeme takibi</p>
      </div>
    </header>

    <div v-if="installmentStore.loading" class="loading">
      <div class="loading-spinner"></div>
      <span>Yükleniyor...</span>
    </div>

    <div v-else-if="installmentStore.error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p class="error-title">Dashboard yüklenemedi</p>
      <p class="error-message">{{ installmentStore.error }}</p>
      <button class="btn btn-primary" @click="installmentStore.fetchDashboard()">
        Tekrar Dene
      </button>
    </div>

    <template v-else-if="installmentStore.dashboard">
      <div v-if="hasOverdue" class="overdue-banner">
        <span class="overdue-icon">⚠️</span>
        <span>
          <strong>{{ installmentStore.overduePaymentsCount }}</strong> adet gecikmiş ödeme bulunmaktadır.
          Lütfen en kısa sürede işlem yapınız.
        </span>
      </div>

      <div class="summary-cards">
        <div class="card card--blue">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <span class="card-label">Aylık Yükümlülük</span>
            <span class="card-value">
              {{ formatCurrency(installmentStore.totalMonthlyObligations, installmentStore.dashboard.currency) }}
            </span>
          </div>
        </div>

        <div :class="['card', hasOverdue ? 'card--red' : 'card--gray']">
          <div class="card-icon">⚠️</div>
          <div class="card-content">
            <span class="card-label">Gecikmiş Ödeme</span>
            <span :class="['card-value', hasOverdue ? 'danger' : '']">
              {{ installmentStore.overduePaymentsCount }}
            </span>
          </div>
        </div>

        <div class="card card--purple">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <span class="card-label">Toplam Bakiye</span>
            <span class="card-value">
              {{ formatCurrency(installmentStore.totalOutstandingBalance, installmentStore.dashboard.outstandingCurrency) }}
            </span>
          </div>
        </div>

        <div class="card card--green">
          <div class="card-icon">🚗</div>
          <div class="card-content">
            <span class="card-label">Taksitli Araç</span>
            <span class="card-value">{{ installmentStore.vehiclesWithInstallments }}</span>
          </div>
        </div>
      </div>

      <div class="upcoming-payments">
        <div class="section-header">
          <h2>Yaklaşan Ödemeler</h2>
          <span v-if="upcomingPayments.length > 0" class="payment-count">
            {{ upcomingPayments.length }} ödeme
          </span>
        </div>
        <div v-if="upcomingPayments.length === 0" class="empty-payments">
          <p>Yaklaşan ödeme bulunmamaktadır.</p>
        </div>
        <PaymentScheduleTable
          v-else
          :payments="upcomingPayments"
          show-vehicle-info
          @payment-recorded="handlePaymentRecorded"
          @view-installment="handleViewInstallment"
        />
      </div>
    </template>

    <div v-else class="empty-state">
      <p>Henüz taksit planı bulunmamaktadır.</p>
    </div>
  </div>
</template>

<style scoped>
.payment-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.875rem;
  font-weight: 700;
  margin: 0 0 0.375rem 0;
  color: var(--color-text, #111827);
}

.page-subtitle {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
  font-size: 0.9375rem;
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

.error-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border: 1px solid #fecaca;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.error-icon { font-size: 2.5rem; }

.error-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #b91c1c;
  margin: 0;
}

.error-message {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.overdue-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 0.875rem 1.25rem;
  margin-bottom: 1.5rem;
  font-size: 0.9375rem;
  color: #991b1b;
}

.overdue-icon { font-size: 1.125rem; flex-shrink: 0; }

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-left-width: 4px;
}

.card--blue  { border-left-color: #3b82f6; }
.card--red   { border-left-color: #ef4444; background: #fff5f5; }
.card--gray  { border-left-color: #9ca3af; }
.card--purple { border-left-color: #8b5cf6; }
.card--green { border-left-color: #22c55e; }

.card-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary, #6b7280);
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text, #111827);
}

.card-value.danger {
  color: #dc2626;
}

.upcoming-payments {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.section-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text, #111827);
}

.payment-count {
  font-size: 0.8125rem;
  color: var(--color-text-secondary, #6b7280);
  background: var(--color-background, #f3f4f6);
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
}

.empty-payments {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.9375rem;
}

.empty-state {
  text-align: center;
  padding: 4rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.btn {
  padding: 0.5rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark, #1d4ed8);
}
</style>
