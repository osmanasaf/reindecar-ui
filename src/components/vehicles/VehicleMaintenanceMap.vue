<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { maintenancesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleMaintenanceMap, MaintenanceRecord } from '@/types'
import { MAINTENANCE_COLORS, ZONE_NAMES } from '@/utils/vehicleZones'
import CarDiagramSVG from './CarDiagramSVG.vue'
import CreateMaintenanceForm from './CreateMaintenanceForm.vue'

const props = defineProps<{
  vehicleId: number
}>()

const toast = useToast()
const maintenanceMap = ref<VehicleMaintenanceMap | null>(null)
const loading = ref(false)
const selectedZone = ref<number | undefined>(undefined)
const showCreateForm = ref(false)

const zoneConfigs = computed(() => {
  if (!maintenanceMap.value) return {}
  
  const configs: Record<number, { color: string; onClick: () => void }> = {}
  const allZones = [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13]
  
  allZones.forEach(zoneId => {
    const zoneInfo = maintenanceMap.value!.zones[zoneId]
    configs[zoneId] = {
      color: zoneInfo?.colorCode || '#E0E0E0',
      onClick: () => selectZone(zoneId)
    }
  })
  
  return configs
})

const selectedZoneMaintenances = computed(() => {
  if (!selectedZone.value || !maintenanceMap.value) return []
  const zoneInfo = maintenanceMap.value.zones[selectedZone.value]
  if (!zoneInfo) return []
  return maintenanceMap.value.maintenances.filter(m => zoneInfo.maintenanceIds.includes(m.id))
})

const totalMaintenanceCost = computed(() => {
  if (!maintenanceMap.value) return 0
  return maintenanceMap.value.maintenances
    .reduce((sum, m) => sum + (m.costAmount || 0), 0)
})

const lastMaintenanceDate = computed(() => {
  if (!maintenanceMap.value || maintenanceMap.value.maintenances.length === 0) return null
  const sorted = [...maintenanceMap.value.maintenances].sort((a, b) => 
    new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime()
  )
  return sorted[0].maintenanceDate
})

async function fetchMaintenanceMap() {
  loading.value = true
  try {
    maintenanceMap.value = await maintenancesApi.getVehicleMaintenanceMap(props.vehicleId)
  } catch {
    toast.error('Bakım haritası yüklenemedi')
  } finally {
    loading.value = false
  }
}

function selectZone(zoneId: number) {
  selectedZone.value = zoneId
}

function clearSelection() {
  selectedZone.value = undefined
}

function handleMaintenanceCreated() {
  showCreateForm.value = false
  fetchMaintenanceMap()
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR')
}

function formatCurrency(amount: number | null, currency: string | null): string {
  if (!amount) return '-'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY'
  }).format(amount)
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

onMounted(() => {
  fetchMaintenanceMap()
})
</script>

<template>
  <div class="maintenance-map">
    <div class="map-header">
      <h2>Bakım Haritası</h2>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showCreateForm = true">
          + Bakım Ekle
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="maintenanceMap" class="map-content">
      <!-- Özet İstatistikler -->
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-icon maintenance-icon">🔧</div>
          <div class="stat-info">
            <span class="stat-value">{{ maintenanceMap.totalMaintenanceCount }}</span>
            <span class="stat-label">Toplam Bakım</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon cost-icon">💰</div>
          <div class="stat-info">
            <span class="stat-value">{{ formatCurrency(totalMaintenanceCost, 'TRY') }}</span>
            <span class="stat-label">Toplam Bakım Maliyeti</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon date-icon">📅</div>
          <div class="stat-info">
            <span class="stat-value">{{ lastMaintenanceDate ? formatDate(lastMaintenanceDate) : '-' }}</span>
            <span class="stat-label">Son Bakım</span>
          </div>
        </div>
      </div>

      <div class="map-section">
        <div class="car-diagram-container">
          <CarDiagramSVG :zones="zoneConfigs" :selected-zone="selectedZone" />
        </div>

        <div class="legend">
          <h3>Bakım Tipleri</h3>
          <div class="legend-items">
            <div class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: MAINTENANCE_COLORS.REPAIR }"></span>
              <span>Tamir</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: MAINTENANCE_COLORS.PAINT }"></span>
              <span>Boyama</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: MAINTENANCE_COLORS.PART_REPLACEMENT }"></span>
              <span>Parça Değişimi</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: MAINTENANCE_COLORS.SERVICE }"></span>
              <span>Servis</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: MAINTENANCE_COLORS.OTHER }"></span>
              <span>Diğer</span>
            </div>
          </div>
        </div>
      </div>

      <div class="details-section">
        <div v-if="selectedZone" class="zone-details">
          <div class="zone-header">
            <h3>{{ ZONE_NAMES[selectedZone] }}</h3>
            <button class="btn-close" @click="clearSelection">×</button>
          </div>

          <div v-if="selectedZoneMaintenances.length === 0" class="no-maintenances">
            Bu bölgede bakım kaydı bulunmuyor.
          </div>

          <div v-else class="maintenance-list">
            <div
              v-for="maintenance in selectedZoneMaintenances"
              :key="maintenance.id"
              class="maintenance-card"
            >
              <div class="maintenance-header">
                <span class="maintenance-type">{{ maintenance.maintenanceTypeDisplayName }}</span>
                <span 
                  class="type-badge"
                  :style="{ backgroundColor: maintenance.maintenanceTypeColorCode }"
                >
                  {{ maintenance.maintenanceTypeDisplayName }}
                </span>
              </div>
              <div class="maintenance-body">
                <p><strong>Tarih:</strong> {{ formatDate(maintenance.maintenanceDate) }}</p>
                <p><strong>KM:</strong> {{ formatKm(maintenance.currentKm) }}</p>
                <p v-if="maintenance.costAmount">
                  <strong>Maliyet:</strong> 
                  {{ formatCurrency(maintenance.costAmount, maintenance.costCurrency) }}
                </p>
                <p v-if="maintenance.serviceProvider">
                  <strong>Servis:</strong> {{ maintenance.serviceProvider }}
                </p>
                <p v-if="maintenance.description">
                  <strong>Açıklama:</strong> {{ maintenance.description }}
                </p>
                <div v-if="maintenance.partsReplaced.length > 0" class="parts-list">
                  <strong>Değiştirilen Parçalar:</strong>
                  <ul>
                    <li v-for="(part, idx) in maintenance.partsReplaced" :key="idx">{{ part }}</li>
                  </ul>
                </div>
                <p v-if="maintenance.paintColor">
                  <strong>Boya Rengi:</strong> {{ maintenance.paintColor }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="no-selection">
          <p>Detayları görmek için harita üzerinde bir bölgeye tıklayın</p>
          <div class="stats">
            <div class="stat-item">
              <span class="stat-value">{{ maintenanceMap.totalMaintenanceCount }}</span>
              <span class="stat-label">Toplam Bakım Kaydı</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CreateMaintenanceForm
      v-if="showCreateForm"
      :vehicle-id="vehicleId"
      @close="showCreateForm = false"
      @created="handleMaintenanceCreated"
    />
  </div>
</template>

<style scoped>
.maintenance-map {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.map-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.map-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 8px;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--color-bg-secondary);
}

.maintenance-icon {
  background: #E3F2FD;
}

.cost-icon {
  background: #FFE5E5;
}

.date-icon {
  background: #F3E5F5;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.map-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.car-diagram-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.legend {
  background: var(--color-bg-secondary);
  border-radius: 12px;
  padding: 16px;
}

.legend h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.legend-color {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.details-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
}

.zone-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.zone-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-close:hover {
  background: var(--color-bg-secondary);
}

.no-maintenances {
  text-align: center;
  padding: 40px;
  color: var(--color-text-secondary);
}

.maintenance-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.maintenance-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
}

.maintenance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.maintenance-type {
  font-weight: 600;
  font-size: 15px;
}

.type-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: white;
}

.maintenance-body p {
  margin: 8px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.parts-list {
  margin: 12px 0;
}

.parts-list ul {
  margin: 4px 0 0 0;
  padding-left: 20px;
}

.parts-list li {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.no-selection {
  text-align: center;
  padding: 40px;
}

.no-selection p {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

@media (max-width: 1024px) {
  .stats-summary {
    grid-template-columns: 1fr;
  }

  .map-section {
    grid-template-columns: 1fr;
  }
}
</style>
