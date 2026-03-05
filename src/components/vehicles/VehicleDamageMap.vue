<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { damagesApi, serviceProvidersApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleDamageMap, DamageReport, MarkDamageRepairedForm } from '@/types'
import { SEVERITY_COLORS, ZONE_NAMES } from '@/utils/vehicleZones'
import CarDiagramSVG from './CarDiagramSVG.vue'
import CreateDamageForm from './CreateDamageForm.vue'
import CompletionModal from '@/components/CompletionModal.vue'
import DamageDetailModal from './DamageDetailModal.vue'

const props = defineProps<{
  vehicleId: number
}>()

const toast = useToast()
const damageMap = ref<VehicleDamageMap | null>(null)
const loading = ref(false)
const selectedZone = ref<number | undefined>(undefined)
const showCreateForm = ref(false)
const includeRepaired = ref(false)
const showRepairModal = ref(false)
const selectedDamage = ref<DamageReport | null>(null)
const damageForDetailModal = ref<DamageReport | null>(null)
const serviceProviders = ref<Array<{ id: number; name: string }>>([])

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
  let list = damageMap.value.damages.filter(d => zoneInfo.damageIds.includes(d.id))
  if (includeRepaired.value) {
    list = list.filter(d => d.repaired)
  }
  return list
})

const allDamagesSorted = computed(() => {
  if (!damageMap.value) return []
  let list = damageMap.value.damages
  if (includeRepaired.value) {
    list = list.filter(d => d.repaired)
  }
  return [...list].sort((a, b) =>
    new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
  )
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
  selectedZone.value = selectedZone.value === zoneId ? undefined : zoneId
}

function clearSelection() {
  selectedZone.value = undefined
}

async function openRepairModal(damage: DamageReport) {
  selectedDamage.value = damage
  showRepairModal.value = true
  await fetchServiceProviders()
}

async function fetchServiceProviders() {
  try {
    const providers = await serviceProvidersApi.getAll(true)
    serviceProviders.value = providers.map(provider => ({
      id: provider.id,
      name: provider.name
    }))
  } catch (err) {
    toast.apiError(err, 'Servis sağlayıcı listesi yüklenemedi')
  }
}

function closeRepairModal() {
  showRepairModal.value = false
  selectedDamage.value = null
}

async function handleRepairSubmit(form: MarkDamageRepairedForm) {
  if (!selectedDamage.value) return
  try {
    await damagesApi.markAsRepaired(selectedDamage.value.id, form)
    toast.success('Hasar onarıldı olarak işaretlendi')
    closeRepairModal()
    await fetchDamageMap()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function handleMarkRepaired(damageId: number) {
  const targetDamage = damageMap.value?.damages.find(d => d.id === damageId)
  if (!targetDamage) return
  await openRepairModal(targetDamage)
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
    <!-- Başlık -->
    <div class="map-header">
      <div class="header-left">
        <h2 class="map-title">Hasar Haritası</h2>
        <label class="toggle-pill">
          <input type="checkbox" v-model="includeRepaired" class="toggle-input" />
          <span class="toggle-track" :class="{ active: includeRepaired }">
            <span class="toggle-thumb"></span>
          </span>
          <span class="toggle-text">Onarılmışları göster</span>
        </label>
      </div>
      <button class="btn btn-primary" @click="showCreateForm = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Hasar Ekle
      </button>
    </div>

    <!-- Yükleniyor -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Hasar haritası yükleniyor...</span>
    </div>

    <template v-else-if="damageMap">
      <!-- İstatistik Kartları -->
      <div class="stats-row">
        <div class="stat-pill" :class="{ 'stat-danger': damageMap.totalActiveDamages > 0 }">
          <span class="stat-num">{{ damageMap.totalActiveDamages }}</span>
          <span class="stat-lbl">Aktif Hasar</span>
        </div>
        <div v-if="includeRepaired" class="stat-pill">
          <span class="stat-num">{{ damageMap.damages.filter(d => d.repaired).length }}</span>
          <span class="stat-lbl">Onarılmış</span>
        </div>
        <div class="stat-pill stat-cost">
          <span class="stat-num stat-num-sm">{{ formatCurrency(totalEstimatedCost, 'TRY') }}</span>
          <span class="stat-lbl">Tahmini Maliyet</span>
        </div>
        <div v-if="totalRepairCost > 0" class="stat-pill stat-success">
          <span class="stat-num stat-num-sm">{{ formatCurrency(totalRepairCost, 'TRY') }}</span>
          <span class="stat-lbl">Onarım Maliyeti</span>
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
            <p class="legend-title">Hasar Şiddeti</p>
            <div class="legend-grid">
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: SEVERITY_COLORS.MINOR }"></span>
                <span>Küçük</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: SEVERITY_COLORS.MODERATE }"></span>
                <span>Orta</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: SEVERITY_COLORS.MAJOR }"></span>
                <span>Büyük</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" :style="{ background: SEVERITY_COLORS.CRITICAL }"></span>
                <span>Kritik</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background:#4CAF50"></span>
                <span>Hasarsız</span>
              </div>
              <div v-if="includeRepaired" class="legend-item">
                <span class="legend-dot" style="background:#9E9E9E"></span>
                <span>Onarılmış</span>
              </div>
            </div>
            <p class="legend-hint">Bölgeye tıklayarak detay görün</p>
          </div>
        </div>

        <!-- Sağ Panel: Detaylar -->
        <div class="right-panel">
          <!-- Zone seçili: o zone'un hasarları -->
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

            <div v-if="selectedZoneDamages.length === 0" class="no-records">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="no-records-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Bu bölgede hasar kaydı bulunmuyor</p>
            </div>

            <div v-else class="damage-list">
              <div
                v-for="damage in selectedZoneDamages"
                :key="damage.id"
                class="damage-card"
                :class="{ repaired: damage.repaired }"
              >
                <div class="damage-card-header">
                  <span class="damage-type-text">{{ damage.damageTypeDisplayName }}</span>
                  <span class="severity-chip" :style="{ background: damage.severityColorCode }">
                    {{ damage.severityDisplayName }}
                  </span>
                </div>
                <div class="damage-card-body">
                  <div class="damage-info-row">
                    <span class="di-label">Lokasyon</span>
                    <span class="di-value">{{ damage.locationDisplayName }}</span>
                  </div>
                  <div class="damage-info-row">
                    <span class="di-label">Tarih</span>
                    <span class="di-value">{{ formatDate(damage.reportDate) }}</span>
                  </div>
                  <div v-if="damage.description" class="damage-info-row">
                    <span class="di-label">Açıklama</span>
                    <span class="di-value">{{ damage.description }}</span>
                  </div>
                  <div v-if="damage.estimatedCostAmount" class="damage-info-row">
                    <span class="di-label">Tahmini Maliyet</span>
                    <span class="di-value highlight">{{ formatCurrency(damage.estimatedCostAmount, damage.estimatedCostCurrency) }}</span>
                  </div>
                  <div v-if="damage.reportedBy" class="damage-info-row">
                    <span class="di-label">Rapor Eden</span>
                    <span class="di-value">{{ damage.reportedBy }}</span>
                  </div>
                  <div v-if="damage.customerName" class="damage-info-row">
                    <span class="di-label">Müşteri</span>
                    <span class="di-value">{{ damage.customerName }}</span>
                  </div>
                  <div v-if="damage.repaired" class="repair-block">
                    <div class="repair-block-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="repair-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Onarım Bilgileri
                    </div>
                    <div class="damage-info-row">
                      <span class="di-label">Onarım Tarihi</span>
                      <span class="di-value">{{ formatDate(damage.repairedDate!) }}</span>
                    </div>
                    <div v-if="damage.repairCostAmount" class="damage-info-row">
                      <span class="di-label">Onarım Maliyeti</span>
                      <span class="di-value">{{ formatCurrency(damage.repairCostAmount, damage.repairCostCurrency) }}</span>
                    </div>
                    <div v-if="damage.serviceProviderName" class="damage-info-row">
                      <span class="di-label">Servis</span>
                      <span class="di-value">{{ damage.serviceProviderName }}</span>
                    </div>
                  </div>
                </div>
                <div class="damage-card-footer">
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    title="Belgeleri ve detayı görüntüle"
                    @click.stop="damageForDetailModal = damage"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" style="width:14px;height:14px">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Belgeleri Gör
                  </button>
                  <button
                    v-if="!damage.repaired"
                    class="btn btn-success btn-sm"
                    @click.stop="handleMarkRepaired(damage.id)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Onarıldı İşaretle
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Zone seçili değil: tüm hasarlar listesi -->
          <div v-else class="all-damages-panel">
            <div class="all-damages-header">
              <h3 class="detail-title">Tüm Hasarlar</h3>
              <span class="count-badge">{{ allDamagesSorted.length }}</span>
            </div>

            <div v-if="allDamagesSorted.length === 0" class="no-records">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="no-records-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Hasar kaydı bulunmuyor</p>
              <p class="no-records-hint">Araçta hasar oluştuğunda buradan takip edebilirsiniz</p>
            </div>

            <div v-else class="all-damage-list">
              <div
                v-for="damage in allDamagesSorted"
                :key="damage.id"
                class="damage-row"
                :class="{ repaired: damage.repaired }"
                @click="selectZone(damage.zoneId)"
              >
                <span class="severity-dot" :style="{ background: damage.severityColorCode }"></span>
                <div class="damage-row-info">
                  <span class="damage-row-type">{{ damage.damageTypeDisplayName }}</span>
                  <span class="damage-row-loc">{{ damage.locationDisplayName }}</span>
                </div>
                <div class="damage-row-right">
                  <span class="damage-row-date">{{ formatDate(damage.reportDate) }}</span>
                  <span v-if="damage.repaired" class="repaired-tag">Onarıldı</span>
                  <button
                    type="button"
                    class="btn-doc-inline"
                    title="Belgeleri gör"
                    @click.stop="damageForDetailModal = damage"
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

    <CreateDamageForm
      v-if="showCreateForm"
      :vehicle-id="vehicleId"
      @close="showCreateForm = false"
      @created="handleDamageCreated"
    />

    <teleport to="body">
      <CompletionModal
        :show="showRepairModal"
        type="damage"
        title="Hasar Onarımını Tamamla"
        :estimated-cost="selectedDamage?.estimatedCostAmount ?? undefined"
        :has-rental="Boolean(selectedDamage?.rentalId)"
        :service-providers="serviceProviders"
        @close="closeRepairModal"
        @submit="handleRepairSubmit"
      />
    </teleport>

    <DamageDetailModal
      :damage="damageForDetailModal"
      :visible="damageForDetailModal !== null"
      @close="damageForDetailModal = null"
    />
  </div>
</template>

<style scoped>
.damage-map {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Başlık */
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.map-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
}

.toggle-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.toggle-input {
  display: none;
}

.toggle-track {
  position: relative;
  width: 2.25rem;
  height: 1.25rem;
  background: var(--color-border, #d1d5db);
  border-radius: 9999px;
  transition: background 0.2s;
  cursor: pointer;
  flex-shrink: 0;
}

.toggle-track.active {
  background: var(--color-primary, #2563eb);
}

.toggle-thumb {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1rem;
  height: 1rem;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-track.active .toggle-thumb {
  transform: translateX(1rem);
}

.toggle-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
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

.btn-success {
  background: #047857;
  color: #fff;
}

.btn-success:hover {
  background: #065f46;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8125rem;
}

/* Yükleniyor */
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

/* İstatistik Satırı */
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

.stat-danger {
  border-color: #fca5a5;
  background: #fff5f5;
}

.stat-cost {
  border-color: #fde68a;
  background: #fffbeb;
}

.stat-success {
  border-color: #86efac;
  background: #f0fdf4;
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

/* Ana Gövde */
.map-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  align-items: start;
}

/* Sol Panel */
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

/* Sağ Panel */
.right-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
  min-height: 400px;
}

/* Detay Panel (zone seçili) */
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

/* Kayıt yok */
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
  color: var(--color-success, #10b981);
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

/* Hasar Listesi (zone seçili) */
.damage-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 520px;
  overflow-y: auto;
}

.damage-card {
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s;
}

.damage-card.repaired {
  opacity: 0.75;
  border-color: var(--color-success, #10b981);
}

.damage-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.damage-type-text {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text);
}

.severity-chip {
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.damage-card-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.damage-info-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.875rem;
}

.di-label {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.di-value {
  color: var(--color-text);
  font-weight: 500;
  text-align: right;
}

.di-value.highlight {
  color: var(--color-primary);
  font-weight: 700;
}

.repair-block {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
}

.repair-block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-success, #10b981);
  margin-bottom: 8px;
}

.repair-icon {
  width: 14px;
  height: 14px;
}

.damage-card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

/* Tüm Hasarlar Paneli */
.all-damages-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.all-damages-header {
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

.all-damage-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 520px;
  overflow-y: auto;
}

.damage-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.damage-row:hover {
  background: var(--color-bg-secondary, #f9fafb);
  border-color: var(--color-border);
}

.damage-row.repaired {
  opacity: 0.6;
}

.severity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.1);
}

.damage-row-info {
  flex: 1;
  min-width: 0;
}

.damage-row-type {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.damage-row-loc {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 1px;
}

.damage-row-right {
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

.damage-row-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.repaired-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-success, #10b981);
  background: #f0fdf4;
  padding: 1px 6px;
  border-radius: 4px;
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
