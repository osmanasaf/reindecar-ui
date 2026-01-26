<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePagination, useToast } from '@/composables'

interface Payment {
  id: number
  rentalId: number
  amount: number
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER'
  paymentDate: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  customerName: string
  plateNumber: string
}

const payments = ref<Payment[]>([])
const loading = ref(true)
const statusFilter = ref('')

const { page, size, totalElements, setPage, setTotal } = usePagination()
const toast = useToast()

const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'PENDING', label: 'Beklemede' },
  { value: 'COMPLETED', label: 'Tamamlandı' },
  { value: 'FAILED', label: 'Başarısız' },
  { value: 'REFUNDED', label: 'İade' }
]

const methodLabels: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  BANK_TRANSFER: 'Havale/EFT'
}

const statusLabels: Record<string, string> = {
  PENDING: 'Beklemede',
  COMPLETED: 'Tamamlandı',
  FAILED: 'Başarısız',
  REFUNDED: 'İade'
}

const statusColors: Record<string, string> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  REFUNDED: 'info'
}

const filteredPayments = computed(() => {
  if (!statusFilter.value) return payments.value
  return payments.value.filter(p => p.status === statusFilter.value)
})

async function fetchPayments() {
  loading.value = true
  try {
    payments.value = [
      { id: 1, rentalId: 101, amount: 1500, paymentMethod: 'CREDIT_CARD', paymentDate: '2026-01-15', status: 'COMPLETED', customerName: 'Ahmet Yılmaz', plateNumber: '34 ABC 123' },
      { id: 2, rentalId: 102, amount: 2200, paymentMethod: 'CASH', paymentDate: '2026-01-16', status: 'COMPLETED', customerName: 'XYZ Ltd. Şti.', plateNumber: '06 XYZ 789' },
      { id: 3, rentalId: 103, amount: 850, paymentMethod: 'BANK_TRANSFER', paymentDate: '2026-01-18', status: 'PENDING', customerName: 'Mehmet Demir', plateNumber: '35 DEF 456' }
    ]
    setTotal(3, 1)
  } catch {
    toast.error('Ödemeler yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR')
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
}

onMounted(fetchPayments)
</script>

<template>
  <div class="payments-page">
    <header class="page-header">
      <div class="header-left">
        <h1>Ödemeler</h1>
        <span class="count">{{ totalElements }} ödeme</span>
      </div>
    </header>

    <div class="filters">
      <select v-model="statusFilter" class="filter-select">
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="filteredPayments.length === 0" class="empty-state">
      <p>Ödeme bulunamadı</p>
    </div>

    <div v-else class="payments-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Müşteri</th>
            <th>Araç</th>
            <th>Tutar</th>
            <th>Yöntem</th>
            <th>Tarih</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="payment in filteredPayments" :key="payment.id">
            <td class="payment-id">#{{ payment.id }}</td>
            <td>{{ payment.customerName }}</td>
            <td class="plate">{{ payment.plateNumber }}</td>
            <td class="amount">{{ formatCurrency(payment.amount) }}</td>
            <td>
              <span class="method-badge">{{ methodLabels[payment.paymentMethod] }}</span>
            </td>
            <td>{{ formatDate(payment.paymentDate) }}</td>
            <td>
              <span :class="['status-badge', statusColors[payment.status]]">
                {{ statusLabels[payment.status] }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.payments-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.count {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.filters {
  margin-bottom: 24px;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-surface);
  min-width: 160px;
}

.loading,
.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.payments-table {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 14px 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
}

tbody tr:last-child td {
  border-bottom: none;
}

.payment-id {
  font-weight: 600;
  color: var(--color-primary);
}

.plate {
  font-weight: 600;
}

.amount {
  font-weight: 600;
  color: var(--color-success);
}

.method-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success { background: var(--color-success-light); color: var(--color-success); }
.status-badge.warning { background: var(--color-warning-light); color: var(--color-warning); }
.status-badge.danger { background: var(--color-danger-light); color: var(--color-danger); }
.status-badge.info { background: var(--color-info-light); color: var(--color-info); }
</style>
