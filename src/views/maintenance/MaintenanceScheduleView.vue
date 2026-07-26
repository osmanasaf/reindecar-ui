<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { maintenanceSchedulesApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import { RcPageHeader, RcButton, RcBadge, RcEmpty, RcError, RcModal, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { SearchableSelect } from '@/components/common'
import { formatDate, formatKm, formatPlate, fmtNum } from '@/utils/format'
import { MaintenanceType } from '@/types/enums'
import {
  MAINTENANCE_SCHEDULE_STATUS_LABELS,
  MAINTENANCE_SCHEDULE_STATUS_VARIANTS,
  MAINTENANCE_SCHEDULE_TYPE_LABELS,
  type MaintenanceScheduleStatus,
  type UpcomingMaintenance,
} from '@/types/entities'
import MaintenanceScheduleCreateModal from '@/components/maintenance/MaintenanceScheduleCreateModal.vue'
import MaintenanceScheduleEditModal from '@/components/maintenance/MaintenanceScheduleEditModal.vue'
import MaintenanceScheduleCompleteModal from '@/components/maintenance/MaintenanceScheduleCompleteModal.vue'

const DAY_PRESETS = [7, 30, 90]
const CUSTOM_DAYS_MIN = 1
const CUSTOM_DAYS_MAX = 365

const BAR_MIN_PCT = 4
const BAR_MAX_PCT = 100

/** Kalan gün sayısı bilinmeyen kayıtlar aciliyet sıralamasının sonuna gider. */
const UNKNOWN_DAYS_SORT_KEY = Number.MAX_SAFE_INTEGER

const STATUS_ORDER: Record<MaintenanceScheduleStatus, number> = {
  OVERDUE: 0,
  DUE: 1,
  SCHEDULED: 2,
  COMPLETED: 3,
  CANCELLED: 4,
}

const MAINTENANCE_TYPE_DOT_COLORS: Record<MaintenanceType, string> = {
  [MaintenanceType.SERVICE]: 'var(--rc-blue-500)',
  [MaintenanceType.OIL_CHANGE]: 'var(--rc-warning-500)',
  [MaintenanceType.INSPECTION]: 'var(--rc-purple-500)',
  [MaintenanceType.BRAKE_SERVICE]: 'var(--rc-danger-500)',
  [MaintenanceType.TIRE_CHANGE]: 'var(--rc-info-500)',
  [MaintenanceType.FILTER_CHANGE]: 'var(--rc-text-muted)',
  [MaintenanceType.REPAIR]: 'var(--rc-blue-400)',
  [MaintenanceType.PART_REPLACEMENT]: 'var(--rc-info-500)',
  [MaintenanceType.PAINT]: 'var(--rc-purple-500)',
  [MaintenanceType.ELECTRICAL_REPAIR]: 'var(--rc-warning-500)',
  [MaintenanceType.BODY_WORK]: 'var(--rc-blue-700)',
  [MaintenanceType.OTHER]: 'var(--rc-text-faint)',
}

type BarTone = 'late' | 'due' | 'ahead'

const BAR_FILL: Record<BarTone, string> = {
  late: 'var(--rc-danger-500)',
  due: 'var(--rc-warning-500)',
  ahead: 'var(--rc-blue-200)',
}

const BAR_LABEL_COLOR: Record<BarTone, string> = {
  late: 'var(--rc-danger-700)',
  due: 'var(--rc-warning-700)',
  ahead: 'var(--rc-text-muted)',
}

type RemainingBar = {
  key: 'days' | 'km'
  /** Planın bakım aralığı bilinmiyorsa null — çubuk çizilmez, yalnız etiket gösterilir. */
  pct: number | null
  fill: string
  labelColor: string
  label: string
}

type MaintenanceRow = {
  item: UpcomingMaintenance
  typeLabel: string
  typeColor: string
  bars: RemainingBar[]
}

type StatusCard = {
  key: 'ALL' | MaintenanceScheduleStatus
  label: string
  count: number
  accent: string
}

const toast = useToast()
const { translateMaintenanceType } = useEnumTranslations()

const items = ref<UpcomingMaintenance[]>([])
const loading = ref(true)
const loadError = ref(false)

const selectedDays = ref<number | null>(null)
const customDays = ref<number | null>(null)
const typeFilter = ref<MaintenanceType | null>(null)
const statusFilter = ref<'ALL' | MaintenanceScheduleStatus>('ALL')

const createOpen = ref(false)
const completeTarget = ref<UpcomingMaintenance | null>(null)
const editTarget = ref<UpcomingMaintenance | null>(null)
const cancelTarget = ref<UpcomingMaintenance | null>(null)
const cancelling = ref(false)

const maintenanceTypeOptions = Object.values(MaintenanceType).map((value) => ({
  value,
  label: translateMaintenanceType(value),
}))

const overdueCount = computed(() => items.value.filter((item) => item.status === 'OVERDUE').length)

const showOverdueBanner = computed(() => overdueCount.value > 0 && statusFilter.value !== 'OVERDUE')

/** Sayaçlar durum filtresinden bağımsız toplamları gösterir. */
const statusCards = computed<StatusCard[]>(() => {
  const countOf = (status: MaintenanceScheduleStatus) =>
    items.value.filter((item) => item.status === status).length
  return [
    { key: 'ALL', label: 'Tümü', count: items.value.length, accent: 'var(--rc-text)' },
    { key: 'OVERDUE', label: MAINTENANCE_SCHEDULE_STATUS_LABELS.OVERDUE, count: overdueCount.value, accent: 'var(--rc-danger-700)' },
    { key: 'DUE', label: MAINTENANCE_SCHEDULE_STATUS_LABELS.DUE, count: countOf('DUE'), accent: 'var(--rc-warning-700)' },
    { key: 'SCHEDULED', label: MAINTENANCE_SCHEDULE_STATUS_LABELS.SCHEDULED, count: countOf('SCHEDULED'), accent: 'var(--rc-info-700)' },
  ]
})

const filteredItems = computed(() => {
  if (statusFilter.value === 'ALL') return items.value
  return items.value.filter((item) => item.status === statusFilter.value)
})

/** Aciliyet sırası: gecikmiş → zamanı gelmiş → planlı, sonra kalan gün artan. */
const sortedItems = computed(() =>
  [...filteredItems.value].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.daysRemaining ?? UNKNOWN_DAYS_SORT_KEY) - (b.daysRemaining ?? UNKNOWN_DAYS_SORT_KEY),
  ),
)

const rows = computed<MaintenanceRow[]>(() =>
  sortedItems.value.map((item) => ({
    item,
    typeLabel: translateMaintenanceType(item.maintenanceType),
    typeColor: MAINTENANCE_TYPE_DOT_COLORS[item.maintenanceType],
    bars: [daysBar(item), kmBar(item)].filter((bar): bar is RemainingBar => bar !== null),
  })),
)

/** Aralığın ne kadarının tükendiği; aralık bilinmiyorsa oran hesaplanamaz. */
function barPercent(remaining: number, interval: number | null): number | null {
  if (interval == null || interval <= 0) return null
  const consumed = ((interval - remaining) / interval) * 100
  return Math.min(BAR_MAX_PCT, Math.max(BAR_MIN_PCT, Math.round(consumed)))
}

function daysTone(item: UpcomingMaintenance): BarTone {
  if (item.status === 'OVERDUE' || (item.daysRemaining ?? 0) < 0) return 'late'
  if (item.status === 'DUE') return 'due'
  return 'ahead'
}

function daysBar(item: UpcomingMaintenance): RemainingBar | null {
  const days = item.daysRemaining
  if (days == null) return null
  const tone = daysTone(item)
  return {
    key: 'days',
    pct: barPercent(days, item.maintenanceIntervalDays),
    fill: BAR_FILL[tone],
    labelColor: BAR_LABEL_COLOR[tone],
    label: days < 0 ? `${-days} gün gecikti` : `${days} gün kaldı`,
  }
}

function kmBar(item: UpcomingMaintenance): RemainingBar | null {
  const km = item.kmRemaining
  if (km == null) return null
  const tone: BarTone = km < 0 ? 'late' : 'ahead'
  return {
    key: 'km',
    pct: barPercent(km, item.maintenanceIntervalKm),
    fill: BAR_FILL[tone],
    labelColor: BAR_LABEL_COLOR[tone],
    label: km < 0 ? `${fmtNum(-km)} km aşıldı` : `${fmtNum(km)} km kaldı`,
  }
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    items.value =
      (await maintenanceSchedulesApi.getUpcoming({
        days: selectedDays.value ?? undefined,
        types: typeFilter.value ? [typeFilter.value] : undefined,
      })) ?? []
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

watch([selectedDays, typeFilter], () => {
  void load()
})

function applyDaysPreset(days: number | null) {
  customDays.value = null
  selectedDays.value = days
}

function applyCustomDays() {
  const value = customDays.value
  if (value == null) return
  if (value < CUSTOM_DAYS_MIN || value > CUSTOM_DAYS_MAX) {
    toast.error(`Gün penceresi ${CUSTOM_DAYS_MIN}-${CUSTOM_DAYS_MAX} arasında olmalıdır`)
    return
  }
  selectedDays.value = value
}

function onCreated() {
  createOpen.value = false
  void load()
}

function onCompleted() {
  completeTarget.value = null
  void load()
}

function onUpdated() {
  editTarget.value = null
  void load()
}

async function confirmCancel() {
  if (!cancelTarget.value) return
  cancelling.value = true
  try {
    await maintenanceSchedulesApi.cancel(cancelTarget.value.scheduleId)
    toast.success('Bakım planı iptal edildi')
    cancelTarget.value = null
    await load()
  } catch (error: unknown) {
    toast.apiError(error, 'Bakım planı iptal edilemedi')
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="rc-page">
    <RcPageHeader title="Bakım Takibi" subtitle="Bakımı yaklaşan ve geciken araçları izle">
      <template #actions>
        <RcButton variant="primary" @click="createOpen = true">
          <RcIcon name="plus" :size="15" />
          Plan Oluştur
        </RcButton>
      </template>
    </RcPageHeader>

    <div v-if="showOverdueBanner" class="rc-alert rc-alert--danger msv-banner" role="alert">
      <span class="msv-banner__dot" aria-hidden="true" />
      <span class="msv-banner__text">
        <strong>{{ overdueCount }} aracın bakımı gecikti.</strong>
      </span>
      <RcButton
        size="xs"
        variant="secondary"
        class="msv-banner__action"
        @click="statusFilter = 'OVERDUE'"
      >
        Gecikenleri göster
      </RcButton>
    </div>

    <div class="msv-stats">
      <button
        v-for="card in statusCards"
        :key="card.key"
        type="button"
        class="msv-stat"
        :class="{ 'msv-stat--on': statusFilter === card.key }"
        :aria-pressed="statusFilter === card.key"
        @click="statusFilter = card.key"
      >
        <span
          class="msv-stat__label"
          :style="statusFilter === card.key ? { color: card.accent } : undefined"
        >
          {{ card.label }}
        </span>
        <span class="msv-stat__value">
          <span class="msv-stat__count rc-num" :style="{ color: card.accent }">{{ card.count }}</span>
          <span class="msv-stat__unit">araç</span>
        </span>
      </button>
    </div>

    <div class="msv-toolbar">
      <div class="msv-chips">
        <button
          type="button"
          class="msv-chip"
          :class="{ 'msv-chip--on': selectedDays === null }"
          @click="applyDaysPreset(null)"
        >
          Firma ayarı
        </button>
        <button
          v-for="preset in DAY_PRESETS"
          :key="preset"
          type="button"
          class="msv-chip"
          :class="{ 'msv-chip--on': selectedDays === preset }"
          @click="applyDaysPreset(preset)"
        >
          {{ preset }} gün
        </button>
      </div>

      <input
        v-model.number="customDays"
        type="number"
        class="msv-days-input"
        :min="CUSTOM_DAYS_MIN"
        :max="CUSTOM_DAYS_MAX"
        placeholder="Özel gün"
        @change="applyCustomDays"
        @keydown.enter.prevent="applyCustomDays"
      />

      <div class="msv-type-filter">
        <SearchableSelect
          v-model="typeFilter"
          :options="maintenanceTypeOptions"
          placeholder="Tüm bakım tipleri"
          search-placeholder="Bakım tipi ara…"
          clearable
        />
      </div>

      <span class="msv-count">{{ rows.length }} kayıt</span>
    </div>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="8" />

    <RcError v-else-if="loadError" message="Bakım planları yüklenemedi. Lütfen tekrar deneyin." @retry="load" />

    <div v-else-if="rows.length === 0" class="msv-empty">
      <RcEmpty
        title="Bu pencerede bakımı yaklaşan araç yok"
        description="Gün penceresini genişletebilir veya yeni bir bakım planı oluşturabilirsin"
      >
        <template #icon><RcIcon name="wrench" :size="32" /></template>
      </RcEmpty>
    </div>

    <div v-else class="msv-table-wrap rc-animate-in">
      <div class="msv-table">
        <div class="msv-row msv-row--head">
          <span>Plaka</span>
          <span>Araç</span>
          <span>Bakım tipi</span>
          <span>Plan</span>
          <span>Sonraki</span>
          <span>Kalan</span>
          <span>Durum</span>
          <span></span>
        </div>

        <div v-for="row in rows" :key="row.item.scheduleId" class="msv-row msv-row--body">
          <RouterLink :to="`/vehicles/${row.item.vehicleId}`" class="msv-plate rc-mono">
            {{ formatPlate(row.item.plateNumber) }}
          </RouterLink>
          <span class="msv-model">{{ row.item.brand }} {{ row.item.model }}</span>
          <span class="msv-type">
            <span class="msv-type__dot" :style="{ background: row.typeColor }" aria-hidden="true" />
            <span class="msv-type__label">{{ row.typeLabel }}</span>
          </span>
          <span class="msv-muted">{{ MAINTENANCE_SCHEDULE_TYPE_LABELS[row.item.scheduleType] }}</span>
          <span class="msv-next">
            <span class="msv-next__date rc-mono">
              {{ row.item.nextMaintenanceDate ? formatDate(row.item.nextMaintenanceDate) : '—' }}
            </span>
            <span class="msv-next__km rc-mono rc-num">
              {{ row.item.nextMaintenanceKm != null ? formatKm(row.item.nextMaintenanceKm) : '—' }}
            </span>
          </span>
          <span class="msv-remaining">
            <span v-for="bar in row.bars" :key="bar.key" class="msv-bar">
              <span v-if="bar.pct != null" class="msv-bar__track" aria-hidden="true">
                <span class="msv-bar__fill" :style="{ width: `${bar.pct}%`, background: bar.fill }" />
              </span>
              <span
                class="msv-bar__label"
                :class="{ 'msv-bar__label--solo': bar.pct == null }"
                :style="{ color: bar.labelColor }"
              >
                {{ bar.label }}
              </span>
            </span>
            <span v-if="row.bars.length === 0" class="msv-muted">—</span>
          </span>
          <span>
            <RcBadge :variant="MAINTENANCE_SCHEDULE_STATUS_VARIANTS[row.item.status]">
              {{ MAINTENANCE_SCHEDULE_STATUS_LABELS[row.item.status] }}
            </RcBadge>
          </span>
          <span class="msv-actions">
            <RcButton size="xs" variant="secondary" @click="completeTarget = row.item">Tamamla</RcButton>
            <RcButton size="xs" variant="ghost" @click="editTarget = row.item">Düzenle</RcButton>
            <RcButton size="xs" variant="ghost" class="msv-cancel-btn" @click="cancelTarget = row.item">İptal</RcButton>
          </span>
        </div>
      </div>
    </div>

    <MaintenanceScheduleCreateModal :open="createOpen" @close="createOpen = false" @created="onCreated" />

    <MaintenanceScheduleCompleteModal
      :open="completeTarget != null"
      :schedule="completeTarget"
      @close="completeTarget = null"
      @completed="onCompleted"
    />

    <MaintenanceScheduleEditModal
      :open="editTarget != null"
      :schedule="editTarget"
      @close="editTarget = null"
      @updated="onUpdated"
    />

    <RcModal
      :open="cancelTarget != null"
      title="Planı İptal Et"
      :subtitle="cancelTarget ? `${cancelTarget.plateNumber} · ${translateMaintenanceType(cancelTarget.maintenanceType)}` : undefined"
      @close="cancelTarget = null"
    >
      <p class="msv-cancel-text">Bu bakım planı iptal edilecek ve hatırlatmalar durdurulacak. Devam etmek istiyor musun?</p>
      <template #footer>
        <RcButton variant="ghost" @click="cancelTarget = null">Vazgeç</RcButton>
        <RcButton variant="danger" :loading="cancelling" @click="confirmCancel">Planı İptal Et</RcButton>
      </template>
    </RcModal>
  </div>
</template>

<style scoped>
/* ───────── Gecikme banner'ı ───────── */
.msv-banner {
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--rc-r-10);
  margin-bottom: 14px;
}
.msv-banner__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--rc-r-full);
  background: var(--rc-danger-500);
  flex-shrink: 0;
}
.msv-banner__text {
  flex: 1;
  min-width: 0;
}
.msv-banner__action {
  flex-shrink: 0;
  color: var(--rc-danger-700);
}

/* ───────── Durum özet kartları ───────── */
.msv-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}
.msv-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  text-align: left;
  padding: 14px 16px;
  background: var(--rc-surface);
  border: 1.5px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-12);
  box-shadow: var(--rc-shadow-sm);
  transition: border-color var(--rc-dur-fast) var(--rc-ease-out),
              box-shadow var(--rc-dur-fast) var(--rc-ease-out);
}
.msv-stat:hover {
  border-color: var(--rc-border-strong);
  box-shadow: var(--rc-shadow-md);
}
.msv-stat--on {
  border-color: var(--rc-text);
  box-shadow: 0 0 0 1px var(--rc-text);
}
.msv-stat__label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--rc-tracking-caps);
  color: var(--rc-text-faint);
}
.msv-stat__value {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.msv-stat__count {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: var(--rc-tracking-tight);
}
.msv-stat__unit {
  font-size: 12px;
  color: var(--rc-text-faint);
}

/* ───────── Araç çubuğu ───────── */
.msv-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.msv-chips {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-10);
  box-shadow: var(--rc-shadow-sm);
}
.msv-chip {
  height: 28px;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: var(--rc-r-6);
  color: var(--rc-text-muted);
  background: transparent;
  transition: color var(--rc-dur-fast), background var(--rc-dur-fast);
}
.msv-chip:hover {
  color: var(--rc-text);
}
.msv-chip--on {
  color: var(--rc-text-inverse);
  background: var(--rc-text);
}
.msv-days-input {
  width: 96px;
  height: 36px;
  padding: 0 10px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-8);
  font-size: 13px;
  outline: none;
  box-shadow: var(--rc-shadow-sm);
  transition: border-color var(--rc-dur-base), box-shadow var(--rc-dur-base);
}
.msv-days-input:focus {
  border-color: var(--rc-accent);
  box-shadow: var(--rc-focus-ring);
}
.msv-type-filter {
  min-width: 210px;
}
.msv-count {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--rc-text-muted);
}

/* ───────── Boş durum ───────── */
.msv-empty {
  background: var(--rc-surface);
  border: 1px dashed var(--rc-border);
  border-radius: var(--rc-r-12);
}

/* ───────── Tablo ───────── */
.msv-table-wrap {
  overflow-x: auto;
}
.msv-table {
  min-width: 1080px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-12);
  box-shadow: var(--rc-shadow-sm);
  overflow: hidden;
}
.msv-row {
  display: grid;
  grid-template-columns: 110px 1.1fr 1.15fr 88px 130px 1.5fr 108px 196px;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--rc-border-subtle);
}
.msv-row--head {
  padding: 10px 16px;
  background: var(--rc-surface-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--rc-tracking-caps);
  text-transform: uppercase;
  color: var(--rc-text-faint);
}
.msv-row--body {
  font-size: 13px;
  transition: background var(--rc-dur-fast);
}
.msv-row--body:hover {
  background: var(--rc-surface-hover);
}
.msv-row--body:last-child {
  border-bottom: none;
}

.msv-plate {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--rc-text);
  text-decoration: none;
}
.msv-plate:hover {
  color: var(--rc-accent);
  text-decoration: underline;
}
.msv-model {
  min-width: 0;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msv-type {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.msv-type__dot {
  width: 7px;
  height: 7px;
  border-radius: var(--rc-r-full);
  flex-shrink: 0;
}
.msv-type__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msv-muted {
  font-size: 12px;
  color: var(--rc-text-muted);
}
.msv-next {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.msv-next__date {
  font-size: 12px;
  color: var(--rc-text-soft);
}
.msv-next__km {
  font-size: 11.5px;
  color: var(--rc-text-faint);
}

/* ───────── Kalan çubukları ───────── */
.msv-remaining {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  padding-right: 8px;
}
.msv-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.msv-bar__track {
  display: block;
  flex: 1;
  min-width: 0;
  height: 4px;
  border-radius: var(--rc-r-full);
  background: var(--rc-donut-track);
  overflow: hidden;
}
.msv-bar__fill {
  display: block;
  height: 100%;
  border-radius: var(--rc-r-full);
}
.msv-bar__label {
  min-width: 86px;
  font-size: 11.5px;
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
}
/* Bakım aralığı bilinmeyen planda çubuk yok; etiket hücreyi kaplar. */
.msv-bar__label--solo {
  flex: 1;
  text-align: left;
}

.msv-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.msv-cancel-btn {
  color: var(--rc-danger-700);
}
.msv-cancel-text {
  font-size: 13.5px;
  color: var(--rc-text-soft);
}

@media (max-width: 900px) {
  .msv-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
