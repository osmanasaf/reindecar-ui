<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcBadge, RcEmpty } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate, formatDateTime } from '@/utils/format'
import type { Vehicle, VehicleLocation, VehicleLocationSource } from '@/types'
import VehicleRecordLocationModal from '@/components/vehicles/VehicleRecordLocationModal.vue'

const props = defineProps<{
  vehicleId: number
  vehicle: Vehicle
}>()

const toast = useToast()
const loadingCurrent = ref(true)
const loadingHistory = ref(true)
const currentLocation = ref<VehicleLocation | null>(null)
const history = ref<VehicleLocation[]>([])
const historyPage = ref(0)
const historyTotalPages = ref(0)
const showRecordModal = ref(false)

const SOURCE_LABELS: Record<VehicleLocationSource, string> = {
  MANUAL: 'Manuel',
  BRANCH_CHANGE: 'Şube değişikliği',
}

function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const effectiveDateLabel = computed(() => formatDate(todayYmd()))

async function loadCurrent() {
  loadingCurrent.value = true
  try {
    currentLocation.value = await vehiclesApi.getCurrentLocation(props.vehicleId, todayYmd())
  } catch {
    currentLocation.value = null
    toast.error('Güncel konum yüklenemedi')
  } finally {
    loadingCurrent.value = false
  }
}

async function loadHistory(page = 0) {
  loadingHistory.value = true
  try {
    const response = await vehiclesApi.getLocationHistory(props.vehicleId, { page, size: 15 })
    history.value = response.content
    historyPage.value = response.page
    historyTotalPages.value = response.totalPages
  } catch {
    history.value = []
    toast.error('Konum geçmişi yüklenemedi')
  } finally {
    loadingHistory.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadCurrent(), loadHistory(0)])
}

function onRecorded() {
  void refreshAll()
}

function sourceLabel(source: VehicleLocationSource): string {
  return SOURCE_LABELS[source] ?? source
}

const hasHistory = computed(() => history.value.length > 0)
const canGoPrev = computed(() => historyPage.value > 0)
const canGoNext = computed(() => historyPage.value < historyTotalPages.value - 1)

onMounted(refreshAll)
</script>

<template>
  <div class="rc-veh-location-tab">
    <div class="rc-card">
      <div class="rc-card__head">
        <div>
          <div class="rc-card__title">Bugünkü konum</div>
          <div class="rc-veh-location-tab__sub">{{ effectiveDateLabel }}</div>
        </div>
        <RcButton variant="accent" size="sm" @click="showRecordModal = true">
          <RcIcon name="plus" :size="14" />
          Konum kaydet
        </RcButton>
      </div>
      <div class="rc-card__body">
        <div v-if="loadingCurrent" class="rc-skeleton" style="height: 72px" />
        <template v-else-if="currentLocation">
          <div class="rc-veh-location-tab__current">
            <div class="rc-veh-location-tab__branch">
              <RcIcon name="building" :size="18" />
              <strong>{{ currentLocation.branchName }}</strong>
              <RcBadge v-if="currentLocation.fromPermanentBranch" variant="info">Kalıcı şube</RcBadge>
            </div>
            <p v-if="currentLocation.notes" class="rc-veh-location-tab__notes">{{ currentLocation.notes }}</p>
            <div class="rc-veh-location-tab__meta">
              <span>{{ sourceLabel(currentLocation.source) }}</span>
              <span v-if="currentLocation.recordedBy"> · {{ currentLocation.recordedBy }}</span>
              <span v-if="currentLocation.recordedAt"> · {{ formatDateTime(currentLocation.recordedAt) }}</span>
            </div>
          </div>
        </template>
        <RcEmpty
          v-else
          title="Konum bilgisi yok"
          description="Bu araç için bugüne ait kayıt bulunamadı."
        />
      </div>
    </div>

    <div class="rc-card" style="margin-top: 14px">
      <div class="rc-card__head">
        <div class="rc-card__title">Konum geçmişi</div>
      </div>
      <div class="rc-card__body">
        <div v-if="loadingHistory" class="rc-skeleton" style="height: 120px" />
        <RcEmpty
          v-else-if="!hasHistory"
          title="Geçmiş kayıt yok"
          description="Manuel konum girişi veya şube değişiklikleri burada listelenir."
        />
        <div v-else class="rc-table-wrap">
          <table class="rc-table rc-table--compact">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Şube</th>
                <th>Kaynak</th>
                <th>Not</th>
                <th>Kaydeden</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in history" :key="`${row.id ?? 'fb'}-${row.locationDate}`">
                <td>{{ formatDate(row.locationDate) }}</td>
                <td>
                  {{ row.branchName }}
                  <RcBadge v-if="row.fromPermanentBranch" variant="info" style="margin-left: 6px">Kalıcı</RcBadge>
                </td>
                <td>{{ sourceLabel(row.source) }}</td>
                <td>{{ row.notes || '—' }}</td>
                <td>{{ row.recordedBy || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="historyTotalPages > 1" class="rc-veh-location-tab__pager">
          <RcButton variant="ghost" size="sm" :disabled="!canGoPrev" @click="loadHistory(historyPage - 1)">
            Önceki
          </RcButton>
          <span class="rc-veh-location-tab__pager-label">
            Sayfa {{ historyPage + 1 }} / {{ historyTotalPages }}
          </span>
          <RcButton variant="ghost" size="sm" :disabled="!canGoNext" @click="loadHistory(historyPage + 1)">
            Sonraki
          </RcButton>
        </div>
      </div>
    </div>

    <VehicleRecordLocationModal
      :open="showRecordModal"
      :vehicle-id="vehicleId"
      :default-branch-id="vehicle.branchId"
      @close="showRecordModal = false"
      @recorded="onRecorded"
    />
  </div>
</template>

<style scoped>
.rc-veh-location-tab__sub {
  font-size: 12.5px;
  color: var(--rc-text-muted);
  margin-top: 2px;
}

.rc-veh-location-tab__current {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rc-veh-location-tab__branch {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.rc-veh-location-tab__notes {
  margin: 0;
  font-size: 13.5px;
  color: var(--rc-text-soft);
}

.rc-veh-location-tab__meta {
  font-size: 12.5px;
  color: var(--rc-text-muted);
}

.rc-veh-location-tab__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}

.rc-veh-location-tab__pager-label {
  font-size: 13px;
  color: var(--rc-text-muted);
}
</style>
