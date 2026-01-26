<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { vehiclesApi, vehicleCategoriesApi } from '@/api'
import type { Vehicle, VehicleCategory, RentalType } from '@/types'

interface Props {
  startDate: string
  endDate: string
  rentalType: RentalType
  modelValue: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  'vehicle-selected': [vehicleId: number, categoryId: number]
}>()

const loading = ref(false)
const vehicles = ref<Vehicle[]>([])
const categories = ref<VehicleCategory[]>([])
const searchQuery = ref('')
const selectedCategoryId = ref<number | null>(null)

const filteredVehicles = computed(() => {
  let result = vehicles.value

  if (selectedCategoryId.value) {
    result = result.filter(v => v.categoryId === selectedCategoryId.value)
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(v => 
      v.brand.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.plateNumber.toLowerCase().includes(query)
    )
  }

  return result
})

const selectedVehicle = computed(() => {
  if (!props.modelValue) return null
  return vehicles.value.find(v => v.id === props.modelValue) || null
})

async function fetchVehicles() {
  loading.value = true
  try {
    if (props.startDate && props.endDate) {
      vehicles.value = await vehiclesApi.getAvailableForPeriod(props.startDate, props.endDate)
    } else {
      vehicles.value = await vehiclesApi.getAvailable()
    }
  } catch {
    vehicles.value = []
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    categories.value = await vehicleCategoriesApi.getAll()
  } catch {
    categories.value = []
  }
}

function selectVehicle(vehicle: Vehicle) {
  emit('update:modelValue', vehicle.id)
  emit('vehicle-selected', vehicle.id, vehicle.categoryId)
}

function clearSelection() {
  emit('update:modelValue', null)
}

function safeNumber(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue
  const num = Number(value)
  return Number.isNaN(num) ? defaultValue : num
}

function formatCurrency(amount: unknown): string {
  const num = safeNumber(amount)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num)
}

function formatKm(km: unknown): string {
  const num = safeNumber(km)
  return new Intl.NumberFormat('tr-TR').format(num) + ' km'
}

const fuelTypeLabels: Record<string, string> = {
  GASOLINE: 'Benzin',
  DIESEL: 'Dizel',
  ELECTRIC: 'Elektrik',
  HYBRID: 'Hibrit',
  LPG: 'LPG'
}

const transmissionLabels: Record<string, string> = {
  MANUAL: 'Manuel',
  AUTOMATIC: 'Otomatik'
}

const priceUnitLabel = computed(() => {
  switch (props.rentalType) {
    case 'LEASING':
    case 'MONTHLY':
      return '/ ay'
    case 'WEEKLY':
      return '/ hafta'
    case 'DAILY':
    default:
      return '/ gün'
  }
})

function getVehiclePrice(vehicle: Vehicle): number {
  switch (props.rentalType) {
    case 'LEASING':
    case 'MONTHLY':
      return vehicle.monthlyPrice ?? vehicle.dailyPrice * 30
    case 'WEEKLY':
      return vehicle.weeklyPrice ?? vehicle.dailyPrice * 7
    case 'DAILY':
    default:
      return vehicle.dailyPrice
  }
}

onMounted(() => {
  fetchCategories()
  fetchVehicles()
})

watch([() => props.startDate, () => props.endDate], () => {
  if (props.startDate && props.endDate) {
    fetchVehicles()
  }
})
</script>

<template>
  <div class="vehicle-selector">
    <div class="selector-header">
      <div class="filters">
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Marka, model veya plaka ara..."
          />
        </div>
        <select v-model="selectedCategoryId" class="category-filter">
          <option :value="null">Tüm Kategoriler</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>
      <div class="result-count">
        {{ filteredVehicles.length }} araç bulundu
      </div>
    </div>

    <div v-if="selectedVehicle" class="selected-vehicle-card">
      <div class="selected-badge">Seçili Araç</div>
      <div class="selected-info">
        <div class="vehicle-image-placeholder">
          <span>{{ selectedVehicle.brand.charAt(0) }}</span>
        </div>
        <div class="vehicle-details">
          <h4>{{ selectedVehicle.brand }} {{ selectedVehicle.model }}</h4>
          <p class="plate">{{ selectedVehicle.plateNumber }}</p>
          <p class="specs">
            {{ selectedVehicle.year }} · {{ fuelTypeLabels[selectedVehicle.fuelType] }} · {{ transmissionLabels[selectedVehicle.transmission] }}
          </p>
        </div>
        <div class="selected-price">
          <span class="price">{{ formatCurrency(getVehiclePrice(selectedVehicle)) }}</span>
          <span class="per-day">{{ priceUnitLabel }}</span>
        </div>
        <button class="clear-btn" @click="clearSelection">Değiştir</button>
      </div>
    </div>

    <div v-else class="vehicles-grid">
      <div v-if="loading" class="loading-state">
        <div v-for="i in 6" :key="i" class="skeleton-card"></div>
      </div>

      <template v-else-if="filteredVehicles.length > 0">
        <div 
          v-for="vehicle in filteredVehicles" 
          :key="vehicle.id"
          class="vehicle-card"
          :class="{ selected: modelValue === vehicle.id }"
          @click="selectVehicle(vehicle)"
        >
          <div class="vehicle-image">
            <span class="brand-initial">{{ vehicle.brand.charAt(0) }}</span>
          </div>
          <div class="vehicle-info">
            <h4>{{ vehicle.brand }} {{ vehicle.model }}</h4>
            <p class="plate">{{ vehicle.plateNumber }}</p>
            <div class="specs">
              <span>{{ vehicle.year }}</span>
              <span>{{ fuelTypeLabels[vehicle.fuelType] }}</span>
              <span>{{ transmissionLabels[vehicle.transmission] }}</span>
            </div>
            <div class="meta">
              <span class="km">{{ formatKm(vehicle.currentKm) }}</span>
              <span class="category">{{ vehicle.categoryName }}</span>
            </div>
          </div>
          <div class="vehicle-price">
            <span class="amount">{{ formatCurrency(getVehiclePrice(vehicle)) }}</span>
            <span class="unit">{{ priceUnitLabel }}</span>
          </div>
          <button class="select-btn">Seç</button>
        </div>
      </template>

      <div v-else class="empty-state">
        <p>Kriterlere uygun araç bulunamadı</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vehicle-selector {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filters {
  display: flex;
  gap: 12px;
  flex: 1;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-box input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
}

.search-box input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.category-filter {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
  min-width: 160px;
}

.result-count {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.selected-vehicle-card {
  background: var(--color-primary-light);
  border: 2px solid var(--color-primary);
  border-radius: 12px;
  padding: 20px;
  position: relative;
}

.selected-badge {
  position: absolute;
  top: -10px;
  left: 16px;
  background: var(--color-primary);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.vehicle-image-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
}

.vehicle-details {
  flex: 1;
}

.vehicle-details h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.vehicle-details .plate {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 4px 0;
  font-family: monospace;
}

.vehicle-details .specs {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.selected-price {
  text-align: right;
}

.selected-price .price {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
}

.selected-price .per-day {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.clear-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--color-primary);
  color: white;
}

.vehicles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.loading-state {
  display: contents;
}

.skeleton-card {
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.vehicle-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vehicle-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.vehicle-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.vehicle-image {
  width: 100%;
  height: 120px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-initial {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-text-muted);
  opacity: 0.3;
}

.vehicle-info h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.vehicle-info .plate {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: monospace;
  margin: 4px 0;
}

.vehicle-info .specs {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.vehicle-info .specs span {
  padding: 2px 8px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
}

.vehicle-info .meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 8px;
}

.vehicle-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.vehicle-price .amount {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.vehicle-price .unit {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.select-btn {
  width: 100%;
  padding: 10px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.select-btn:hover {
  background: var(--color-primary-hover);
}

.vehicle-card.selected .select-btn {
  background: var(--color-success);
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-secondary);
}

@media (max-width: 640px) {
  .filters {
    flex-direction: column;
  }
  
  .search-box {
    max-width: none;
  }
}
</style>
