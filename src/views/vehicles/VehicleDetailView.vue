<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import { RcIcon } from '@/components/icons'
import type { IconName } from '@/components/icons/iconPaths'
import {
  RcButton,
  RcBadge,
  RcSegTab,
  RcStatusPill,
  RcModal,
  RcEmpty,
  RcDetailSkeleton,
} from '@/components/rc'
import { VehicleStatus } from '@/types'
import type { Vehicle } from '@/types'
import { fmtTRY, formatDate as formatDateUtil } from '@/utils/format'
import VehicleEditModal from '@/components/vehicles/VehicleEditModal.vue'
import VehicleOverviewTab from '@/components/vehicles/tabs/VehicleOverviewTab.vue'
import VehicleDamageMaintenanceTab from '@/components/vehicles/tabs/VehicleDamageMaintenanceTab.vue'
import VehicleRentalsTab from '@/components/vehicles/tabs/VehicleRentalsTab.vue'
import VehicleDocsTab from '@/components/vehicles/tabs/VehicleDocsTab.vue'
import VehicleFinancialTab from '@/components/vehicles/tabs/VehicleFinancialTab.vue'

type TabKey = 'overview' | 'damage' | 'rentals' | 'docs' | 'financial'

const VALID_TABS = new Set<TabKey>(['overview', 'damage', 'rentals', 'docs', 'financial'])

const LEGACY_TAB_MAP: Record<string, TabKey> = {
  info: 'overview',
  overview: 'overview',
  history: 'rentals',
  rentals: 'rentals',
  damages: 'damage',
  damage: 'damage',
  maintenance: 'damage',
  insurance: 'docs',
  documents: 'docs',
  docs: 'docs',
  installments: 'financial',
  financial: 'financial',
}

const route = useRoute()
const router = useRouter()
const toast = useToast()

const vehicle = ref<Vehicle | null>(null)
const loading = ref(true)
const showEditModal = ref(false)
const showArchiveModal = ref(false)
const showMoreMenu = ref(false)
const archiving = ref(false)
const fleetIds = ref<number[]>([])
const activeThumb = ref(0)
const tabCounts = ref({ damage: 0, rentals: 0 })

const heroThumbs = ['Ön', 'Yan', 'Arka', 'İç']

function normalizeTab(raw: string | undefined): TabKey {
  if (!raw) return 'overview'
  const mapped = LEGACY_TAB_MAP[raw]
  if (mapped) return mapped
  return VALID_TABS.has(raw as TabKey) ? (raw as TabKey) : 'overview'
}

function getTabFromQuery(): TabKey {
  return normalizeTab(route.query.tab as string)
}

const activeTab = ref<TabKey>(getTabFromQuery())

function setTab(tab: TabKey) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } })
}

watch(
  () => route.query.tab,
  (newTab) => {
    const t = normalizeTab(newTab as string)
    if (t !== activeTab.value) activeTab.value = t
  }
)

watch(
  () => route.query.edit,
  (edit) => {
    if (edit === '1') {
      showEditModal.value = true
      const { edit: _e, ...rest } = route.query
      router.replace({ query: rest })
    }
  },
  { immediate: true }
)

const vehicleId = computed(() => Number(route.params.id))

const detailTabs = computed(() => [
  { id: 'overview' as TabKey, label: 'Genel bakış', icon: 'info' as IconName },
  {
    id: 'damage' as TabKey,
    label: 'Hasar & Bakım',
    icon: 'wrench' as IconName,
    count: tabCounts.value.damage || undefined,
  },
  {
    id: 'rentals' as TabKey,
    label: 'Kiralama geçmişi',
    icon: 'key' as IconName,
    count: tabCounts.value.rentals || undefined,
  },
  { id: 'docs' as TabKey, label: 'Sigorta & Belgeler', icon: 'shield' as IconName },
  { id: 'financial' as TabKey, label: 'Finansal', icon: 'receipt' as IconName },
])

const FUEL_LABELS: Record<string, string> = {
  GASOLINE: 'Benzin',
  DIESEL: 'Dizel',
  ELECTRIC: 'Elektrik',
  HYBRID: 'Hibrit',
  LPG: 'LPG',
}

const TRANSMISSION_LABELS: Record<string, string> = {
  MANUAL: 'Manuel',
  AUTOMATIC: 'Otomatik',
  SEMI_AUTOMATIC: 'Yarı Otomatik',
}

const vehicleTitle = computed(() => {
  const v = vehicle.value
  if (!v) return ''
  return `${v.brand} ${v.model}`
})

const dailyPriceDisplay = computed(() => {
  const v = vehicle.value
  if (!v) return 0
  return v.dailyPrice ?? v.category?.defaultDailyPrice ?? 0
})

const canArchiveVehicle = computed(
  () => vehicle.value && vehicle.value.status !== VehicleStatus.RENTED
)

const currentFleetIndex = computed(() => fleetIds.value.indexOf(vehicleId.value))
const prevVehicleId = computed(() => {
  const i = currentFleetIndex.value
  return i > 0 ? fleetIds.value[i - 1] : null
})
const nextVehicleId = computed(() => {
  const i = currentFleetIndex.value
  return i >= 0 && i < fleetIds.value.length - 1 ? fleetIds.value[i + 1] : null
})

function fuelLabel(v: Vehicle): string {
  return FUEL_LABELS[String(v.fuelType).toUpperCase()] ?? String(v.fuelType)
}

function transmissionLabel(v: Vehicle): string {
  return TRANSMISSION_LABELS[String(v.transmission).toUpperCase()] ?? String(v.transmission)
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

function formatDate(date: unknown): string {
  if (!date || (typeof date !== 'string' && !(date instanceof Date))) return '—'
  return formatDateUtil(date)
}

function sparkPoints(seed: number): string {
  const pts: string[] = []
  for (let i = 0; i < 8; i++) {
    const y = 12 + ((seed * (i + 3) * 7) % 10)
    pts.push(`${i * 6},${y}`)
  }
  return pts.join(' ')
}

async function fetchFleetIds() {
  try {
    const res = await vehiclesApi.getAll({ page: 0, size: 500 })
    fleetIds.value = res.content.map((v) => v.id)
  } catch {
    fleetIds.value = []
  }
}

async function fetchTabCounts() {
  try {
    const h = await vehiclesApi.getHistory(vehicleId.value)
    tabCounts.value = {
      damage: h.damages.filter((d) => !d.repaired).length + h.maintenances.length,
      rentals: h.rentals.length,
    }
  } catch {
    tabCounts.value = { damage: 0, rentals: 0 }
  }
}

async function fetchVehicle() {
  loading.value = true
  try {
    vehicle.value = await vehiclesApi.getById(vehicleId.value)
    await fetchTabCounts()
  } catch {
    toast.error('Araç bilgileri yüklenemedi')
    router.push('/vehicles')
  } finally {
    loading.value = false
  }
}

function handleVehicleSaved(updatedVehicle: Vehicle) {
  vehicle.value = updatedVehicle
  showEditModal.value = false
  toast.success('Araç güncellendi')
}

async function confirmArchiveVehicle() {
  if (!vehicle.value) return
  archiving.value = true
  try {
    await vehiclesApi.deleteById(vehicle.value.id)
    toast.success('Araç listeden kaldırıldı (arşivlendi)')
    showArchiveModal.value = false
    router.push('/vehicles')
  } catch (err) {
    toast.apiError(err, 'Araç arşivlenemedi')
  } finally {
    archiving.value = false
  }
}

function goRent() {
  router.push({ path: '/rentals/create', query: { vehicleId: String(vehicleId.value) } })
}

function goMaintenance() {
  setTab('damage')
  toast.info('Bakım kaydı eklemek için Hasar & Bakım sekmesini kullanın')
}

function navigateVehicle(id: number) {
  router.push({ path: `/vehicles/${id}`, query: { tab: activeTab.value } })
}

onMounted(async () => {
  await fetchFleetIds()
  await fetchVehicle()
  const legacy = route.query.tab as string
  if (legacy && LEGACY_TAB_MAP[legacy] && legacy !== activeTab.value) {
    router.replace({ query: { ...route.query, tab: activeTab.value } })
  }
})
</script>

<template>
  <div class="rc-page rc-veh-detail">
    <RcDetailSkeleton v-if="loading" :sections="3" />

    <template v-else-if="vehicle">
      <div class="rc-cust-detail-nav rc-veh-detail__nav">
        <RouterLink to="/vehicles" class="rc-btn rc-btn--ghost rc-btn--sm">
          <RcIcon name="chevronLeft" :size="14" />
          Filoya dön
        </RouterLink>
        <RcButton
          v-if="prevVehicleId"
          variant="ghost"
          size="sm"
          @click="navigateVehicle(prevVehicleId)"
        >
          <RcIcon name="chevronLeft" :size="14" />
          Önceki
        </RcButton>
        <RcButton
          v-if="nextVehicleId"
          variant="ghost"
          size="sm"
          @click="navigateVehicle(nextVehicleId)"
        >
          Sonraki
          <RcIcon name="chevronRight" :size="14" />
        </RcButton>
        <span v-if="vehicle.createdAt" class="rc-cust-detail-nav__activity">
          Kayıt: {{ formatDate(vehicle.createdAt) }}
        </span>
      </div>

      <div class="rcv-hero rcv-hero--tight rc-veh-detail__hero">
        <div class="rcv-hero__gallery">
          <div class="rcv-hero__main">
            <img
              v-if="vehicle.imageUrl && activeThumb === 0"
              :src="vehicle.imageUrl"
              :alt="vehicleTitle"
              class="rcv-hero__main-img"
            />
            <span v-else>{{ vehicle.brand.toUpperCase() }} {{ vehicle.model.toUpperCase() }}</span>
          </div>
          <div class="rcv-hero__thumbs">
            <button
              v-for="(label, idx) in heroThumbs"
              :key="label"
              type="button"
              class="rcv-hero__thumb"
              :class="{ 'rcv-hero__thumb--active': activeThumb === idx }"
              @click="activeThumb = idx"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <div class="rcv-hero__info">
          <div class="rcv-hero__badges" style="margin-top: 0">
            <span class="rcv-hero__plate">{{ vehicle.plateNumber }}</span>
            <RcStatusPill :status="vehicle.status" />
            <RcBadge v-if="vehicle.categoryName">{{ vehicle.categoryName }}</RcBadge>
            <RcBadge v-if="vehicle.color" variant="accent">{{ vehicle.color }}</RcBadge>
          </div>
          <h1 class="rcv-hero__title">{{ vehicleTitle }}</h1>
          <div class="rcv-hero__meta">
            <span><RcIcon name="calendar" :size="13" /> {{ vehicle.year }} model</span>
            <span><RcIcon name="bolt" :size="13" /> {{ fuelLabel(vehicle) }}</span>
            <span><RcIcon name="settings" :size="13" /> {{ transmissionLabel(vehicle) }}</span>
            <span v-if="vehicle.branchName">
              <RcIcon name="building" :size="13" /> {{ vehicle.branchName }}
            </span>
            <span><RcIcon name="globe" :size="13" /> {{ formatKm(vehicle.currentKm) }}</span>
          </div>
        </div>

        <div class="rcv-hero__actions">
          <RcButton variant="accent" size="lg" class="rc-veh-detail__rent-btn" @click="goRent">
            <RcIcon name="key" :size="16" />
            Kirala
          </RcButton>
          <RcButton variant="secondary" @click="goMaintenance">
            <RcIcon name="wrench" :size="14" />
            Bakıma al
          </RcButton>
          <RcButton variant="ghost" @click="showEditModal = true">
            <RcIcon name="edit" :size="14" />
            Düzenle
          </RcButton>
          <RcButton variant="ghost" @click="showMoreMenu = !showMoreMenu">
            <RcIcon name="dot3" :size="14" />
            Daha fazla
          </RcButton>
          <div v-if="showMoreMenu" class="rc-veh-detail__more-menu">
            <RcButton
              variant="ghost"
              size="sm"
              :disabled="!canArchiveVehicle"
              @click="showArchiveModal = true; showMoreMenu = false"
            >
              Listeden kaldır
            </RcButton>
          </div>
        </div>
      </div>

      <div
        v-if="vehicle.isInsuranceExpiringSoon || vehicle.isInspectionExpiringSoon"
        class="rc-alert rc-alert--warning"
        role="alert"
        style="margin-top: 14px"
      >
        <RcIcon name="warning" :size="16" />
        <span>
          <template v-if="vehicle.isInsuranceExpiringSoon">Sigorta süresi yaklaşıyor.</template>
          <template v-if="vehicle.isInsuranceExpiringSoon && vehicle.isInspectionExpiringSoon"> · </template>
          <template v-if="vehicle.isInspectionExpiringSoon">Muayene tarihi yaklaşıyor.</template>
        </span>
      </div>

      <div class="rcv-stats rcv-stats--airy rc-veh-detail__stats">
        <div class="rcv-stat">
          <div class="rcv-stat__label">Günlük fiyat</div>
          <div class="rcv-stat__value">{{ fmtTRY(dailyPriceDisplay) }}</div>
          <div class="rcv-stat__sub">liste fiyatı</div>
          <svg class="rcv-stat__spark" width="48" height="16" viewBox="0 0 48 16">
            <polyline
              :points="sparkPoints(vehicle.id)"
              fill="none"
              stroke="var(--rc-blue-400)"
              stroke-width="1.5"
            />
          </svg>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Güncel KM</div>
          <div class="rcv-stat__value rc-num">{{ formatKm(vehicle.currentKm) }}</div>
          <div class="rcv-stat__sub">son okuma</div>
          <svg class="rcv-stat__spark" width="48" height="16" viewBox="0 0 48 16">
            <polyline
              :points="sparkPoints(vehicle.id + 3)"
              fill="none"
              stroke="var(--rc-success-500)"
              stroke-width="1.5"
            />
          </svg>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Doluluk (tahmini)</div>
          <div class="rcv-stat__value">%{{ tabCounts.rentals > 0 ? Math.min(95, 40 + tabCounts.rentals * 3) : 0 }}</div>
          <div class="rcv-stat__sub">{{ tabCounts.rentals }} kiralama</div>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Açık hasar</div>
          <div class="rcv-stat__value">{{ tabCounts.damage }}</div>
          <div class="rcv-stat__sub">hasar + bakım kaydı</div>
        </div>
      </div>

      <div class="rc-card rc-cust-tab-card rc-veh-detail__tabs">
        <div class="rc-segtabs rc-veh-detail__segtabs">
          <RcSegTab
            v-for="tab in detailTabs"
            :id="tab.id"
            :key="tab.id"
            :active="activeTab"
            :count="tab.count"
            @select="setTab($event as TabKey)"
          >
            <RcIcon :name="tab.icon" :size="14" />
            {{ tab.label }}
          </RcSegTab>
        </div>
      </div>

      <div class="rc-cust-tab-panel">
        <div v-show="activeTab === 'overview'">
          <VehicleOverviewTab :vehicle="vehicle" />
        </div>

        <div v-show="activeTab === 'damage'">
          <VehicleDamageMaintenanceTab
            :vehicle-id="vehicleId"
            :current-km="vehicle.currentKm ?? 0"
            :vehicle-label="`${vehicle.brand} ${vehicle.model} · ${vehicle.plateNumber}`"
          />
        </div>

        <div v-show="activeTab === 'rentals'">
          <VehicleRentalsTab :vehicle-id="vehicleId" />
        </div>

        <div v-show="activeTab === 'docs'">
          <VehicleDocsTab :vehicle-id="vehicleId" />
        </div>

        <div v-show="activeTab === 'financial'">
          <VehicleFinancialTab :vehicle-id="vehicleId" />
        </div>
      </div>

      <VehicleEditModal
        :visible="showEditModal"
        :vehicle-id="vehicleId"
        @close="showEditModal = false"
        @saved="handleVehicleSaved"
      />

      <RcModal :open="showArchiveModal" title="Listeden kaldır" @close="showArchiveModal = false">
        <p style="margin: 0; font-size: 14px; color: var(--rc-text-soft); line-height: 1.55">
          <strong>{{ vehicle.plateNumber }}</strong> plakalı araç listede gösterilmeyecek; kayıt
          sistemde arşivlenir (soft delete). Kiradaki araçlar kaldırılamaz.
        </p>
        <template #footer>
          <RcButton variant="secondary" @click="showArchiveModal = false">Vazgeç</RcButton>
          <RcButton variant="danger" :disabled="archiving" @click="confirmArchiveVehicle">
            {{ archiving ? 'Kaldırılıyor…' : 'Evet, kaldır' }}
          </RcButton>
        </template>
      </RcModal>
    </template>

    <RcEmpty v-else title="Araç bulunamadı" description="Kayıt silinmiş veya erişim yok olabilir">
      <template #icon>
        <RcIcon name="car" :size="32" />
      </template>
      <template #action>
        <RouterLink to="/vehicles" class="rc-btn rc-btn--secondary">Filoya dön</RouterLink>
      </template>
    </RcEmpty>
  </div>
</template>
