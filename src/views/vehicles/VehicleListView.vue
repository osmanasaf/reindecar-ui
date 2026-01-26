<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { vehiclesApi } from '@/api'
import { usePagination, useToast } from '@/composables'
import type { Vehicle, VehicleStatus } from '@/types'

const vehicles = ref<Vehicle[]>([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref<VehicleStatus | ''>('')

const { page, size, totalElements, setPage, setTotal, getParams } = usePagination()
const toast = useToast()

const statusOptions: { value: VehicleStatus | '', label: string }[] = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'AVAILABLE', label: 'Müsait' },
  { value: 'RENTED', label: 'Kirada' },
  { value: 'MAINTENANCE', label: 'Bakımda' },
  { value: 'RESERVED', label: 'Rezerve' }
]

const statusLabels: Record<VehicleStatus, string> = {
  AVAILABLE: 'Müsait',
  RENTED: 'Kirada',
  MAINTENANCE: 'Bakımda',
  RESERVED: 'Rezerve',
  OUT_OF_SERVICE: 'Hizmet Dışı'
}

const statusColors: Record<VehicleStatus, string> = {
  AVAILABLE: 'success',
  RENTED: 'warning',
  MAINTENANCE: 'info',
  RESERVED: 'primary',
  OUT_OF_SERVICE: 'danger'
}

const filteredVehicles = computed(() => {
  let result = vehicles.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(v => 
      v.plateNumber.toLowerCase().includes(query) ||
      v.brand.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query)
    )
  }

  if (statusFilter.value) {
    result = result.filter(v => v.status === statusFilter.value)
  }

  return result
})

async function fetchVehicles() {
  loading.value = true
  try {
    const response = await vehiclesApi.getAll(getParams())
    vehicles.value = response.content
    setTotal(response.totalElements, response.totalPages)
  } catch {
    toast.error('Araçlar yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

function handlePageChange(newPage: number) {
  setPage(newPage)
  fetchVehicles()
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

onMounted(fetchVehicles)
</script>

<template>
  <div class="vehicles-page">
    <header class="page-header">
      <div class="header-left">
        <h1>Araçlar</h1>
        <span class="count">{{ totalElements }} araç</span>
      </div>
      <RouterLink to="/vehicles/new" class="btn btn-primary">
        ➕ Yeni Araç
      </RouterLink>
    </header>

    <div class="filters">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Plaka, marka veya model ara..."
        />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="loading">
      Yükleniyor...
    </div>

    <div v-else-if="filteredVehicles.length === 0" class="empty-state">
      <p>Araç bulunamadı</p>
    </div>

    <div v-else class="vehicles-grid">
      <RouterLink 
        v-for="vehicle in filteredVehicles" 
        :key="vehicle.id"
        :to="`/vehicles/${vehicle.id}`"
        class="vehicle-card"
      >
        <div class="card-header">
          <span class="plate">{{ vehicle.plateNumber }}</span>
          <span :class="['status-badge', statusColors[vehicle.status]]">
            {{ statusLabels[vehicle.status] }}
          </span>
        </div>
        
        <div class="card-body">
          <h3>{{ vehicle.brand }} {{ vehicle.model }}</h3>
          <div class="details">
            <span>{{ vehicle.year }}</span>
            <span>{{ vehicle.color }}</span>
            <span>{{ vehicle.fuelType }}</span>
          </div>
        </div>

        <div class="card-footer">
          <div class="km">{{ formatKm(vehicle.currentKm) }}</div>
          <div class="branch">{{ vehicle.branch?.name || '-' }}</div>
        </div>
      </RouterLink>
    </div>

    <div v-if="!loading && filteredVehicles.length > 0" class="pagination">
      <button 
        :disabled="page === 0"
        @click="handlePageChange(page - 1)"
      >
        ← Önceki
      </button>
      <span>Sayfa {{ page + 1 }}</span>
      <button 
        :disabled="filteredVehicles.length < size"
        @click="handlePageChange(page + 1)"
      >
        Sonraki →
      </button>
    </div>
  </div>
</template>

<style scoped>
.vehicles-page {
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

.btn-primary:hover {
  background: var(--color-primary-hover);
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

.search-box input:focus {
  outline: none;
  border-color: var(--color-primary);
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

.vehicles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.vehicle-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.vehicle-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.plate {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success { background: var(--color-success-light); color: var(--color-success); }
.status-badge.warning { background: var(--color-warning-light); color: var(--color-warning); }
.status-badge.info { background: var(--color-info-light); color: var(--color-info); }
.status-badge.primary { background: var(--color-primary-light); color: var(--color-primary); }
.status-badge.danger { background: var(--color-danger-light); color: var(--color-danger); }

.card-body h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.details {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
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
