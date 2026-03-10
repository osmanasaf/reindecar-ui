<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { maintenancesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleMaintenanceMap, MaintenanceRecord } from '@/types'
import { MAINTENANCE_COLORS, ZONE_NAMES } from '@/utils/vehicleZones'
import CarDiagramSVG from './CarDiagramSVG.vue'
import CreateMaintenanceForm from './CreateMaintenanceForm.vue'
import MaintenanceDetailModal from './MaintenanceDetailModal.vue'

const props = defineProps<{
  vehicleId: number
  /** Aracın o anki km'si; yeni bakım formunda Güncel KM alanına otomatik doldurulur. */
  initialCurrentKm?: number
}>()

const toast = useToast()
const maintenanceMap = ref<VehicleMaintenanceMap | null>(null)
const loading = ref(false)
const selectedZone = ref<number | undefined>(undefined)
const showCreateForm = ref(false)
const maintenanceForDetailModal = ref<MaintenanceRecord | null>(null)

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

const allMaintenancesSorted = computed(() => {
  if (!maintenanceMap.value) return []
  return [...maintenanceMap.value.maintenances].sort((a, b) =>
    new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime()
  )
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
  return sorted[0]?.maintenanceDate || null
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
  selectedZone.value = selectedZone.value === zoneId ? undefined : zoneId
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
    <!-- Başlık -->
    <div class="map-header">
      <h2 class="map-title">Bakım Haritası</h2>
      <button class="btn btn-primary" @click="showCreateForm = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Bakım Ekle
      </button>
    </div>

    <!-- Yükleniyor -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Bakım haritası yükleniyor...</span>
    </div>

    <template v-else-if="maintenanceMap">
      <!-- İstatistik Satırı -->
      <div class="stats-row">
        <div class="stat-pill">
          <span class="stat-num">{{ maintenanceMap.totalMaintenanceCount }}</span>
          <span class="stat-lbl">Toplam Bakım</span>
        </div>
        <div class="stat-pill stat-cost">
          <span class="stat-num stat-num-sm">{{ formatCurrency(totalMaintenanceCost, 'TRY') }}</span>
          <span class="stat-lbl">Toplam Maliyet</span>
        </div>
        <div class="stat-pill stat-date">
          <span class="stat-num stat-num-sm">{{ lastMaintenanceDate ? formatDate(lastMaintenanceDate) : '-' }}</span>
          <span class="stat-lbl">Son Bakım</span>
        </div>
      </div>

      <!-- Ana İçerik: Sol (Araç) + Sağ (Detay) -->
      <div class="map-body">
        <!-- Sol Panel: Araç Görseli + Legend -->
        <div class="left-panel">
          <div class="diagram-wrap">
            <CarDiagramSVG :zones="zoneConfigs" :selected-zone="selectedZone" />
          </div>
          <div class="legend">
            <p class="legend-title">Bakım Tipleri</p>
            <div class="legend-grid">
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: MAINTENANCE_COLORS.REPAIR }"></span>
                <span>Tamir</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: MAINTENANCE_COLORS.PAINT }"></span>
                <span>Boyama</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: MAINTENANCE_COLORS.PART_REPLACEMENT }"></span>
                <span>Parça</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: MAINTENANCE_COLORS.SERVICE }"></span>
                <span>Servis</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: MAINTENANCE_COLORS.OIL_CHANGE }"></span>
                <span>Yağ</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: MAINTENANCE_COLORS.TIRE_CHANGE }"></span>
                <span>Lastik</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: MAINTENANCE_COLORS.BRAKE_SERVICE }"></span>
                <span>Fren</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: MAINTENANCE_COLORS.OTHER }"></span>
                <span>Diğer</span>
              </div>
            </div>
            <p class="legend-hint">Bölgeye tıklayarak detay görün</p>
          </div>
        </div>

        <!-- Sağ Panel: Detaylar -->
        <div class="right-panel">
          <!-- Zone seçili: o zone'un bakımları -->
          <div v-if="selectedZone" class="detail-panel">
            <div class="detail-header">
              <div class="detail-title-group">
                <span class="zone-badge">{{ selectedZone }}</span>
                <h3 class="detail-title">{{ ZONE_NAMES[selectedZone] }}</h3>
              </div>
              <button class="close-btn" @click="clearSelection" title="Kapat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div v-if="selectedZoneMaintenances.length === 0" class="no-records">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="no-records-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>Bu bölgede bakım kaydı bulunmuyor</p>
            </div>

            <div v-else class="maintenance-list">
              <div
                v-for="maintenance in selectedZoneMaintenances"
                :key="maintenance.id"
                class="maintenance-card"
              >
                <div class="maintenance-card-header">
                  <div class="type-indicator" :style="{ background: maintenance.maintenanceTypeColorCode }"></div>
                  <span class="maintenance-type-text">{{ maintenance.maintenanceTypeDisplayName }}</span>
                  <span class="type-chip" :style="{ background: maintenance.maintenanceTypeColorCode }">
                    {{ maintenance.maintenanceTypeDisplayName }}
                  </span>
                </div>
                <div class="maintenance-card-body">
                  <div class="mi-row">
                    <span class="mi-label">Tarih</span>
                    <span class="mi-value">{{ formatDate(maintenance.maintenanceDate) }}</span>
                  </div>
                  <div class="mi-row">
                    <span class="mi-label">KM</span>
                    <span class="mi-value">{{ formatKm(maintenance.currentKm) }}</span>
                  </div>
                  <div v-if="maintenance.costAmount" class="mi-row">
                    <span class="mi-label">Maliyet</span>
                    <span class="mi-value highlight">{{ formatCurrency(maintenance.costAmount, maintenance.costCurrency) }}</span>
                  </div>
                  <div v-if="maintenance.serviceProvider" class="mi-row">
                    <span class="mi-label">Servis</span>
                    <span class="mi-value">{{ maintenance.serviceProvider }}</span>
                  </div>
                  <div v-if="maintenance.description" class="mi-row">
                    <span class="mi-label">Açıklama</span>
                    <span class="mi-value">{{ maintenance.description }}</span>
                  </div>
                  <div v-if="maintenance.paintColor" class="mi-row">
                    <span class="mi-label">Boya Rengi</span>
                    <span class="mi-value">{{ maintenance.paintColor }}</span>
                  </div>
                  <div v-if="maintenance.partsReplaced.length > 0" class="parts-block">
                    <span class="mi-label">Değiştirilen Parçalar</span>
                    <ul class="parts-list">
                      <li v-for="(part, idx) in maintenance.partsReplaced" :key="idx">{{ part }}</li>
                    </ul>
                  </div>
                </div>
                <div class="maintenance-card-footer">
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    title="Belgeleri görüntüle"
                    @click.stop="maintenanceForDetailModal = maintenance"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" style="width:14px;height:14px">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Belgeleri Gör
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Zone seçili değil: tüm bakımlar listesi -->
          <div v-else class="all-maintenances-panel">
            <div class="all-header">
              <h3 class="detail-title">Tüm Bakımlar</h3>
              <span class="count-badge">{{ allMaintenancesSorted.length }}</span>
            </div>

            <div v-if="allMaintenancesSorted.length === 0" class="no-records">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="no-records-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>Bakım kaydı bulunmuyor</p>
              <p class="no-records-hint">Araç bakımlarını buradan takip edebilirsiniz</p>
            </div>

            <div v-else class="all-maintenance-list">
              <div
                v-for="maintenance in allMaintenancesSorted"
                :key="maintenance.id"
                class="maintenance-row"
                @click="selectZone(maintenance.affectedZones?.[0] ?? 13)"
              >
                <span class="type-dot" :style="{ background: maintenance.maintenanceTypeColorCode }"></span>
                <div class="maintenance-row-info">
                  <span class="maintenance-row-type">{{ maintenance.maintenanceTypeDisplayName }}</span>
                  <span class="maintenance-row-km">{{ formatKm(maintenance.currentKm) }}</span>
                </div>
                <div class="maintenance-row-right">
                  <span class="maintenance-row-date">{{ formatDate(maintenance.maintenanceDate) }}</span>
                  <span v-if="maintenance.costAmount" class="maintenance-row-cost">
                    {{ formatCurrency(maintenance.costAmount, maintenance.costCurrency) }}
                  </span>
                  <button
                    type="button"
                    class="btn-doc-inline"
                    title="Belgeleri gör"
                    @click.stop="maintenanceForDetailModal = maintenance"
                  >
                    Belgeler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <MaintenanceDetailModal
      :maintenance="maintenanceForDetailModal"
      :visible="maintenanceForDetailModal !== null"
      @close="maintenanceForDetailModal = null"
    />

    <CreateMaintenanceForm
      v-if="showCreateForm"
      :vehicle-id="vehicleId"
      :initial-current-km="initialCurrentKm"
      @close="showCreateForm = false"
      @created="handleMaintenanceCreated"
    />
  </div>
</template>

<style scoped>
.maintenance-map {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.map-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-icon {
  width: 15px;
  height: 15px;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37,99,235,0.3);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border, #e5e7eb);
  border-top-color: var(--color-primary, #2563eb);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.stats-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 20px;
  min-width: 120px;
  transition: all 0.2s;
}

.stat-pill:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.stat-cost {
  border-color: #fde68a;
  background: #fffbeb;
}

.stat-date {
  border-color: #c7d2fe;
  background: #eef2ff;
}

.stat-num {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.stat-num-sm {
  font-size: 1rem;
}

.stat-lbl {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
  text-align: center;
}

.map-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  align-items: start;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.diagram-wrap {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px 16px;
}

.legend {
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 12px;
  padding: 14px;
}

.legend-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.legend-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.1);
}

.legend-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted, #9ca3af);
  margin: 10px 0 0 0;
  text-align: center;
  font-style: italic;
}

.right-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
  min-height: 400px;
}

.detail-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary, #f9fafb);
}

.detail-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.zone-badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--color-primary);
  color: white;
  font-size: 0.875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: all 0.15s;
}

.close-btn svg {
  width: 16px;
  height: 16px;
}

.close-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.no-records {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--color-text-secondary);
  text-align: center;
  gap: 8px;
}

.no-records-icon {
  width: 3rem;
  height: 3rem;
  color: var(--color-text-muted, #9ca3af);
  margin-bottom: 4px;
}

.no-records p {
  margin: 0;
  font-size: 0.9375rem;
}

.no-records-hint {
  font-size: 0.8125rem !important;
  color: var(--color-text-muted, #9ca3af) !important;
}

.maintenance-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 520px;
  overflow-y: auto;
}

.maintenance-card {
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.maintenance-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.type-indicator {
  width: 4px;
  height: 20px;
  border-radius: 2px;
  flex-shrink: 0;
}

.maintenance-type-text {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text);
  flex: 1;
}

.type-chip {
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.maintenance-card-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.maintenance-card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.btn-outline {
  background: transparent;
  color: var(--color-primary, #2563eb);
  border: 1px solid var(--color-primary, #2563eb);
}

.btn-outline:hover {
  background: rgba(37, 99, 235, 0.08);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8125rem;
}

.mi-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.875rem;
}

.mi-label {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.mi-value {
  color: var(--color-text);
  font-weight: 500;
  text-align: right;
}

.mi-value.highlight {
  color: var(--color-primary);
  font-weight: 700;
}

.parts-block {
  margin-top: 6px;
}

.parts-list {
  margin: 4px 0 0 0;
  padding-left: 18px;
}

.parts-list li {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.all-maintenances-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.all-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary, #f9fafb);
}

.count-badge {
  background: var(--color-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
}

.all-maintenance-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 520px;
  overflow-y: auto;
}

.maintenance-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.maintenance-row:hover {
  background: var(--color-bg-secondary, #f9fafb);
  border-color: var(--color-border);
}

.type-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.1);
}

.maintenance-row-info {
  flex: 1;
  min-width: 0;
}

.maintenance-row-type {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.maintenance-row-km {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 1px;
}

.maintenance-row-right {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-doc-inline {
  padding: 4px 8px;
  font-size: 0.75rem;
  background: var(--color-primary, #2563eb);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-doc-inline:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.maintenance-row-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.maintenance-row-cost {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
}

@media (max-width: 900px) {
  .map-body {
    grid-template-columns: 1fr;
  }

  .left-panel {
    flex-direction: row;
    align-items: flex-start;
  }

  .diagram-wrap {
    flex: 0 0 180px;
  }

  .legend {
    flex: 1;
  }
}

@media (max-width: 600px) {
  .left-panel {
    flex-direction: column;
  }

  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
