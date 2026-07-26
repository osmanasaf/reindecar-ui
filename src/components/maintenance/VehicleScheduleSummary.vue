<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { maintenanceSchedulesApi } from '@/api'
import { useToast, useEnumTranslations, useFeatures } from '@/composables'
import { RcButton, RcBadge, RcSkeletonText } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate, formatKm, fmtNum } from '@/utils/format'
import {
  MAINTENANCE_SCHEDULE_STATUS_LABELS,
  MAINTENANCE_SCHEDULE_STATUS_VARIANTS,
  MAINTENANCE_SCHEDULE_TYPE_LABELS,
  type CompletableSchedule,
  type MaintenanceSchedule,
} from '@/types/entities'
import MaintenanceScheduleCreateModal from './MaintenanceScheduleCreateModal.vue'
import MaintenanceScheduleCompleteModal from './MaintenanceScheduleCompleteModal.vue'

const MS_PER_DAY = 86_400_000

const props = defineProps<{
  vehicleId: number
  currentKm: number
}>()

const toast = useToast()
const { translateMaintenanceType } = useEnumTranslations()
const { isEnabled } = useFeatures()

const schedules = ref<MaintenanceSchedule[]>([])
const loading = ref(true)
const createOpen = ref(false)
const completeTarget = ref<MaintenanceSchedule | null>(null)

const activeSchedules = computed(() =>
  schedules.value.filter((item) => item.status !== 'COMPLETED' && item.status !== 'CANCELLED'),
)

const completableTarget = computed<CompletableSchedule | null>(() => {
  if (!completeTarget.value) return null
  return { scheduleId: completeTarget.value.id, vehicleCurrentKm: props.currentKm }
})

function daysRemaining(schedule: MaintenanceSchedule): number | null {
  if (!schedule.nextMaintenanceDate) return null
  const next = new Date(`${schedule.nextMaintenanceDate.slice(0, 10)}T00:00:00`)
  return Math.ceil((next.getTime() - Date.now()) / MS_PER_DAY)
}

function kmRemaining(schedule: MaintenanceSchedule): number | null {
  if (schedule.nextMaintenanceKm == null) return null
  return schedule.nextMaintenanceKm - props.currentKm
}

function remainingVariant(schedule: MaintenanceSchedule, remaining: number | null): 'warning' | 'danger' | 'default' {
  if (schedule.status === 'OVERDUE' || (remaining != null && remaining < 0)) return 'danger'
  if (schedule.status === 'DUE') return 'warning'
  return 'default'
}

function daysText(days: number): string {
  return days < 0 ? `${-days} gün gecikti` : `${days} gün kaldı`
}

function kmText(km: number): string {
  return km < 0 ? `${fmtNum(-km)} km aşıldı` : `${fmtNum(km)} km kaldı`
}

async function loadSchedules() {
  loading.value = true
  try {
    schedules.value = await maintenanceSchedulesApi.getByVehicle(props.vehicleId)
  } catch (error: unknown) {
    toast.apiError(error, 'Bakım planları yüklenemedi')
  } finally {
    loading.value = false
  }
}

function onCreated() {
  createOpen.value = false
  void loadSchedules()
}

function onCompleted() {
  completeTarget.value = null
  void loadSchedules()
}

onMounted(() => {
  if (isEnabled('MAINTENANCE_REMINDERS')) void loadSchedules()
})
</script>

<template>
  <div v-if="isEnabled('MAINTENANCE_REMINDERS')" class="rc-card vss">
    <div class="rc-card__head">
      <div>
        <div class="rc-card__title">Periyodik bakım planları</div>
        <div class="vss__sub">Km ve süre bazlı hatırlatma planları</div>
      </div>
      <RcButton variant="ghost" size="sm" @click="createOpen = true">
        <RcIcon name="plus" />
        Plan Oluştur
      </RcButton>
    </div>

    <RcSkeletonText v-if="loading" :lines="2" />

    <div v-else-if="activeSchedules.length === 0" class="vss__empty">
      Periyodik bakım planı yok
      <RcButton variant="secondary" size="sm" @click="createOpen = true">Plan Oluştur</RcButton>
    </div>

    <div v-else class="vss__list">
      <div v-for="schedule in activeSchedules" :key="schedule.id" class="vss__row">
        <div class="vss__main">
          <span class="vss__type">{{ translateMaintenanceType(schedule.maintenanceType) }}</span>
          <span class="vss__plan">{{ MAINTENANCE_SCHEDULE_TYPE_LABELS[schedule.scheduleType] }}</span>
        </div>
        <div class="vss__target">
          <span v-if="schedule.nextMaintenanceDate" class="rc-mono">{{ formatDate(schedule.nextMaintenanceDate) }}</span>
          <span v-if="schedule.nextMaintenanceKm != null" class="rc-num">{{ formatKm(schedule.nextMaintenanceKm) }}</span>
          <span v-if="!schedule.nextMaintenanceDate && schedule.nextMaintenanceKm == null">—</span>
        </div>
        <div class="vss__remaining">
          <RcBadge
            v-if="daysRemaining(schedule) != null"
            :variant="remainingVariant(schedule, daysRemaining(schedule))"
          >
            {{ daysText(daysRemaining(schedule) as number) }}
          </RcBadge>
          <RcBadge
            v-if="kmRemaining(schedule) != null"
            :variant="remainingVariant(schedule, kmRemaining(schedule))"
          >
            {{ kmText(kmRemaining(schedule) as number) }}
          </RcBadge>
        </div>
        <RcBadge :variant="MAINTENANCE_SCHEDULE_STATUS_VARIANTS[schedule.status]">
          {{ MAINTENANCE_SCHEDULE_STATUS_LABELS[schedule.status] }}
        </RcBadge>
        <RcButton size="xs" variant="secondary" @click="completeTarget = schedule">Tamamla</RcButton>
      </div>
    </div>

    <MaintenanceScheduleCreateModal
      :open="createOpen"
      :preselected-vehicle-id="vehicleId"
      @close="createOpen = false"
      @created="onCreated"
    />

    <MaintenanceScheduleCompleteModal
      :open="completeTarget != null"
      :schedule="completableTarget"
      @close="completeTarget = null"
      @completed="onCompleted"
    />
  </div>
</template>

<style scoped>
.vss__sub {
  font-size: 12.5px;
  color: var(--rc-text-muted);
  margin-top: 2px;
}
.vss__empty {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0 4px;
  font-size: 13px;
  color: var(--rc-text-muted);
}
.vss__list {
  display: flex;
  flex-direction: column;
}
.vss__row {
  display: grid;
  grid-template-columns: minmax(150px, 1.2fr) minmax(120px, 1fr) minmax(180px, 1.4fr) 110px auto;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--rc-border-subtle);
  font-size: 13px;
}
.vss__row:last-child {
  border-bottom: none;
}
.vss__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.vss__type {
  font-weight: 600;
}
.vss__plan {
  font-size: 12px;
  color: var(--rc-text-muted);
}
.vss__target {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12.5px;
  color: var(--rc-text-soft);
}
.vss__remaining {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
@media (max-width: 720px) {
  .vss__row {
    grid-template-columns: 1fr auto;
    grid-auto-flow: row dense;
  }
}
</style>
