<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { vehiclesApi, vehicleCategoriesApi } from '@/api'
import { SearchableSelect } from '@/components/common'
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
  'vehicle-selected': [vehicleId: number, categoryId: number, vehicle: Vehicle]
}>()

const loading = ref(false)
const vehicles = ref<Vehicle[]>([])
const categories = ref<VehicleCategory[]>([])
const searchQuery = ref('')
const selectedCategoryId = ref<number | null>(null)

const categoryOptions = computed(() => [
  ...categories.value.map(c => ({ value: c.id as number, label: c.name }))
])

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
  emit('vehicle-selected', vehicle.id, vehicle.categoryId, vehicle)
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
  const baseDailyPrice = safeNumber(vehicle.dailyPrice)
  switch (props.rentalType) {
    case 'LEASING':
    case 'MONTHLY':
      return vehicle.monthlyPrice ?? baseDailyPrice * 30
    case 'WEEKLY':
      return vehicle.weeklyPrice ?? baseDailyPrice * 7
    case 'DAILY':
    default:
      return baseDailyPrice
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
  <div class="vehicle-selector rcr-vehicle-selector">
    <div class="selector-header">
      <div class="filters">
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Marka, model veya plaka ara..."
          />
        </div>
        <SearchableSelect
          v-model="selectedCategoryId"
          :options="categoryOptions"
          placeholder="Tüm Kategoriler"
          search-placeholder="Kategori ara..."
          clearable
          class="category-filter-searchable"
        />
      </div>
      <div class="result-count">
        {{ filteredVehicles.length }} araç bulundu
      </div>
    </div>

    <div v-if="selectedVehicle" class="selected-vehicle-card">
      <div class="selected-badge">Seçili Araç</div>
      <div class="selected-info">
        <div class="vehicle-image-placeholder">
          <img v-if="selectedVehicle.imageUrl" :src="selectedVehicle.imageUrl" :alt="selectedVehicle.brand" class="vehicle-thumb" />
          <span v-else>{{ selectedVehicle.brand.charAt(0) }}</span>
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
            <img v-if="vehicle.imageUrl" :src="vehicle.imageUrl" :alt="vehicle.brand" class="vehicle-thumb" />
            <span v-else class="brand-initial">{{ vehicle.brand.charAt(0) }}</span>
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
