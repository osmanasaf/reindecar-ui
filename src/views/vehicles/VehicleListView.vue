<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { vehiclesApi } from '@/api'
import { usePagination, useToast } from '@/composables'
import { RcIcon } from '@/components/icons'
import {
  RcPageHeader,
  RcButton,
  RcBadge,
  RcEmpty,
  RcKbd,
  RcStatusPill,
} from '@/components/rc'
import { VehicleStatus } from '@/types'
import type { Vehicle, VehicleOverview, VehicleHistory } from '@/types'
import { fmtTRY, fmtNum } from '@/utils/format'

type FilterKey = 'all' | VehicleStatus
type ViewMode = 'table' | 'grid' | 'gantt'
type SortKey = 'plate' | 'km' | 'daily' | 'year'

const router = useRouter()
const vehicles = ref<Vehicle[]>([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref<FilterKey>('all')
const viewMode = ref<ViewMode>('table')
const sortKey = ref<SortKey>('plate')
const sortOpen = ref(false)
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

const { page, totalElements, totalPages, setPage, setTotal, getParams } = usePagination()
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
  try {
    const q = searchQuery.value.trim()
    const params = buildSortParams()
    let response

    if (q.length >= 2) {
      response = await vehiclesApi.search(q, params)
    } else if (statusFilter.value !== 'all') {
      response = await vehiclesApi.getByStatus(statusFilter.value, params)
    } else {
      response = await vehiclesApi.getAll(params)
    }

    vehicles.value = response.content
    setTotal(response.totalElements, response.totalPages)
    selected.value = new Set()
  } catch {
    toast.error('Araçlar yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
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

function handlePageChange(newPage: number) {
  setPage(newPage)
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
  await fetchOverview()
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

      <span style="margin-left: auto" />

      <div style="position: relative">
        <button type="button" class="rc-chip" style="border-style: dashed" @click="sortOpen = !sortOpen">
          <RcIcon name="chevronDown" :size="14" />
          {{ sortLabels[sortKey] }}
        </button>
        <template v-if="sortOpen">
          <div
            style="position: fixed; inset: 0; z-index: 5"
            @click="sortOpen = false"
          />
          <div
            style="
              position: absolute;
              right: 0;
              top: calc(100% + 4px);
              background: var(--rc-surface);
              border: 1px solid var(--rc-border);
              border-radius: var(--rc-r-8);
              box-shadow: var(--rc-shadow-popover);
              padding: 4px;
              min-width: 200px;
              z-index: 6;
            "
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

    <div v-if="loading" class="rc-skeleton rc-card-skeleton" style="height: 320px" />

    <RcEmpty
      v-else-if="vehicles.length === 0"
      title="Bu filtreyle eşleşen araç yok"
      description="Kaydedilmiş görünümü değiştir veya filtreleri sıfırla"
    >
      <template #icon>
        <RcIcon name="search" :size="32" />
      </template>
      <template #action>
        <RcButton variant="secondary" @click="setSavedView('all')">Tüm filoyu göster</RcButton>
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
        <tbody>
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
        </tbody>
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
      v-if="!loading && vehicles.length > 0 && totalPages > 1"
      class="rc-filterbar"
      style="justify-content: center; margin-top: 20px"
    >
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
