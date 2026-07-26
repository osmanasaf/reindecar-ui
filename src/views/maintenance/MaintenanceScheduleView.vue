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

const statusOptions: Array<{ value: 'ALL' | MaintenanceScheduleStatus; label: string }> = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'SCHEDULED', label: MAINTENANCE_SCHEDULE_STATUS_LABELS.SCHEDULED },
  { value: 'DUE', label: MAINTENANCE_SCHEDULE_STATUS_LABELS.DUE },
  { value: 'OVERDUE', label: MAINTENANCE_SCHEDULE_STATUS_LABELS.OVERDUE },
]

const filteredItems = computed(() => {
  if (statusFilter.value === 'ALL') return items.value
  return items.value.filter((item) => item.status === statusFilter.value)
})

async function load() {
  loading.value = true
  loadError.value = false
  try {
    items.value = await maintenanceSchedulesApi.getUpcoming({
      days: selectedDays.value ?? undefined,
      types: typeFilter.value ? [typeFilter.value] : undefined,
    })
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

function daysBadgeVariant(item: UpcomingMaintenance): 'warning' | 'danger' | 'default' {
  if (item.status === 'OVERDUE' || (item.daysRemaining != null && item.daysRemaining < 0)) return 'danger'
  if (item.status === 'DUE') return 'warning'
  return 'default'
}

function daysBadgeText(days: number): string {
  return days < 0 ? `${-days} gün gecikti` : `${days} gün kaldı`
}

function kmBadgeText(km: number): string {
  return km < 0 ? `${fmtNum(-km)} km aşıldı` : `${fmtNum(km)} km kaldı`
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

      <div class="msv-chips">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          type="button"
          class="msv-chip"
          :class="{ 'msv-chip--on': statusFilter === option.value }"
          @click="statusFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="7" />

    <RcError v-else-if="loadError" message="Bakım planları yüklenemedi. Lütfen tekrar deneyin." @retry="load" />

    <RcEmpty
      v-else-if="filteredItems.length === 0"
      title="Bu pencerede bakımı yaklaşan araç yok"
      description="Gün penceresini genişletebilir veya yeni bir bakım planı oluşturabilirsin"
    >
      <template #icon><RcIcon name="wrench" :size="32" /></template>
    </RcEmpty>

    <div v-else class="msv-table-wrap rc-animate-in">
      <div class="msv-table">
        <div class="msv-row msv-row--head">
          <span>Plaka</span>
          <span>Marka Model</span>
          <span>Bakım Tipi</span>
          <span>Plan Tipi</span>
          <span>Sonraki Tarih</span>
          <span>Sonraki KM</span>
          <span>Kalan</span>
          <span>Durum</span>
          <span></span>
        </div>

        <div v-for="item in filteredItems" :key="item.scheduleId" class="msv-row msv-row--body">
          <RouterLink :to="`/vehicles/${item.vehicleId}`" class="msv-plate rc-mono">
            {{ formatPlate(item.plateNumber) }}
          </RouterLink>
          <span class="msv-model">{{ item.brand }} {{ item.model }}</span>
          <span>{{ translateMaintenanceType(item.maintenanceType) }}</span>
          <span class="msv-muted">{{ MAINTENANCE_SCHEDULE_TYPE_LABELS[item.scheduleType] }}</span>
          <span class="msv-muted rc-mono">{{ item.nextMaintenanceDate ? formatDate(item.nextMaintenanceDate) : '—' }}</span>
          <span class="msv-muted rc-num">{{ item.nextMaintenanceKm != null ? formatKm(item.nextMaintenanceKm) : '—' }}</span>
          <span class="msv-remaining">
            <RcBadge v-if="item.daysRemaining != null" :variant="daysBadgeVariant(item)">
              {{ daysBadgeText(item.daysRemaining) }}
            </RcBadge>
            <RcBadge v-if="item.kmRemaining != null" :variant="item.kmRemaining < 0 ? 'danger' : 'default'">
              {{ kmBadgeText(item.kmRemaining) }}
            </RcBadge>
            <span v-if="item.daysRemaining == null && item.kmRemaining == null" class="msv-muted">—</span>
          </span>
          <span><RcBadge :variant="MAINTENANCE_SCHEDULE_STATUS_VARIANTS[item.status]">{{ MAINTENANCE_SCHEDULE_STATUS_LABELS[item.status] }}</RcBadge></span>
          <span class="msv-actions">
            <RcButton size="xs" variant="secondary" @click="completeTarget = item">Tamamla</RcButton>
            <RcButton size="xs" variant="ghost" @click="editTarget = item">Düzenle</RcButton>
            <RcButton size="xs" variant="ghost" class="msv-cancel-btn" @click="cancelTarget = item">İptal</RcButton>
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
  grid-template-columns: 105px minmax(130px, 1fr) minmax(110px, 1fr) 90px 105px 95px minmax(160px, 1.3fr) 110px 208px;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--rc-border-subtle);
}
.msv-row--head {
  background: var(--rc-surface-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--rc-tracking-wide);
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msv-muted {
  font-size: 12.5px;
  color: var(--rc-text-muted);
}
.msv-remaining {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
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
</style>
