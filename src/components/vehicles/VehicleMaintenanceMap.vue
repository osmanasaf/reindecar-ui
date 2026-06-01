<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { maintenancesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleMaintenanceMap, MaintenanceRecord } from '@/types'
import { MAINTENANCE_COLORS, ZONE_NAMES } from '@/utils/vehicleZones'
import { RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
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
  <div class="rc-veh-map">
    <!-- Başlık -->
    <div class="map-header">
      <h2 class="map-title">Bakım Haritası</h2>
      <RcButton variant="accent" size="sm" @click="showCreateForm = true">
        <RcIcon name="plus" />
        Bakım Ekle
      </RcButton>
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
          <div class="rcv-car2-wrap">
            <span class="rcv-car2-wrap__hint">Bölgeye tıklayın</span>
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
                  <RcButton
                    variant="ghost"
                    size="xs"
                    title="Belgeleri görüntüle"
                    @click.stop="maintenanceForDetailModal = maintenance"
                  >
                    <RcIcon name="receipt" />
                    Belgeleri Gör
                  </RcButton>
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
                @click="maintenance.affectedZones && maintenance.affectedZones.length > 0 ? selectZone(maintenance.affectedZones[0]!) : (maintenanceForDetailModal = maintenance)"
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
                  <RcButton
                    variant="ghost"
                    size="xs"
                    title="Belgeleri gör"
                    @click.stop="maintenanceForDetailModal = maintenance"
                  >
                    Belgeler
                  </RcButton>
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
