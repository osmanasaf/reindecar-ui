<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInstallmentStore } from '@/stores/installment.store'
import { formatCurrency } from '@/utils/installmentHelpers'
import { FinancePageLayout } from '@/components/accounting'
import { RcButton, RcEmpty } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { useFinancePageContext } from '@/composables/useFinancePageContext'
import PaymentScheduleTable from '@/components/installments/PaymentScheduleTable.vue'

const installmentStore = useInstallmentStore()
const financePage = useFinancePageContext()
const router = useRouter()

onMounted(async () => {
  await installmentStore.fetchDashboard()
  startAutoRefresh()
})

let refreshInterval: ReturnType<typeof setInterval> | null = null

function startAutoRefresh(): void {
  refreshInterval = setInterval(() => {
    void installmentStore.fetchDashboard()
  }, 300000)
}

onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

const upcomingPayments = computed(() => installmentStore.upcomingPayments)
const hasOverdue = computed(() => installmentStore.overduePaymentsCount > 0)
const dashboard = computed(() => installmentStore.dashboard)

async function handlePaymentRecorded(): Promise<void> {
  await installmentStore.fetchDashboard()
  await financePage?.refresh()
}

function handleViewInstallment(installmentId: number): void {
  router.push({ name: 'installment-detail', params: { id: installmentId } })
}

async function retryLoad(): Promise<void> {
  await installmentStore.fetchDashboard()
  await financePage?.refresh()
}
</script>

<template>
  <FinancePageLayout class="rca-installments">
    <div v-if="installmentStore.loading && !dashboard" class="rc-skeleton rc-card-skeleton" style="height: 320px" />

    <div v-else-if="installmentStore.error" class="rc-alert rc-alert--danger" role="alert">
      <p style="margin: 0 0 8px">{{ installmentStore.error }}</p>
      <RcButton variant="secondary" size="sm" @click="retryLoad">Tekrar dene</RcButton>
    </div>

    <template v-else-if="dashboard">
      <div v-if="hasOverdue" class="rc-alert rc-alert--danger" role="alert" style="margin-bottom: 16px">
        <RcIcon name="warning" :size="16" />
        <span>
          <strong>{{ installmentStore.overduePaymentsCount }}</strong> adet gecikmiş ödeme bulunmaktadır.
          Lütfen en kısa sürede işlem yapınız.
        </span>
      </div>

      <div class="rca-installments-stats">
        <div class="rca-stat">
          <div class="rca-stat__label">Aylık yükümlülük</div>
          <div class="rca-stat__value rc-num">
            {{ formatCurrency(installmentStore.totalMonthlyObligations, dashboard.currency) }}
          </div>
        </div>
        <div class="rca-stat">
          <div class="rca-stat__label">Gecikmiş ödeme</div>
          <div
            class="rca-stat__value rc-num"
            :class="hasOverdue ? 'rca-stat__value--danger' : ''"
          >
            {{ installmentStore.overduePaymentsCount }}
          </div>
        </div>
        <div class="rca-stat">
          <div class="rca-stat__label">Toplam bakiye</div>
          <div class="rca-stat__value rc-num">
            {{ formatCurrency(installmentStore.totalOutstandingBalance, dashboard.outstandingCurrency) }}
          </div>
        </div>
        <div class="rca-stat">
          <div class="rca-stat__label">Taksitli araç</div>
          <div class="rca-stat__value rc-num">{{ installmentStore.vehiclesWithInstallments }}</div>
        </div>
      </div>

      <div class="rc-card" style="overflow: hidden">
        <div class="rc-card__head">
          <div>
            <div class="rc-card__title">Yaklaşan ödemeler</div>
            <div style="font-size: 12px; color: var(--rc-text-muted); margin-top: 2px">
              {{ upcomingPayments.length }} ödeme planlandı
            </div>
          </div>
        </div>

        <RcEmpty
          v-if="upcomingPayments.length === 0"
          title="Yaklaşan ödeme yok"
          description="Henüz planlanmış taksit ödemesi bulunmuyor"
        />

        <PaymentScheduleTable
          v-else
          :payments="upcomingPayments"
          show-vehicle-info
          @payment-recorded="handlePaymentRecorded"
          @view-installment="handleViewInstallment"
        />
      </div>
    </template>

    <RcEmpty
      v-else
      title="Taksit planı yok"
      description="Henüz araç taksit planı bulunmamaktadır"
    />
  </FinancePageLayout>
</template>
