<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { rentalsApi, vehiclesApi, customersApi } from '@/api'
import { usePagination, useToast } from '@/composables'
import { CustomerType } from '@/types'
import type { Rental, RentalStatus, RentalType, Vehicle, Customer } from '@/types'

const rentals = ref<Rental[]>([])
const vehicleMap = ref<Map<number, Vehicle>>(new Map())
const customerMap = ref<Map<number, Customer>>(new Map())
const loading = ref(true)
const statusFilter = ref<RentalStatus | ''>('')
const typeFilter = ref<RentalType | ''>('')
const customerTypeFilter = ref<CustomerType | ''>('')

const { page, size, totalElements, setPage, setTotal, getParams } = usePagination()
const toast = useToast()

const statusOptions: { value: RentalStatus | '', label: string }[] = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'DRAFT', label: 'Taslak' },
  { value: 'RESERVED', label: 'Rezerve' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'RETURN_PENDING', label: 'İade Bekliyor' },
  { value: 'OVERDUE', label: 'Gecikmiş' },
  { value: 'CLOSED', label: 'Tamamlandı' },
  { value: 'CANCELLED', label: 'İptal' }
]

const typeOptions: { value: RentalType | '', label: string }[] = [
  { value: '', label: 'Tüm Tipler' },
  { value: 'DAILY', label: 'Günlük' },
  { value: 'WEEKLY', label: 'Haftalık' },
  { value: 'MONTHLY', label: 'Aylık' },
  { value: 'LEASING', label: 'Leasing' }
]

const customerTypeOptions: { value: CustomerType | '', label: string }[] = [
  { value: '', label: 'Tüm Müşteriler' },
  { value: CustomerType.PERSONAL, label: '👤 Bireysel' },
  { value: CustomerType.COMPANY, label: '🏢 Kurumsal' }
]

const statusLabels: Record<RentalStatus, string> = {
  DRAFT: 'Taslak',
  RESERVED: 'Rezerve',
  ACTIVE: 'Aktif',
  RETURN_PENDING: 'İade Bekliyor',
  OVERDUE: 'Gecikmiş',
  CLOSED: 'Tamamlandı',
  CANCELLED: 'İptal'
}

const statusColors: Record<RentalStatus, string> = {
  DRAFT: 'secondary',
  RESERVED: 'info',
  ACTIVE: 'success',
  RETURN_PENDING: 'warning',
  OVERDUE: 'danger',
  CLOSED: 'muted',
  CANCELLED: 'danger'
}

const typeLabels: Record<RentalType, string> = {
  DAILY: 'Günlük',
  WEEKLY: 'Haftalık',
  MONTHLY: 'Aylık',
  LEASING: 'Leasing'
}

function getVehicle(rental: Rental): Vehicle | undefined {
  return rental.vehicle || vehicleMap.value.get(rental.vehicleId)
}

function getCustomer(rental: Rental): Customer | undefined {
  return rental.customer || customerMap.value.get(rental.customerId)
}

const filteredRentals = computed(() => {
  let result = rentals.value

  if (statusFilter.value) {
    result = result.filter(r => r.status === statusFilter.value)
  }

  if (typeFilter.value) {
    result = result.filter(r => r.rentalType === typeFilter.value)
  }

  if (customerTypeFilter.value) {
    result = result.filter(r => {
      const customer = getCustomer(r)
      return customer?.customerType === customerTypeFilter.value
    })
  }

  return result
})

async function fetchRentals() {
  loading.value = true
  try {
    const params = { ...getParams(), status: statusFilter.value || undefined }
    const response = await rentalsApi.getAll(params)
    rentals.value = response.content
    setTotal(response.totalElements, response.totalPages)
    await fetchRelatedData()
  } catch {
    toast.error('Kiralamalar yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

async function fetchRelatedData() {
  const vehicleIds = [...new Set(rentals.value.filter(r => r.vehicleId && !r.vehicle).map(r => r.vehicleId))]
  const customerIds = [...new Set(rentals.value.filter(r => r.customerId && !r.customer).map(r => r.customerId))]

  const promises: Promise<void>[] = []

  for (const id of vehicleIds) {
    promises.push(
      vehiclesApi.getById(id)
        .then(v => vehicleMap.value.set(id, v))
        .catch(() => {})
    )
  }

  for (const id of customerIds) {
    promises.push(
      customersApi.getById(id)
        .then(c => customerMap.value.set(id, c))
        .catch(() => {})
    )
  }

  await Promise.all(promises)
}

function handlePageChange(newPage: number) {
  setPage(newPage)
  fetchRentals()
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR')
}

function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
}

onMounted(fetchRentals)
</script>

<template>
  <div class="rentals-page">
    <header class="page-header">
      <div class="header-left">
        <h1>Kiralamalar</h1>
        <span class="count">{{ totalElements }} kiralama</span>
      </div>
      <RouterLink to="/rentals/create" class="btn btn-primary">
        + Yeni Kiralama
      </RouterLink>
    </header>

    <div class="filters">
      <select v-model="statusFilter" class="filter-select" @change="fetchRentals">
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select v-model="typeFilter" class="filter-select">
        <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select v-model="customerTypeFilter" class="filter-select">
        <option v-for="opt in customerTypeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="filteredRentals.length === 0" class="empty-state">
      <p>Kiralama bulunamadı</p>
    </div>

    <div v-else class="rentals-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Müşteri</th>
            <th>Araç</th>
            <th>Tip</th>
            <th>Tarih Aralığı</th>
            <th>Toplam</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="rental in filteredRentals" 
            :key="rental.id"
            @click="$router.push(`/rentals/${rental.id}`)"
          >
            <td class="rental-id">{{ rental.rentalNumber || `#${rental.id}` }}</td>
            <td>
              <div class="customer-cell">
                <div class="customer-name">
                  <span v-if="getCustomer(rental)?.customerType === 'COMPANY'" class="customer-icon">🏢</span>
                  <span v-else class="customer-icon">👤</span>
                  <strong>{{ getCustomer(rental)?.displayName || '-' }}</strong>
                </div>
                <span :class="['customer-type-badge', getCustomer(rental)?.customerType === 'COMPANY' ? 'company' : 'personal']">
                  {{ getCustomer(rental)?.customerType === 'COMPANY' ? 'Kurumsal' : 'Bireysel' }}
                </span>
              </div>
            </td>
            <td>
              <div class="vehicle-cell">
                <strong>{{ getVehicle(rental)?.plateNumber || '-' }}</strong>
                <span>{{ getVehicle(rental) ? `${getVehicle(rental)?.brand} ${getVehicle(rental)?.model}` : '-' }}</span>
              </div>
            </td>
            <td>
              <span class="type-badge">{{ typeLabels[rental.rentalType] || rental.rentalType }}</span>
            </td>
            <td>
              <div class="date-range">
                <span>{{ formatDate(rental.startDate) }}</span>
                <span class="separator">→</span>
                <span>{{ formatDate(rental.endDate) }}</span>
              </div>
            </td>
            <td class="amount">{{ formatCurrency(rental.grandTotal) }}</td>
            <td>
              <span :class="['status-badge', statusColors[rental.status] || 'muted']">
                {{ statusLabels[rental.status] || rental.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && filteredRentals.length > 0" class="pagination">
      <button :disabled="page === 0" @click="handlePageChange(page - 1)">
        ← Önceki
      </button>
      <span>Sayfa {{ page + 1 }}</span>
      <button :disabled="filteredRentals.length < size" @click="handlePageChange(page + 1)">
        Sonraki →
      </button>
    </div>
  </div>
</template>

<style scoped>
.rentals-page {
  max-width: 1400px;
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

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.filters {
  display: flex;
  gap: 16px;
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

.rentals-table {
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

tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}

tbody tr:hover {
  background: var(--color-bg-secondary);
}

tbody tr:last-child td {
  border-bottom: none;
}

.rental-id {
  font-weight: 600;
  color: var(--color-primary);
}

.customer-cell,
.vehicle-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.customer-icon {
  font-size: 14px;
}

.customer-cell strong,
.vehicle-cell strong {
  font-weight: 500;
}

.customer-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.customer-type-badge.company {
  background: var(--color-info-light);
  color: var(--color-info);
}

.customer-type-badge.personal {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.vehicle-cell {
  gap: 2px;
}

.vehicle-cell span:last-child {
  font-size: 12px;
  color: var(--color-text-muted);
}

.type-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.separator {
  color: var(--color-text-muted);
}

.amount {
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success { background: var(--color-success-light); color: var(--color-success); }
.status-badge.warning { background: var(--color-warning-light); color: var(--color-warning); }
.status-badge.info { background: var(--color-info-light); color: var(--color-info); }
.status-badge.primary { background: var(--color-primary-light); color: var(--color-primary); }
.status-badge.danger { background: var(--color-danger-light); color: var(--color-danger); }
.status-badge.muted { background: var(--color-bg-secondary); color: var(--color-text-muted); }
.status-badge.secondary { background: #f3f4f6; color: #4b5563; }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
