<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { vehiclesApi, vehicleCategoriesApi, branchesApi } from '@/api'
import {
  usePagination,
  useToast,
  useLocalStorage,
  UI_STORAGE_KEYS,
  normalizeVehicleViewMode,
  type VehicleListViewMode,
} from '@/composables'
import { RcIcon } from '@/components/icons'
import {
  RcPageHeader,
  RcButton,
  RcBadge,
  RcEmpty,
  RcKbd,
  RcStatusPill,
  RcTableSkeleton,
  RcError,
} from '@/components/rc'
import { VehicleStatus } from '@/types'
import type { Vehicle, VehicleOverview, VehicleHistory, VehicleCategory, Branch } from '@/types'
import { fmtTRY, fmtNum, formatDate } from '@/utils/format'
import DatePicker from '@/components/base/DatePicker.vue'

type FilterKey = 'all' | VehicleStatus
type SortKey = 'plate' | 'km' | 'daily' | 'year'

const router = useRouter()
const vehicles = ref<Vehicle[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const statusFilter = ref<FilterKey>('all')
const categoryFilter = ref<number | null>(null)
const branchFilter = ref<number | null>(null)
const availabilityStart = ref('')
const availabilityEnd = ref('')
const categories = ref<VehicleCategory[]>([])
const branches = ref<Branch[]>([])
const viewMode = useLocalStorage<VehicleListViewMode>(
  UI_STORAGE_KEYS.vehicleListView,
  'gantt',
  {
    serializer: {
      read: (raw) => normalizeVehicleViewMode(JSON.parse(raw)),
      write: (value) => JSON.stringify(value),
    },
  },
)
const sortKey = ref<SortKey>('plate')
const sortOpen = ref(false)
const filtersOpen = ref(false)
const selected = ref<Set<number>>(new Set())

const overview = ref<VehicleOverview>({
  total: 0,
  available: 0,
  rented: 0,
  reserved: 0,
  maintenance: 0,
  damaged: 0,
  inactive: 0,
  sold: 0,
})

const {
  page,
  size,
  totalElements,
  totalPages,
  pageSizeOptions,
  setPage,
  setSize,
  setTotal,
  getParams,
} = usePagination()
const toast = useToast()

const sortLabels: Record<SortKey, string> = {
  plate: 'Plaka',
  km: 'KM (yüksek)',
  daily: 'Günlük (yüksek)',
  year: 'Yıl (yeni)',
}

const filterChips: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'Hepsi' },
  { id: VehicleStatus.AVAILABLE, label: 'Müsait' },
  { id: VehicleStatus.RENTED, label: 'Kirada' },
  { id: VehicleStatus.RESERVED, label: 'Rezerve' },
  { id: VehicleStatus.MAINTENANCE, label: 'Bakımda' },
  { id: VehicleStatus.DAMAGED, label: 'Hasarlı' },
  { id: VehicleStatus.INACTIVE, label: 'Pasif' },
  { id: VehicleStatus.SOLD, label: 'Satıldı' },
]

const monthPerfBars = computed(() => {
  const total = Math.max(overview.value.total, 1)
  return [
    { label: 'Oca', pct: Math.round((overview.value.rented / total) * 100) },
    { label: 'Şub', pct: Math.round((overview.value.available / total) * 100) },
    { label: 'Mar', pct: Math.round((overview.value.reserved / total) * 100) },
    { label: 'Nis', pct: Math.round((overview.value.maintenance / total) * 100) },
    { label: 'May', pct: Math.round(((overview.value.rented + overview.value.reserved) / total) * 50) },
    { label: 'Haz', pct: Math.round((overview.value.available / total) * 80) },
  ]
})

const FUEL_LABELS: Record<string, string> = {
  GASOLINE: 'Benzin',
  DIESEL: 'Dizel',
  ELECTRIC: 'Elektrik',
  HYBRID: 'Hibrit',
  LPG: 'LPG',
}

const fleetDonutItems = computed(() => [
  { label: 'Müsait', count: overview.value.available, color: 'var(--rc-success-500)' },
  { label: 'Kirada', count: overview.value.rented, color: 'var(--rc-blue-500)' },
  { label: 'Rezerve', count: overview.value.reserved, color: 'var(--rc-purple-500)' },
  { label: 'Bakımda', count: overview.value.maintenance, color: 'var(--rc-warning-500)' },
])

const donutCircumference = computed(() => {
  const r = (92 - 18) / 2
  return 2 * Math.PI * r
})

const allSelected = computed(
  () => vehicles.value.length > 0 && vehicles.value.every((v) => selected.value.has(v.id))
)

function chipCount(id: FilterKey): number {
  if (id === 'all') return overview.value.total
  if (id === VehicleStatus.AVAILABLE) return overview.value.available
  if (id === VehicleStatus.RENTED) return overview.value.rented
  if (id === VehicleStatus.RESERVED) return overview.value.reserved
  if (id === VehicleStatus.MAINTENANCE) return overview.value.maintenance
  if (id === VehicleStatus.DAMAGED) return overview.value.damaged
  if (id === VehicleStatus.INACTIVE) return overview.value.inactive
  if (id === VehicleStatus.SOLD) return overview.value.sold
  return 0
}

function fuelLabel(v: Vehicle): string {
  return FUEL_LABELS[String(v.fuelType).toUpperCase()] ?? String(v.fuelType)
}

function dailyPrice(v: Vehicle): number {
  return v.dailyPrice ?? v.category?.defaultDailyPrice ?? 0
}

function vehicleSynthetics(v: Vehicle) {
  const plate = v.plateNumber || 'XX'
  const seed = (plate.charCodeAt(2) || 0) + (plate.charCodeAt(5) || 0)
  const utilization = 0.45 + ((seed * 13) % 50) / 100
  const next =
    v.status === VehicleStatus.RENTED
      ? { label: 'İade', at: '—', icon: 'key' as const }
      : v.status === VehicleStatus.RESERVED
        ? { label: 'Teslim', at: '—', icon: 'calendar' as const }
        : v.status === VehicleStatus.MAINTENANCE
          ? { label: 'Bakım', at: '—', icon: 'wrench' as const }
          : v.status === VehicleStatus.DAMAGED
            ? { label: 'Onarım', at: '—', icon: 'warning' as const }
            : { label: 'Hazır', at: '—', icon: 'check' as const }
  return { utilization, next }
}

const availabilityEndMin = computed(() =>
  availabilityStart.value ? addDaysYmd(availabilityStart.value, 1) : undefined
)

const availabilityFilterActive = computed(
  () => !!(availabilityStart.value && availabilityEnd.value)
)

const servisCategory = computed(() =>
  categories.value.find(
    (c) =>
      c.code?.toUpperCase() === 'SERVIS' ||
      c.name.toLowerCase().includes('servis') ||
      c.name.toLowerCase().includes('minibüs')
  ) ?? null
)

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const monthPresets = computed(() => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
    const fullLabel = monthStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    const shortLabel = monthStart.toLocaleDateString('tr-TR', { month: 'short' })
    return {
      label: fullLabel,
      shortLabel,
      start: toYmd(monthStart),
      end: toYmd(monthEnd),
    }
  })
})

const selectedCategoryName = computed(() =>
  categories.value.find((c) => c.id === categoryFilter.value)?.name ?? null
)

const selectedBranchName = computed(() =>
  branches.value.find((b) => b.id === branchFilter.value)?.name ?? null
)

const hasAdvancedFilters = computed(
  () => availabilityFilterActive.value || categoryFilter.value !== null || branchFilter.value !== null
)

const activeFilterCount = computed(() => {
  let n = 0
  if (availabilityFilterActive.value) n++
  if (categoryFilter.value !== null) n++
  if (branchFilter.value !== null) n++
  return n
})

function toggleFiltersPanel() {
  filtersOpen.value = !filtersOpen.value
  if (filtersOpen.value) sortOpen.value = false
}

function closeFiltersPanel() {
  filtersOpen.value = false
}

function clearAllAdvancedFilters() {
  availabilityStart.value = ''
  availabilityEnd.value = ''
  categoryFilter.value = null
  branchFilter.value = null
  closeFiltersPanel()
  setPage(0)
  fetchVehicles()
}

function removeAvailabilityFilter() {
  availabilityStart.value = ''
  availabilityEnd.value = ''
  setPage(0)
  fetchVehicles()
}

function removeCategoryFilter() {
  categoryFilter.value = null
  setPage(0)
  fetchVehicles()
}

function removeBranchFilter() {
  branchFilter.value = null
  setPage(0)
  fetchVehicles()
}

function buildListParams() {
  return {
    ...buildSortParams(),
    ...(categoryFilter.value ? { categoryId: categoryFilter.value } : {}),
    ...(branchFilter.value ? { branchId: branchFilter.value } : {}),
  }
}

function applyClientFilters(content: Vehicle[]): Vehicle[] {
  let result = content
  if (categoryFilter.value) {
    result = result.filter((v) => v.categoryId === categoryFilter.value)
  }
  if (branchFilter.value) {
    result = result.filter((v) => v.branchId === branchFilter.value)
  }
  if (statusFilter.value !== 'all') {
    result = result.filter((v) => v.status === statusFilter.value)
  }
  return result
}

function applyMonthPreset(start: string, end: string) {
  availabilityStart.value = start
  availabilityEnd.value = end
}

function applyServisCategoryFilter() {
  if (!servisCategory.value) {
    toast.error('Servis / Minibüs kategorisi bulunamadı. Ayarlar → Kategoriler\'den ekleyin.')
    return
  }
  categoryFilter.value = servisCategory.value.id
}

function applyFiltersAndClose() {
  const hasStart = Boolean(availabilityStart.value)
  const hasEnd = Boolean(availabilityEnd.value)
  if (hasStart !== hasEnd) {
    toast.error('Müsaitlik için başlangıç ve bitiş tarihini birlikte seçin')
    return
  }
  if (hasStart && hasEnd && availabilityEnd.value <= availabilityStart.value) {
    toast.error('Bitiş tarihi başlangıçtan sonra olmalıdır')
    return
  }
  closeFiltersPanel()
  applyAdvancedFilters()
}

function buildSortParams() {
  const base = getParams()
  const sortMap: Record<SortKey, [string, 'asc' | 'desc']> = {
    plate: ['plateNumber', 'asc'],
    km: ['currentKm', 'desc'],
    daily: ['dailyPrice', 'desc'],
    year: ['year', 'desc'],
  }
  const [field, direction] = sortMap[sortKey.value]
  return { ...base, sort: field, direction }
}

async function fetchOverview() {
  try {
    overview.value = await vehiclesApi.getOverview()
  } catch {
    try {
      const all = await vehiclesApi.getAll({ page: 0, size: 1 })
      overview.value = { ...overview.value, total: all.totalElements }
    } catch {
      toast.error('Filo özeti yüklenemedi')
    }
  }
}

async function fetchVehicles() {
  loading.value = true
  error.value = null
  try {
    const q = searchQuery.value.trim()
    const params = buildListParams()
    let response

    if (availabilityStart.value && availabilityEnd.value) {
      response = await vehiclesApi.getAvailableForPeriod(
        availabilityStart.value,
        availabilityEnd.value,
        params
      )
      if (statusFilter.value !== 'all') {
        const filtered = response.content.filter((v) => v.status === statusFilter.value)
        response = { ...response, content: filtered, totalElements: filtered.length }
      }
    } else if (q.length >= 2) {
      response = await vehiclesApi.search(q, buildSortParams())
      const filtered = applyClientFilters(response.content)
      response = { ...response, content: filtered, totalElements: filtered.length }
    } else if (statusFilter.value !== 'all') {
      response = await vehiclesApi.getByStatus(statusFilter.value, params)
    } else {
      response = await vehiclesApi.getAll(params)
    }

    vehicles.value = response.content
    setTotal(response.totalElements, response.totalPages)
    selected.value = new Set()
  } catch {
    error.value = 'Araçlar yüklenirken hata oluştu'
    toast.error(error.value)
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

async function fetchBranches() {
  try {
    branches.value = await branchesApi.getActive()
  } catch {
    branches.value = []
  }
}

function applyAdvancedFilters() {
  setPage(0)
  fetchVehicles()
}

function setFilter(next: FilterKey) {
  if (statusFilter.value === next) return
  statusFilter.value = next
  setPage(0)
  fetchVehicles()
}

function setSort(next: SortKey) {
  sortKey.value = next
  sortOpen.value = false
  setPage(0)
  fetchVehicles()
}

function toggleSortPanel() {
  sortOpen.value = !sortOpen.value
  if (sortOpen.value) filtersOpen.value = false
}

function handlePageChange(newPage: number) {
  setPage(newPage)
  fetchVehicles()
}

function handlePageSizeChange(event: Event) {
  const next = Number((event.target as HTMLSelectElement).value)
  setSize(next)
  fetchVehicles()
}

function goToDetail(id: number) {
  router.push(`/vehicles/${id}`)
}

function toggleSelect(id: number) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleSelectAll() {
  if (allSelected.value) selected.value = new Set()
  else selected.value = new Set(vehicles.value.map((v) => v.id))
}

function clearSelection() {
  selected.value = new Set()
}

// Gantt — full-history ile gerçek kiralama segmentleri
const GANTT_DAYS = 21
const ganttHistories = ref<Map<number, VehicleHistory>>(new Map())
const ganttLoading = ref(false)

const ganttDays = computed(() => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const todayIdx = 0
  return Array.from({ length: GANTT_DAYS }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const wd = date.getDay()
    return {
      idx: i,
      day: date.getDate(),
      weekday: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][wd],
      weekend: wd === 0 || wd === 6,
      today: i === todayIdx,
      date: new Date(date),
    }
  })
})

function dayIndexForDate(d: Date, windowStart: Date): number | null {
  const ms = d.setHours(0, 0, 0, 0) - windowStart.setHours(0, 0, 0, 0)
  const idx = Math.floor(ms / 86400000)
  if (idx < 0 || idx >= GANTT_DAYS) return null
  return idx
}

function ganttBookings(v: Vehicle) {
  const windowStart = ganttDays.value[0]?.date ?? new Date()
  const bookings: { start: number; end: number; type: string; customer: string }[] = []
  const history = ganttHistories.value.get(v.id)

  if (history?.rentals.length) {
    for (const r of history.rentals) {
      const rs = new Date(r.startDate)
      const re = new Date(r.actualReturnDate || r.endDate)
      const startIdx = dayIndexForDate(new Date(rs), new Date(windowStart))
      const endIdx = dayIndexForDate(new Date(re), new Date(windowStart))
      if (startIdx === null && endIdx === null) continue
      const start = startIdx ?? 0
      const end = Math.min(GANTT_DAYS, (endIdx ?? GANTT_DAYS - 1) + 1)
      if (end <= start) continue
      const st = String(r.status).toUpperCase()
      let type = 'rented'
      if (st.includes('RESERV')) type = 'reserved'
      else if (st.includes('MAINT')) type = 'maintenance'
      bookings.push({
        start,
        end,
        type,
        customer: r.customerName || r.rentalNumber,
      })
    }
    if (bookings.length) return bookings
  }

  if (v.status === VehicleStatus.RENTED) {
    bookings.push({ start: 0, end: 10, type: 'rented', customer: 'Aktif kiralama' })
  } else if (v.status === VehicleStatus.RESERVED) {
    bookings.push({ start: 2, end: 8, type: 'reserved', customer: 'Rezerve' })
  } else if (v.status === VehicleStatus.MAINTENANCE) {
    bookings.push({ start: 0, end: 5, type: 'maintenance', customer: 'Bakım' })
  }
  return bookings
}

async function loadGanttHistories() {
  if (vehicles.value.length === 0) return
  ganttLoading.value = true
  try {
    const results = await Promise.all(
      vehicles.value.map((v) =>
        vehiclesApi.getHistory(v.id).catch(() => null)
      )
    )
    const map = new Map<number, VehicleHistory>()
    vehicles.value.forEach((v, i) => {
      if (results[i]) map.set(v.id, results[i]!)
    })
    ganttHistories.value = map
  } finally {
    ganttLoading.value = false
  }
}

watch(viewMode, (mode) => {
  if (mode === 'gantt') loadGanttHistories()
})

watch(vehicles, () => {
  if (viewMode.value === 'gantt') loadGanttHistories()
})

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    setPage(0)
    fetchVehicles()
  }, 300)
})

onMounted(async () => {
  await Promise.all([fetchOverview(), fetchCategories(), fetchBranches()])
  await fetchVehicles()
})
</script>

<template>
  <div class="rc-page">
    <RcPageHeader
      title="Filo"
      subtitle="Bugün filonun nabzı — kim nerede, hangi araç müsait, hangi araç yolda"
    >
      <template #actions>
        <RouterLink to="/vehicles/new" class="rc-btn rc-btn--accent">
          <RcIcon name="plus" :size="14" />
          Araç ekle
        </RouterLink>
      </template>
    </RcPageHeader>

    <!-- Filo özeti -->
    <div class="rcv-hero-strip">
      <div class="rcv-hs__zone">
        <div class="rcv-hs__eyebrow">
          <RcIcon name="car" :size="14" />
          Filo durumu
        </div>
        <div class="rcv-hs__donut">
          <svg width="92" height="92" viewBox="0 0 92 92">
            <circle
              cx="46"
              cy="46"
              :r="(92 - 18) / 2"
              fill="none"
              stroke="var(--rc-ink-100)"
              stroke-width="10"
            />
            <circle
              v-for="(item, i) in fleetDonutItems"
              :key="item.label"
              cx="46"
              cy="46"
              :r="(92 - 18) / 2"
              fill="none"
              :stroke="item.color"
              stroke-width="10"
              :stroke-dasharray="`${(item.count / Math.max(overview.total, 1)) * donutCircumference} ${donutCircumference}`"
              :stroke-dashoffset="
                -fleetDonutItems
                  .slice(0, i)
                  .reduce((acc, x) => acc + (x.count / Math.max(overview.total, 1)) * donutCircumference, 0)
              "
              transform="rotate(-90 46 46)"
            />
            <text
              x="46"
              y="44"
              text-anchor="middle"
              font-family="var(--rc-font-display)"
              font-size="20"
              font-weight="600"
              fill="var(--rc-text)"
            >
              {{ overview.total }}
            </text>
            <text x="46" y="58" text-anchor="middle" font-size="9" fill="var(--rc-text-muted)">ARAÇ</text>
          </svg>
          <div class="rcv-hs__legend" style="flex-direction: column; gap: 5px">
            <div v-for="item in fleetDonutItems" :key="item.label" class="rcv-hs__legend-row">
              <span class="rc-dot" :style="{ background: item.color }" />
              <span>{{ item.label }}</span>
              <span class="rc-num">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="rcv-hs__zone">
        <div class="rcv-hs__eyebrow">
          <RcIcon name="clock" :size="14" />
          Bugün
        </div>
        <div class="rcv-hs__lead">
          <b>{{ overview.rented }} iade</b> bekleniyor,<br />
          <em>{{ overview.maintenance }} araç</em> bakımda.
        </div>
        <div class="rc-veh-list-today">
          <button
            type="button"
            class="rcv-hs__chip rcv-hs__chip--accent"
            @click="setFilter(VehicleStatus.RENTED)"
          >
            <RcIcon name="key" :size="14" />
            İadeler
            <span class="rcv-hs__chip-count">{{ overview.rented }}</span>
          </button>
          <button type="button" class="rcv-hs__chip rcv-hs__chip--warn" @click="toast.info('Geciken kiralamalar listesi yakında')">
            Geciken
          </button>
          <button
            type="button"
            class="rcv-hs__chip"
            @click="setFilter(VehicleStatus.MAINTENANCE)"
          >
            <RcIcon name="wrench" :size="14" />
            Bakım
            <span class="rcv-hs__chip-count">{{ overview.maintenance }}</span>
          </button>
        </div>
      </div>

      <div class="rcv-hs__zone">
        <div class="rcv-hs__eyebrow">
          <RcIcon name="trend" :size="14" />
          Bu ay
        </div>
        <div class="rcv-hs__lead">
          Ortalama doluluk
          <b>%{{ overview.total ? Math.round((overview.rented / overview.total) * 100) : 0 }}</b>
        </div>
        <div class="rcv-hs__perf">
          <div
            v-for="bar in monthPerfBars"
            :key="bar.label"
            class="rcv-hs__perf-col"
            :class="{ 'rcv-hs__perf-col--curr': bar.label === 'Haz' }"
            :style="{ height: `${Math.max(12, bar.pct)}%` }"
            :title="bar.label"
          />
        </div>
        <div style="font-size: 11px; color: var(--rc-text-muted); margin-top: 6px">
          {{ overview.available }} müsait · {{ overview.reserved }} rezerve
        </div>
      </div>
    </div>

    <!-- Aktif gelişmiş filtreler (kompakt) -->
    <div v-if="hasAdvancedFilters" class="rcv-active-filters">
      <span v-if="availabilityFilterActive" class="rcv-active-pill">
        <RcIcon name="calendar" :size="12" />
        {{ formatDate(availabilityStart) }} – {{ formatDate(availabilityEnd) }}
        <button type="button" class="rcv-active-pill__clear" aria-label="Tarih filtresini kaldır" @click="removeAvailabilityFilter">×</button>
      </span>
      <span v-if="selectedCategoryName" class="rcv-active-pill">
        {{ selectedCategoryName }}
        <button type="button" class="rcv-active-pill__clear" aria-label="Kategori filtresini kaldır" @click="removeCategoryFilter">×</button>
      </span>
      <span v-if="selectedBranchName" class="rcv-active-pill">
        <RcIcon name="building" :size="12" />
        {{ selectedBranchName }}
        <button type="button" class="rcv-active-pill__clear" aria-label="Şube filtresini kaldır" @click="removeBranchFilter">×</button>
      </span>
      <button type="button" class="rcv-active-filters__clear-all" @click="clearAllAdvancedFilters">
        Tümünü temizle
      </button>
    </div>

    <!-- Filtre + görünüm -->
    <div class="rc-filterbar rcv-filterbar--slim">
      <div class="rc-input-group" style="width: 260px">
        <RcIcon name="search" :size="16" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Plaka, marka, model ara…"
          autocomplete="off"
        />
        <RcKbd>/</RcKbd>
      </div>
      <span class="rc-filterbar__sep" />
      <button
        v-for="chip in filterChips"
        :key="chip.id"
        type="button"
        class="rc-chip"
        :class="{ 'rc-chip--on': statusFilter === chip.id }"
        @click="setFilter(chip.id)"
      >
        {{ chip.label }}
        <span class="rc-chip__count">{{ chipCount(chip.id) }}</span>
      </button>

      <span class="rc-filterbar__sep" />

      <div class="rcv-filter-trigger">
        <button
          type="button"
          class="rc-chip"
          :class="{ 'rc-chip--on': hasAdvancedFilters || filtersOpen }"
          @click="toggleFiltersPanel"
        >
          <RcIcon name="sliders" :size="14" />
          Filtreler
          <span v-if="activeFilterCount" class="rc-chip__count">{{ activeFilterCount }}</span>
        </button>
        <template v-if="filtersOpen">
          <div class="rcv-filter-backdrop" @click="closeFiltersPanel" />
          <div class="rcv-filters-popover">
            <div class="rcv-filters-popover__section">
              <span class="rcv-filters-popover__label">Müsaitlik dönemi</span>
              <div class="rcv-filters-popover__months">
                <button
                  v-for="preset in monthPresets"
                  :key="preset.start"
                  type="button"
                  class="rcv-month-chip"
                  :class="{ 'rcv-month-chip--on': availabilityStart === preset.start && availabilityEnd === preset.end }"
                  :title="preset.label"
                  @click="applyMonthPreset(preset.start, preset.end)"
                >
                  {{ preset.shortLabel }}
                </button>
              </div>
              <div class="rcv-filters-popover__dates">
                <DatePicker
                  v-model="availabilityStart"
                  label="Başlangıç"
                  placeholder="Başlangıç"
                />
                <DatePicker
                  v-model="availabilityEnd"
                  label="Bitiş"
                  placeholder="Bitiş"
                  :min="availabilityEndMin"
                />
              </div>
            </div>

            <div class="rcv-filters-popover__section">
              <span class="rcv-filters-popover__label">Şube</span>
              <select v-model="branchFilter" class="rc-input rcv-filter-select">
                <option :value="null">Tüm şubeler</option>
                <option v-for="branch in branches" :key="branch.id" :value="branch.id">
                  {{ branch.name }}
                </option>
              </select>
            </div>

            <div class="rcv-filters-popover__section">
              <span class="rcv-filters-popover__label">Araç kategorisi</span>
              <select v-model="categoryFilter" class="rc-input rcv-filter-select">
                <option :value="null">Tüm kategoriler</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
              <button
                v-if="servisCategory"
                type="button"
                class="rcv-quick-filter"
                :class="{ 'rcv-quick-filter--on': categoryFilter === servisCategory.id }"
                @click="applyServisCategoryFilter"
              >
                Servis / Minibüs
              </button>
            </div>

            <div class="rcv-filters-popover__actions">
              <RcButton variant="ghost" size="sm" @click="clearAllAdvancedFilters">Temizle</RcButton>
              <RcButton variant="accent" size="sm" @click="applyFiltersAndClose">Uygula</RcButton>
            </div>
          </div>
        </template>
      </div>

      <span style="margin-left: auto" />

      <div class="rcv-filter-trigger">
        <button type="button" class="rc-chip" style="border-style: dashed" @click="toggleSortPanel">
          <RcIcon name="chevronDown" :size="14" />
          {{ sortLabels[sortKey] }}
        </button>
        <template v-if="sortOpen">
          <div class="rcv-filter-backdrop" @click="sortOpen = false" />
          <div
            class="rcv-filters-popover rcv-filters-popover--sort"
          >
          <button
            v-for="(label, key) in sortLabels"
            :key="key"
            type="button"
            :style="{
              display: 'flex',
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 'var(--rc-r-6)',
              fontSize: '13px',
              color: sortKey === key ? 'var(--rc-blue-700)' : 'var(--rc-text)',
              background: sortKey === key ? 'var(--rc-blue-50)' : 'transparent',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer',
            }"
            @click="setSort(key as SortKey)"
          >
            <RcIcon v-if="sortKey === key" name="check" :size="14" />
            <span :style="{ flex: 1, marginLeft: sortKey === key ? 0 : '22px' }">{{ label }}</span>
          </button>
          </div>
        </template>
      </div>

      <div class="rc-tabs" style="padding: 3px">
        <button
          type="button"
          class="rc-tab"
          :class="{ 'rc-tab--active': viewMode === 'table' }"
          title="Tablo"
          @click="viewMode = 'table'"
        >
          <RcIcon name="filter" :size="14" />
        </button>
        <button
          type="button"
          class="rc-tab"
          :class="{ 'rc-tab--active': viewMode === 'grid' }"
          title="Kart"
          @click="viewMode = 'grid'"
        >
          <RcIcon name="folder" :size="14" />
        </button>
        <button
          type="button"
          class="rc-tab"
          :class="{ 'rc-tab--active': viewMode === 'gantt' }"
          title="Takvim"
          @click="viewMode = 'gantt'"
        >
          <RcIcon name="calendar" :size="14" />
        </button>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="10" :cols="6" />

    <RcError
      v-else-if="error"
      :message="error"
      @retry="fetchVehicles"
    />

    <RcEmpty
      v-else-if="vehicles.length === 0"
      title="Bu filtreyle eşleşen araç yok"
      description="Kaydedilmiş görünümü değiştir veya filtreleri sıfırla"
    >
      <template #icon>
        <RcIcon name="search" :size="32" />
      </template>
      <template #action>
        <RcButton variant="secondary" @click="setFilter('all')">Tüm filoyu göster</RcButton>
      </template>
    </RcEmpty>

    <!-- Tablo -->
    <div v-else-if="viewMode === 'table'" class="rc-card" style="overflow: hidden">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th style="width: 32px">
              <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
            </th>
            <th>Araç</th>
            <th>Şube · Kategori</th>
            <th>Doluluk</th>
            <th class="rc-right">Günlük</th>
            <th>Durum</th>
          </tr>
        </thead>
        <TransitionGroup name="rc-list" tag="tbody">
          <tr
            v-for="v in vehicles"
            :key="v.id"
            style="cursor: pointer"
            @click="goToDetail(v.id)"
          >
            <td @click.stop>
              <input
                type="checkbox"
                :checked="selected.has(v.id)"
                @change="toggleSelect(v.id)"
              />
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 12px">
                <div class="rcv-thumb rcv-thumb--md">
                  <img v-if="v.imageUrl" :src="v.imageUrl" :alt="v.brand" />
                  <span v-else>{{ v.brand.slice(0, 3).toUpperCase() }}</span>
                </div>
                <div style="min-width: 0">
                  <div class="rcv-row__primary">{{ v.brand }} {{ v.model }}</div>
                  <div class="rcv-row__plate">
                    {{ v.plateNumber }} · {{ v.year }} · {{ fuelLabel(v) }}
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div class="rcv-row__primary" style="font-weight: 400; font-size: 13px">
                {{ v.branchName || '—' }}
              </div>
              <div class="rcv-row__secondary">{{ v.categoryName || '—' }}</div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 3px; min-width: 90px">
                <div class="rcv-bar">
                  <div
                    class="rcv-bar__fill"
                    :style="{ width: `${vehicleSynthetics(v).utilization * 100}%` }"
                  />
                </div>
                <span
                  style="font-size: 11px; color: var(--rc-text-muted); font-family: var(--rc-font-mono)"
                >
                  %{{ Math.round(vehicleSynthetics(v).utilization * 100) }} doluluk
                </span>
              </div>
            </td>
            <td class="rc-right">
              <div class="rcv-row__primary rc-num">{{ fmtTRY(dailyPrice(v)) }}</div>
              <div class="rcv-row__secondary">{{ fmtNum(v.currentKm) }} km</div>
            </td>
            <td>
              <RcStatusPill :status="v.status" />
              <div class="rcv-row__secondary" style="margin-top: 3px">
                {{ vehicleSynthetics(v).next.label }}
              </div>
            </td>
          </tr>
        </TransitionGroup>
      </table>
    </div>

    <!-- Grid -->
    <div v-else-if="viewMode === 'grid'" class="rcv-cards">
      <div
        v-for="v in vehicles"
        :key="v.id"
        class="rcv-card"
        style="position: relative"
        @click="goToDetail(v.id)"
      >
        <button
          type="button"
          class="rcv-card__fav"
          title="Detaya git"
          @click.stop="goToDetail(v.id)"
        >
          <RcIcon name="eye" :size="14" />
        </button>
        <div class="rcv-card__media rcv-thumb">
          <img v-if="v.imageUrl" :src="v.imageUrl" :alt="v.brand" style="width: 100%; height: 100%; object-fit: cover" />
          <span v-else>{{ v.brand.toUpperCase() }}</span>
          <div class="rcv-card__badge"><RcStatusPill :status="v.status" /></div>
        </div>
        <div class="rcv-card__body">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px">
            <div>
              <div class="rcv-card__title">{{ v.brand }} {{ v.model }}</div>
              <div class="rcv-card__plate">{{ v.plateNumber }}</div>
            </div>
            <RcBadge v-if="v.categoryName">{{ v.categoryName }}</RcBadge>
          </div>
          <div class="rcv-card__meta">
            <span><RcIcon name="calendar" :size="12" /> {{ v.year }}</span>
            <span><RcIcon name="bolt" :size="12" /> {{ fuelLabel(v) }}</span>
            <span><RcIcon name="globe" :size="12" /> {{ fmtNum(v.currentKm) }} km</span>
          </div>
          <div class="rcv-info-row">
            <div class="rcv-info-row__cell">
              <span class="rcv-info-row__label">Doluluk</span>
              <span class="rcv-info-row__value">
                %{{ Math.round(vehicleSynthetics(v).utilization * 100) }}
              </span>
            </div>
            <div class="rcv-info-row__cell">
              <span class="rcv-info-row__label">Şube</span>
              <span class="rcv-info-row__value" style="font-size: 13px">
                {{ v.branchName || '—' }}
              </span>
            </div>
          </div>
          <div class="rcv-card__foot">
            <div class="rcv-card__price">
              {{ fmtTRY(dailyPrice(v)) }}<small>/gün</small>
            </div>
            <div class="rcv-card__metric">
              <RcIcon :name="vehicleSynthetics(v).next.icon" :size="14" />
              <span>{{ vehicleSynthetics(v).next.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gantt -->
    <div v-else class="rcv-gantt">
      <div v-if="ganttLoading" class="rc-skeleton" style="height: 120px; margin-bottom: 12px" />
      <div class="rcv-gantt__head">
        <div class="rcv-gantt__head-left">{{ vehicles.length }} araç · {{ GANTT_DAYS }} gün</div>
        <div class="rcv-gantt__days">
          <div
            v-for="d in ganttDays"
            :key="d.idx"
            class="rcv-gantt__day"
            :class="{
              'rcv-gantt__day--weekend': d.weekend,
              'rcv-gantt__day--today': d.today,
            }"
          >
            <b>{{ d.day }}</b>
            <span>{{ d.weekday }}</span>
          </div>
        </div>
      </div>
      <div v-for="v in vehicles" :key="v.id" class="rcv-gantt__row">
        <div class="rcv-gantt__vehicle" @click="goToDetail(v.id)">
          <div class="rcv-thumb rcv-thumb--md">
            <span>{{ v.brand.slice(0, 3).toUpperCase() }}</span>
          </div>
          <div class="rcv-gantt__vehicle-info">
            <b>{{ v.brand }} {{ v.model }}</b>
            <small>{{ v.plateNumber }} · {{ v.branchName || '—' }}</small>
          </div>
        </div>
        <div class="rcv-gantt__track">
          <div
            v-for="d in ganttDays"
            :key="d.idx"
            class="rcv-gantt__cell"
            :class="{
              'rcv-gantt__cell--weekend': d.weekend,
              'rcv-gantt__cell--today': d.today,
            }"
          />
          <div
            v-for="(b, i) in ganttBookings(v)"
            :key="i"
            class="rcv-gantt__bar"
            :class="`rcv-gantt__bar--${b.type}`"
            :style="{
              left: `${(b.start / GANTT_DAYS) * 100}%`,
              width: `calc(${((b.end - b.start) / GANTT_DAYS) * 100}% - 2px)`,
            }"
            :title="b.customer"
          >
            {{ b.type === 'available' ? '' : b.customer }}
          </div>
        </div>
      </div>
      <div class="rcv-gantt__legend">
        <div class="rcv-gantt__legend-chip">
          <span class="rcv-gantt__legend-swatch" style="background: var(--rc-blue-500)" />
          Aktif kiralama
        </div>
        <div class="rcv-gantt__legend-chip">
          <span class="rcv-gantt__legend-swatch" style="background: var(--rc-purple-500)" />
          Rezerve
        </div>
        <div class="rcv-gantt__legend-chip">
          <span class="rcv-gantt__legend-swatch" style="background: var(--rc-warning-500)" />
          Bakım
        </div>
        <div class="rcv-gantt__legend-chip">
          <span class="rcv-gantt__legend-swatch" style="background: var(--rc-ink-150)" />
          Müsait
        </div>
      </div>
    </div>

    <!-- Sayfalama -->
    <div
      v-if="!loading && vehicles.length > 0"
      class="rc-filterbar"
      style="justify-content: center; margin-top: 20px; flex-wrap: wrap; gap: 12px"
    >
      <label class="rc-page-size" style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--rc-text-muted)">
        Sayfa boyutu
        <select
          class="rc-select"
          style="width: auto; min-width: 72px; height: 32px; padding: 0 8px"
          :value="size"
          aria-label="Sayfa boyutu"
          @change="handlePageSizeChange"
        >
          <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </label>
      <template v-if="totalPages > 1">
        <RcButton variant="secondary" :disabled="page === 0" @click="handlePageChange(page - 1)">
          Önceki
        </RcButton>
        <span style="font-size: 13px; color: var(--rc-text-muted)">
          Sayfa {{ page + 1 }} / {{ totalPages }} · {{ totalElements }} kayıt
        </span>
        <RcButton
          variant="secondary"
          :disabled="page + 1 >= totalPages"
          @click="handlePageChange(page + 1)"
        >
          Sonraki
        </RcButton>
      </template>
      <span v-else style="font-size: 13px; color: var(--rc-text-muted)">
        {{ totalElements }} kayıt
      </span>
    </div>

    <!-- Toplu seçim -->
    <div v-if="selected.size > 0" class="rc-bulkbar">
      <div class="rc-bulkbar__count">
        {{ selected.size }} araç seçili<small> · toplu işlem</small>
      </div>
      <div class="rc-bulkbar__spacer" />
      <button type="button" @click="toast.info(`${selected.size} araç bakıma alındı (yakında)`); clearSelection()">
        <RcIcon name="wrench" :size="14" />
        Bakıma al
      </button>
      <button type="button" @click="toast.info('Dışa aktarma yakında')">
        <RcIcon name="download" :size="14" />
        Dışa aktar
      </button>
      <button type="button" @click="clearSelection">
        <RcIcon name="close" :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.rcv-active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.rcv-active-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 10px;
  border-radius: 99px;
  background: var(--rc-blue-50);
  color: var(--rc-blue-700);
  font-size: 12px;
  font-weight: 500;
}

.rcv-active-pill__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
}

.rcv-active-pill__clear:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.06);
}

.rcv-active-filters__clear-all {
  padding: 0;
  border: none;
  background: none;
  color: var(--rc-text-muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.rcv-filter-trigger {
  position: relative;
}

.rcv-filter-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.rcv-filters-popover {
  position: absolute;
  left: 0;
  top: calc(100% + 6px);
  z-index: 21;
  width: min(320px, calc(100vw - 32px));
  padding: 14px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-10);
  box-shadow: var(--rc-shadow-popover);
}

.rcv-filters-popover--sort {
  left: auto;
  right: 0;
  width: 200px;
  padding: 4px;
}

.rcv-filters-popover__section + .rcv-filters-popover__section {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--rc-border);
}

.rcv-filters-popover__label {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--rc-text-muted);
}

.rcv-filters-popover__months {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.rcv-month-chip {
  padding: 5px 10px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-6);
  background: var(--rc-surface);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.rcv-month-chip:hover {
  border-color: var(--rc-blue-300);
}

.rcv-month-chip--on {
  border-color: var(--rc-blue-400);
  background: var(--rc-blue-50);
  color: var(--rc-blue-700);
}

.rcv-filters-popover__dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.rcv-filters-popover__dates :deep(.rc-field) {
  min-width: 0;
}

.rcv-quick-filter {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px dashed var(--rc-border);
  border-radius: var(--rc-r-6);
  background: transparent;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.rcv-quick-filter--on {
  border-style: solid;
  border-color: var(--rc-blue-400);
  background: var(--rc-blue-50);
  color: var(--rc-blue-700);
}

.rcv-filters-popover__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--rc-border);
}

.rcv-filter-select {
  width: 100%;
}
</style>
