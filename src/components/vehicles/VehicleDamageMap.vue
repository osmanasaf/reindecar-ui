<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { damagesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleDamageMap } from '@/types'
import { SEVERITY_COLORS, ZONE_NAMES } from '@/utils/vehicleZones'
import CarDiagramSVG from './CarDiagramSVG.vue'
import CreateDamageForm from './CreateDamageForm.vue'

const props = defineProps<{
  vehicleId: number
}>()

const toast = useToast()
const damageMap = ref<VehicleDamageMap | null>(null)
const loading = ref(false)
const selectedZone = ref<number | undefined>(undefined)
const showCreateForm = ref(false)
const includeRepaired = ref(false)

const zoneConfigs = computed(() => {
  if (!damageMap.value) return {}
  
  const configs: Record<number, { color: string; onClick: () => void; opacity?: number }> = {}
  const allZones = [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13]
  
  allZones.forEach(zoneId => {
    const zoneInfo = damageMap.value!.zones[zoneId]
    const isRepairedOnly = zoneInfo && zoneInfo.maxSeverity === null
    configs[zoneId] = {
      color: zoneInfo?.colorCode || '#4CAF50',
      onClick: () => selectZone(zoneId),
      opacity: isRepairedOnly ? 0.6 : 1
    }
  })
  
  return configs
})

const selectedZoneDamages = computed(() => {
  if (!selectedZone.value || !damageMap.value) return []
  const zoneInfo = damageMap.value.zones[selectedZone.value]
  if (!zoneInfo) return []
  return damageMap.value.damages.filter(d => zoneInfo.damageIds.includes(d.id))
})

const totalEstimatedCost = computed(() => {
  if (!damageMap.value) return 0
  return damageMap.value.damages
    .filter(d => !d.repaired)
    .reduce((sum, d) => sum + (d.estimatedCostAmount || 0), 0)
})

const totalRepairCost = computed(() => {
  if (!damageMap.value) return 0
  return damageMap.value.damages
    .filter(d => d.repaired)
    .reduce((sum, d) => sum + (d.repairCostAmount || 0), 0)
})

async function fetchDamageMap() {
  loading.value = true
  try {
    damageMap.value = await damagesApi.getVehicleDamageMap(props.vehicleId, includeRepaired.value)
  } catch {
    toast.error('Hasar haritası yüklenemedi')
  } finally {
    loading.value = false
  }
}

watch(includeRepaired, () => {
  fetchDamageMap()
})

function selectZone(zoneId: number) {
  selectedZone.value = zoneId
}

function clearSelection() {
  selectedZone.value = undefined
}

async function handleMarkRepaired(damageId: number) {
  try {
    await damagesApi.markRepaired(damageId, {
      repairedDate: new Date().toISOString().split('T')[0]
    })
    toast.success('Hasar onarıldı olarak işaretlendi')
    fetchDamageMap()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

function handleDamageCreated() {
  showCreateForm.value = false
  fetchDamageMap()
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

onMounted(() => {
  fetchDamageMap()
})
</script>

<template>
  <div class="damage-map">
    <div class="map-header">
      <h2>Hasar Haritası</h2>
      <div class="header-actions">
        <label class="toggle-label">
          <input type="checkbox" v-model="includeRepaired" />
          <span>Onarılmış hasarları göster</span>
        </label>
        <button class="btn btn-primary" @click="showCreateForm = true">
          + Hasar Ekle
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="damageMap" class="map-content">
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-icon damage-icon">⚠️</div>
          <div class="stat-info">
            <span class="stat-value">{{ damageMap.totalActiveDamages }}</span>
            <span class="stat-label">Aktif Hasar</span>
          </div>
        </div>
        <div v-if="includeRepaired" class="stat-card">
          <div class="stat-icon total-icon">📊</div>
          <div class="stat-info">
            <span class="stat-value">{{ damageMap.totalDamages || damageMap.damages.length }}</span>
            <span class="stat-label">Toplam Hasar</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon cost-icon">💰</div>
          <div class="stat-info">
            <span class="stat-value">{{ formatCurrency(totalEstimatedCost, 'TRY') }}</span>
            <span class="stat-label">Tahmini Toplam Maliyet</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon repair-icon">🔧</div>
          <div class="stat-info">
            <span class="stat-value">{{ formatCurrency(totalRepairCost, 'TRY') }}</span>
            <span class="stat-label">Onarım Maliyeti</span>
          </div>
        </div>
      </div>

      <div class="map-section">
        <div class="car-diagram-container">
          <CarDiagramSVG :zones="zoneConfigs" :selected-zone="selectedZone" />
        </div>

        <div class="legend">
          <h3>Hasar Şiddeti</h3>
          <div class="legend-items">
            <div class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: SEVERITY_COLORS.MINOR }"></span>
              <span>Küçük</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: SEVERITY_COLORS.MODERATE }"></span>
              <span>Orta</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: SEVERITY_COLORS.MAJOR }"></span>
              <span>Büyük</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: SEVERITY_COLORS.CRITICAL }"></span>
              <span>Kritik</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background-color: #4CAF50"></span>
              <span>Hasarsız</span>
            </div>
            <div v-if="includeRepaired" class="legend-item">
              <span class="legend-color" style="background-color: #9E9E9E"></span>
              <span>Onarılmış</span>
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

          <div v-if="selectedZoneDamages.length === 0" class="no-damages">
            Bu bölgede hasar kaydı bulunmuyor.
          </div>

          <div v-else class="damage-list">
            <div
              v-for="damage in selectedZoneDamages"
              :key="damage.id"
              class="damage-card"
              :class="{ repaired: damage.repaired }"
            >
              <div class="damage-header">
                <span class="damage-type">{{ damage.damageTypeDisplayName }}</span>
                <span 
                  class="severity-badge"
                  :style="{ backgroundColor: damage.severityColorCode }"
                >
                  {{ damage.severityDisplayName }}
                </span>
              </div>
              <div class="damage-body">
                <p><strong>Lokasyon:</strong> {{ damage.locationDisplayName }}</p>
                <p><strong>Tarih:</strong> {{ formatDate(damage.reportDate) }}</p>
                <p><strong>Açıklama:</strong> {{ damage.description }}</p>
                <p v-if="damage.estimatedCostAmount">
                  <strong>Tahmini Maliyet:</strong> 
                  {{ formatCurrency(damage.estimatedCostAmount, damage.estimatedCostCurrency) }}
                </p>
                <p v-if="damage.reportedBy">
                  <strong>Rapor Eden:</strong> {{ damage.reportedBy }}
                </p>
                <div v-if="damage.repaired" class="repair-info">
                  <p><strong>Onarım Tarihi:</strong> {{ formatDate(damage.repairedDate!) }}</p>
                  <p v-if="damage.repairCostAmount">
                    <strong>Onarım Maliyeti:</strong> 
                    {{ formatCurrency(damage.repairCostAmount, damage.repairCostCurrency) }}
                  </p>
                </div>
              </div>
              <div v-if="!damage.repaired" class="damage-actions">
                <button class="btn btn-sm btn-success" @click="handleMarkRepaired(damage.id)">
                  ✓ Onarıldı İşaretle
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="no-selection">
          <p>Detayları görmek için harita üzerinde bir bölgeye tıklayın</p>
          <div class="stats">
            <div class="stat-item">
              <span class="stat-value">{{ damageMap.totalActiveDamages }}</span>
              <span class="stat-label">Toplam Aktif Hasar</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CreateDamageForm
      v-if="showCreateForm"
      :vehicle-id="vehicleId"
      @close="showCreateForm = false"
      @created="handleDamageCreated"
    />
  </div>
</template>

<style scoped>
.damage-map {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.toggle-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
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

.damage-icon {
  background: #FFF3CD;
}

.cost-icon {
  background: #FFE5E5;
}

.repair-icon {
  background: #D4EDDA;
}

.total-icon {
  background: #E3F2FD;
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

.no-damages {
  text-align: center;
  padding: 40px;
  color: var(--color-text-secondary);
}

.damage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.damage-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
}

.damage-card.repaired {
  opacity: 0.7;
  border-color: var(--color-success);
}

.damage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.damage-type {
  font-weight: 600;
  font-size: 15px;
}

.severity-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: white;
}

.damage-body p {
  margin: 8px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.repair-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.damage-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
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

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-success:hover {
  background: #059669;
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
