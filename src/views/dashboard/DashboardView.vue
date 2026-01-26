<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LineChart, DoughnutChart } from '@/components/charts'
import DateRangePicker from '@/components/base/DateRangePicker.vue'
import ReturnCompleteModal from '@/components/rentals/ReturnCompleteModal.vue'
import { useDashboardStats, useToast } from '@/composables'
import type { Rental } from '@/types'
import type { UpcomingReturn } from '@/api'

const router = useRouter()
const toast = useToast()

const { 
  stats, 
  revenue, 
  vehicleStatus, 
  upcomingReturns, 
  loading, 
  fetchAll 
} = useDashboardStats()

const dateRange = ref({ start: '', end: '' })
const showReturnModal = ref(false)
const selectedRentalId = ref<number | null>(null)

function safeNumber(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

const statsCards = computed(() => {
  if (!stats.value) return []
  
  const activeRentals = safeNumber(stats.value.activeRentals)
  const overdueRentals = safeNumber(stats.value.overdueRentals)
  const availableVehicles = safeNumber(stats.value.availableVehicles)
  const totalVehicles = safeNumber(stats.value.totalVehicles)
  const todayReturns = safeNumber(stats.value.todayReturns)
  const tomorrowReturns = safeNumber(stats.value.tomorrowReturns)
  const pendingPayments = safeNumber(stats.value.pendingPayments)
  const pendingPaymentAmount = safeNumber(stats.value.pendingPaymentAmount)
  
  return [
    { 
      id: 'active', 
      label: 'Aktif Kiralama', 
      value: activeRentals.toString(), 
      icon: '🔑', 
      color: 'primary',
      trend: overdueRentals > 0 ? `${overdueRentals} gecikmiş` : 'Zamanında'
    },
    { 
      id: 'available', 
      label: 'Müsait Araç', 
      value: availableVehicles.toString(), 
      icon: '🚗', 
      color: 'success',
      trend: `${totalVehicles} toplam`
    },
    { 
      id: 'returns', 
      label: 'Yaklaşan İade', 
      value: (todayReturns + tomorrowReturns).toString(), 
      icon: '📅', 
      color: 'warning',
      trend: `${todayReturns} bugün`
    },
    { 
      id: 'payments', 
      label: 'Bekleyen Ödeme', 
      value: pendingPayments.toString(), 
      icon: '💳', 
      color: 'info',
      trend: formatCurrency(pendingPaymentAmount)
    }
  ]
})

const revenueChartData = computed(() => {
  if (!revenue.value) {
    return {
      labels: [],
      datasets: [{
        label: 'Aylık Ciro (₺)',
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
        data: [],
        tension: 0.4
      }]
    }
  }

  return {
    labels: revenue.value.labels,
    datasets: [{
      label: 'Aylık Ciro (₺)',
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
      data: revenue.value.values,
      tension: 0.4
    }]
  }
})

const revenueOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
    x: { grid: { display: false } }
  }
}

const vehicleStatusChartData = computed(() => {
  if (!vehicleStatus.value) {
    return {
      labels: ['Müsait', 'Kirada', 'Bakımda', 'Rezerve'],
      datasets: [{
        backgroundColor: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'],
        data: [0, 0, 0, 0]
      }]
    }
  }

  return {
    labels: ['Müsait', 'Kirada', 'Bakımda', 'Rezerve'],
    datasets: [{
      backgroundColor: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'],
      data: [
        safeNumber(vehicleStatus.value.available),
        safeNumber(vehicleStatus.value.rented),
        safeNumber(vehicleStatus.value.maintenance),
        safeNumber(vehicleStatus.value.reserved)
      ]
    }]
  }
})

const vehicleStatusOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const }
  }
}

function formatCurrency(amount: unknown): string {
  const num = safeNumber(amount)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num)
}

function formatReturnTime(item: UpcomingReturn): string {
  const date = new Date(item.expectedDate)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return item.expectedTime ? `Bugün ${item.expectedTime}` : 'Bugün'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return item.expectedTime ? `Yarın ${item.expectedTime}` : 'Yarın'
  }
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}

function openReturnModal(rental: UpcomingReturn) {
  selectedRentalId.value = rental.rentalId
  showReturnModal.value = true
}

function handleReturnCompleted(rental: Rental) {
  toast.success(`Kiralama #${rental.rentalNumber} tamamlandı`)
  fetchAll()
}

function handleDateRangeChange(range: { start: string; end: string }) {
  dateRange.value = range
}

function navigateTo(route: string) {
  router.push(route)
}

onMounted(() => {
  fetchAll()
})
</script>

<template>
  <div class="dashboard">
    <div class="header">
      <div>
        <h1>Hoş Geldiniz</h1>
        <p class="subtitle">Güncel istatistikler ve özet bilgiler</p>
      </div>
      <div class="actions">
        <DateRangePicker
          v-model="dateRange"
          @change="handleDateRangeChange"
        />
        <button class="btn btn-primary" @click="navigateTo('/rentals/create')">
          + Yeni Kiralama
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <template v-if="loading">
        <div v-for="i in 4" :key="i" class="stat-card skeleton">
          <div class="skeleton-content"></div>
        </div>
      </template>
      <template v-else>
        <div 
          v-for="stat in statsCards" 
          :key="stat.id" 
          class="stat-card"
          :class="stat.color"
        >
          <div class="stat-content">
            <span class="stat-label">{{ stat.label }}</span>
            <span class="stat-value">{{ stat.value }}</span>
            <div class="stat-trend">
              {{ stat.trend }}
            </div>
          </div>
          <div class="stat-icon-bg">
            <span class="icon">{{ stat.icon }}</span>
          </div>
        </div>
      </template>
    </div>

    <div class="dashboard-grid">
      <div class="card chart-card revenue-chart">
        <div class="card-header">
          <h3>Gelir Analizi</h3>
          <select class="chart-filter">
            <option>Son 6 Ay</option>
            <option>Bu Yıl</option>
          </select>
        </div>
        <div class="chart-body">
          <template v-if="loading">
            <div class="loading-skeleton"></div>
          </template>
          <LineChart v-else :data="revenueChartData" :options="revenueOptions" />
        </div>
      </div>

      <div class="card chart-card status-chart">
        <div class="card-header">
          <h3>Araç Durumu</h3>
        </div>
        <div class="chart-body donut-body">
          <template v-if="loading">
            <div class="loading-skeleton donut"></div>
          </template>
          <DoughnutChart v-else :data="vehicleStatusChartData" :options="vehicleStatusOptions" />
        </div>
      </div>

      <div class="card table-card">
        <div class="card-header">
          <h3>Yaklaşan İadeler</h3>
          <router-link to="/rentals?status=ACTIVE" class="view-all">Tümünü Gör</router-link>
        </div>
        <div class="table-body">
          <template v-if="loading">
            <div class="table-skeleton">
              <div v-for="i in 3" :key="i" class="skeleton-row"></div>
            </div>
          </template>
          <template v-else-if="upcomingReturns && upcomingReturns.length > 0">
            <table class="simple-table">
              <thead>
                <tr>
                  <th>Plaka</th>
                  <th>Müşteri</th>
                  <th>İade Zamanı</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in upcomingReturns" :key="item.rentalId">
                  <td class="font-medium">{{ item.vehiclePlate }}</td>
                  <td>{{ item.customerName }}</td>
                  <td>{{ formatReturnTime(item) }}</td>
                  <td>
                    <span :class="['status-dot', item.isOverdue ? 'danger' : 'success']"></span>
                    {{ item.isOverdue ? 'Gecikmede' : 'Zamanında' }}
                  </td>
                  <td>
                    <button class="btn-sm btn-outline" @click="openReturnModal(item)">
                      İade Al
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>Yaklaşan iade bulunmuyor</p>
            </div>
          </template>
        </div>
      </div>
    </div>

    <ReturnCompleteModal
      :visible="showReturnModal"
      :rental-id="selectedRentalId"
      @close="showReturnModal = false"
      @completed="handleReturnCompleted"
    />
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}

.header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 15px;
  margin-top: 4px;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--color-border);
  transition: transform 0.2s;
  overflow: hidden;
  position: relative;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.skeleton {
  min-height: 120px;
}

.skeleton-content {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 8px;
}

.stat-trend {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.stat-icon-bg {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--color-bg-secondary);
}

.stat-card.primary .stat-icon-bg { background: var(--color-primary-light); }
.stat-card.success .stat-icon-bg { background: var(--color-success-light); }
.stat-card.warning .stat-icon-bg { background: var(--color-warning-light); }
.stat-card.info .stat-icon-bg { background: var(--color-info-light); }

.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto;
  gap: 24px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.chart-filter {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
}

.view-all {
  font-size: 13px;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.chart-body {
  padding: 24px;
  height: 350px;
}

.donut-body {
  height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-card {
  grid-column: 1 / -1;
}

.revenue-chart {
  grid-column: 1 / 2;
}

.status-chart {
  grid-column: 2 / 3;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
}

.simple-table th {
  text-align: left;
  padding: 12px 24px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.simple-table td {
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
  color: var(--color-text);
}

.simple-table tr:last-child td {
  border-bottom: none;
}

.font-medium {
  font-weight: 500;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.status-dot.success { background: var(--color-success); }
.status-dot.danger { background: var(--color-danger); }

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary { background: var(--color-primary); color: white; }
.btn-primary:hover { background: var(--color-primary-hover); }

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
}

.loading-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
}

.table-skeleton {
  padding: 16px 24px;
}

.skeleton-row {
  height: 48px;
  background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-row:last-child {
  margin-bottom: 0;
}

.empty-state {
  padding: 40px 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-state p {
  margin: 0;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .revenue-chart, .status-chart {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .actions {
    flex-direction: column;
  }
}
</style>
