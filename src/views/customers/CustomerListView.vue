<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { customersApi } from '@/api'
import { usePagination, useToast } from '@/composables'
import type { Customer, CustomerType } from '@/types'

const customers = ref<Customer[]>([])
const loading = ref(true)
const searchQuery = ref('')
const typeFilter = ref<CustomerType | ''>('')

const { page, size, totalElements, setPage, setTotal, getParams } = usePagination()
const toast = useToast()

const typeOptions: { value: CustomerType | '', label: string }[] = [
  { value: '', label: 'Tüm Müşteriler' },
  { value: 'PERSONAL', label: 'Bireysel' },
  { value: 'COMPANY', label: 'Kurumsal' }
]

const typeLabels: Record<CustomerType, string> = {
  PERSONAL: 'Bireysel',
  COMPANY: 'Kurumsal'
}

const filteredCustomers = computed(() => {
  let result = customers.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c => 
      c.displayName?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    )
  }

  if (typeFilter.value) {
    result = result.filter(c => c.customerType === typeFilter.value)
  }

  return result
})

async function fetchCustomers() {
  loading.value = true
  try {
    const response = await customersApi.getAll(getParams())
    customers.value = response.content
    setTotal(response.totalElements, response.totalPages)
  } catch {
    toast.error('Müşteriler yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

function handlePageChange(newPage: number) {
  setPage(newPage)
  fetchCustomers()
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
  }
  return phone
}

onMounted(fetchCustomers)
</script>

<template>
  <div class="customers-page">
    <header class="page-header">
      <div class="header-left">
        <h1>Müşteriler</h1>
        <span class="count">{{ totalElements }} müşteri</span>
      </div>
      <div class="header-actions">
        <RouterLink to="/customers/new" class="btn btn-primary">
          + Müşteri Ekle
        </RouterLink>
      </div>
    </header>

    <div class="filters">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="İsim, telefon veya e-posta ara..."
        />
      </div>
      <select v-model="typeFilter" class="filter-select">
        <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="filteredCustomers.length === 0" class="empty-state">
      <p>Müşteri bulunamadı</p>
    </div>

    <div v-else class="customers-table">
      <table>
        <thead>
          <tr>
            <th>Müşteri</th>
            <th>Tip</th>
            <th>Telefon</th>
            <th>E-posta</th>
            <th>Şehir</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="customer in filteredCustomers" 
            :key="customer.id"
            @click="$router.push(`/customers/${customer.id}`)"
          >
            <td class="customer-name">
              <span class="avatar">{{ customer.displayName?.charAt(0) || '?' }}</span>
              <div>
                <strong>{{ customer.displayName }}</strong>
                <span class="id">{{ customer.publicId }}</span>
              </div>
            </td>
            <td>
              <span :class="['type-badge', customer.customerType.toLowerCase()]">
                {{ typeLabels[customer.customerType] }}
              </span>
            </td>
            <td>{{ formatPhone(customer.phone) }}</td>
            <td>{{ customer.email }}</td>
            <td>{{ customer.city }}</td>
            <td>
              <span v-if="customer.blacklisted" class="status-badge danger">
                Kara Liste
              </span>
              <span v-else class="status-badge success">
                Aktif
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && filteredCustomers.length > 0" class="pagination">
      <button :disabled="page === 0" @click="handlePageChange(page - 1)">
        ← Önceki
      </button>
      <span>Sayfa {{ page + 1 }}</span>
      <button :disabled="filteredCustomers.length < size" @click="handlePageChange(page + 1)">
        Sonraki →
      </button>
    </div>
  </div>
</template>

<style scoped>
.customers-page {
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

.header-actions {
  display: flex;
  gap: 12px;
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
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.search-box {
  flex: 1;
  max-width: 400px;
}

.search-box input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-surface);
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-surface);
}

.loading,
.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.customers-table {
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

.customer-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.customer-name strong {
  display: block;
}

.customer-name .id {
  font-size: 12px;
  color: var(--color-text-muted);
}

.type-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.personal {
  background: #dbeafe;
  color: #1d4ed8;
}

.type-badge.company {
  background: #f3e8ff;
  color: #7c3aed;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.status-badge.danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

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
