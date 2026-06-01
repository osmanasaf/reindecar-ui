<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { vehiclesApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import { RcIcon } from '@/components/icons'
import type { IconName } from '@/components/icons/iconPaths'
import type { VehicleHistory, RentalHistoryItem, DamageHistoryItem, MaintenanceHistoryItem } from '@/types'
import RentalDetailModal from './RentalDetailModal.vue'
import DamageDetailModal from './DamageDetailModal.vue'
import MaintenanceDetailModal from './MaintenanceDetailModal.vue'

interface TimelineEvent {
  id: string
  type: 'rental' | 'damage' | 'maintenance' | 'status'
  date: string
  icon: IconName
  dotClass: string
  title: string
  subtitle: string
  data: RentalHistoryItem | DamageHistoryItem | MaintenanceHistoryItem | unknown
}

const props = defineProps<{
  vehicleId: number
}>()

const toast = useToast()
const { translateDamageType, translateSeverity, translateMaintenanceType, translateVehicleStatus } = useEnumTranslations()

const history = ref<VehicleHistory | null>(null)
const loading = ref(false)

const selectedRental = ref<RentalHistoryItem | null>(null)
const selectedDamage = ref<DamageHistoryItem | null>(null)
const selectedMaintenance = ref<MaintenanceHistoryItem | null>(null)

const allEvents = computed(() => {
  if (!history.value) return []

  const events: TimelineEvent[] = []

  history.value.rentals.forEach(r => {
    events.push({
      id: `rental-${r.id}`,
      type: 'rental',
      date: r.startDate,
      icon: 'key',
      dotClass: 'rc-veh-history__dot--rental',
      title: `${r.rentalNumber} - ${r.rentalTypeDisplayName || r.rentalType}`,
      subtitle: `${r.customerName} | ${r.statusDisplayName || r.status}`,
      data: r
    })
  })

  history.value.damages.forEach(d => {
    events.push({
      id: `damage-${d.id}`,
      type: 'damage',
      date: d.reportDate,
      icon: 'warning',
      dotClass: d.repaired ? 'rc-veh-history__dot--rental' : 'rc-veh-history__dot--damage',
      title: translateDamageType(d.damageType),
      subtitle: translateSeverity(d.severity),
      data: d
    })
  })

  history.value.maintenances.forEach(m => {
    events.push({
      id: `maintenance-${m.id}`,
      type: 'maintenance',
      date: m.maintenanceDate,
      icon: 'wrench',
      dotClass: 'rc-veh-history__dot--maintenance',
      title: translateMaintenanceType(m.maintenanceType),
      subtitle: formatKm(m.currentKm),
      data: m
    })
  })

  history.value.statusChanges.forEach(s => {
    if (!s.newStatus) return
    const title = s.oldStatus
      ? `${translateVehicleStatus(s.oldStatus)} → ${translateVehicleStatus(s.newStatus)}`
      : `Başlangıç Durumu: ${translateVehicleStatus(s.newStatus)}`
    events.push({
      id: `status-${s.id}`,
      type: 'status',
      date: s.changedAt,
      icon: 'sliders',
      dotClass: '',
      title,
      subtitle: s.changedBy || 'Sistem',
      data: s
    })
  })

  return events.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
})

async function fetchHistory() {
  loading.value = true
  try {
    history.value = await vehiclesApi.getHistory(props.vehicleId)
  } catch {
    toast.error('Araç geçmişi yüklenemedi')
  } finally {
    loading.value = false
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

function openDetailModal(event: TimelineEvent) {
  if (event.type === 'status') return
  switch (event.type) {
    case 'rental':
      selectedRental.value = event.data as RentalHistoryItem
      break
    case 'damage':
      selectedDamage.value = event.data as DamageHistoryItem
      break
    case 'maintenance':
      selectedMaintenance.value = event.data as MaintenanceHistoryItem
      break
  }
}

function closeModals() {
  selectedRental.value = null
  selectedDamage.value = null
  selectedMaintenance.value = null
}

onMounted(() => {
  fetchHistory()
})
</script>

<template>
  <div class="rc-veh-history-wrap">
    <div class="rc-veh-history__header">
      <h2 class="rc-veh-history__title-main">Araç Geçmişi</h2>
      <p v-if="history" class="rc-veh-history__sub">{{ history.vehicleName }} — {{ history.vehiclePlate }}</p>
    </div>

    <div v-if="loading" class="rc-veh-history__loading">
      <div class="rc-veh-history__spinner"></div>
      <span>Yükleniyor...</span>
    </div>

    <div v-else-if="history && allEvents.length === 0" class="rc-veh-history__empty">
      <RcIcon name="inbox" />
      <p>Henüz kayıt bulunmuyor</p>
    </div>

    <div v-else-if="history" class="rc-veh-history">
      <div
        v-for="event in allEvents"
        :key="event.id"
        class="rc-veh-history__item"
        :class="{ 'rc-veh-history__item--clickable': event.type !== 'status' }"
        @click="openDetailModal(event)"
      >
        <div class="rc-veh-history__dot" :class="event.dotClass">
          <RcIcon :name="event.icon" />
        </div>
        <div class="rc-veh-history__body">
          <h4 class="rc-veh-history__title">{{ event.title }}</h4>
          <p class="rc-veh-history__meta">{{ formatDate(event.date) }} · {{ event.subtitle }}</p>
        </div>
      </div>
    </div>

    <RentalDetailModal
      :rental="selectedRental"
      :visible="selectedRental !== null"
      @close="closeModals"
    />

    <DamageDetailModal
      :damage="selectedDamage"
      :visible="selectedDamage !== null"
      @close="closeModals"
    />

    <MaintenanceDetailModal
      :maintenance="selectedMaintenance"
      :visible="selectedMaintenance !== null"
      @close="closeModals"
    />
  </div>
</template>

<style scoped>
.rc-veh-history-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rc-veh-history__header h2 {
  margin: 0 0 4px;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--rc-text);
}

.rc-veh-history__sub {
  margin: 0;
  font-size: 13px;
  color: var(--rc-text-muted);
}

.rc-veh-history__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: var(--rc-text-muted);
}

.rc-veh-history__item--clickable {
  cursor: pointer;
}

.rc-veh-history__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: var(--rc-text-muted);
}

.rc-veh-history__spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--rc-border);
  border-top-color: var(--rc-blue-500);
  border-radius: 50%;
  animation: rc-veh-spin 0.8s linear infinite;
}
</style>
