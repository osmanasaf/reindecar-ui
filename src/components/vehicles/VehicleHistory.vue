<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { vehiclesApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import type { VehicleHistory, RentalHistoryItem, DamageHistoryItem, MaintenanceHistoryItem } from '@/types'
import RentalDetailModal from './RentalDetailModal.vue'
import DamageDetailModal from './DamageDetailModal.vue'
import MaintenanceDetailModal from './MaintenanceDetailModal.vue'

interface TimelineEvent {
  id: string
  type: 'rental' | 'damage' | 'maintenance' | 'status'
  date: string
  icon: string
  color: string
  title: string
  subtitle: string
  data: any
}

const props = defineProps<{
  vehicleId: number
}>()

const toast = useToast()
const { translateDamageType, translateSeverity, translateMaintenanceType } = useEnumTranslations()

const history = ref<VehicleHistory | null>(null)
const loading = ref(false)

const selectedRental = ref<RentalHistoryItem | null>(null)
const selectedDamage = ref<DamageHistoryItem | null>(null)
const selectedMaintenance = ref<MaintenanceHistoryItem | null>(null)

const allEvents = computed(() => {
  if (!history.value) return []
  
  const events: TimelineEvent[] = []
  
  // Rentals
  history.value.rentals.forEach(r => {
    events.push({
      id: `rental-${r.id}`,
      type: 'rental',
      date: r.startDate,
      icon: '🚗',
      color: '#2196F3',
      title: r.rentalCode,
      subtitle: r.customerName,
      data: r
    })
  })
  
  // Damages
  history.value.damages.forEach(d => {
    events.push({
      id: `damage-${d.id}`,
      type: 'damage',
      date: d.reportDate,
      icon: '⚠️',
      color: d.repaired ? '#4CAF50' : '#FF9800',
      title: translateDamageType(d.damageType),
      subtitle: translateSeverity(d.severity),
      data: d
    })
  })
  
  // Maintenances
  history.value.maintenances.forEach(m => {
    events.push({
      id: `maintenance-${m.id}`,
      type: 'maintenance',
      date: m.maintenanceDate,
      icon: '🔧',
      color: '#9C27B0',
      title: translateMaintenanceType(m.maintenanceType),
      subtitle: formatKm(m.currentKm),
      data: m
    })
  })
  
  // Status Changes
  history.value.statusChanges.forEach(s => {
    events.push({
      id: `status-${s.id}`,
      type: 'status',
      date: s.changedAt,
      icon: '🔄',
      color: '#607D8B',
      title: `${s.oldStatus} → ${s.newStatus}`,
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
  switch (event.type) {
    case 'rental':
      selectedRental.value = event.data
      break
    case 'damage':
      selectedDamage.value = event.data
      break
    case 'maintenance':
      selectedMaintenance.value = event.data
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
  <div class="vehicle-history">
    <div class="history-header">
      <h2>Araç Geçmişi</h2>
      <p v-if="history" class="vehicle-info">{{ history.vehicleName }} - {{ history.vehiclePlate }}</p>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="history && allEvents.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p>Henüz kayıt bulunmuyor</p>
    </div>

    <div v-else-if="history" class="timeline-container">
      <div class="timeline-line"></div>
      
      <div 
        v-for="event in allEvents" 
        :key="event.id"
        class="timeline-item"
        @click="openDetailModal(event)"
      >
        <div class="timeline-icon" :style="{ background: event.color }">
          <span class="icon-emoji">{{ event.icon }}</span>
        </div>
        
        <div class="timeline-card">
          <div class="timeline-date">{{ formatDate(event.date) }}</div>
          <div class="timeline-content">
            <h4>{{ event.title }}</h4>
            <p>{{ event.subtitle }}</p>
          </div>
          <div class="timeline-arrow">→</div>
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
.vehicle-history {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.history-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.vehicle-info {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 16px;
  margin: 0;
}

.timeline-container {
  position: relative;
  padding: 20px 0 20px 60px;
}

.timeline-line {
  position: absolute;
  left: 24px;
  top: 40px;
  bottom: 40px;
  width: 3px;
  background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-border) 100%);
  border-radius: 2px;
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;
  cursor: pointer;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-icon {
  position: absolute;
  left: -36px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 4px solid var(--color-surface);
  z-index: 2;
  transition: all 0.3s ease;
}

.timeline-item:hover .timeline-icon {
  transform: scale(1.15);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.icon-emoji {
  font-size: 24px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.timeline-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px 24px;
  transition: all 0.3s ease;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
}

.timeline-card:hover {
  transform: translateX(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: var(--color-primary);
}

.timeline-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 6px 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  white-space: nowrap;
}

.timeline-content {
  flex: 1;
}

.timeline-content h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.timeline-content p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.timeline-arrow {
  font-size: 20px;
  color: var(--color-text-muted);
  transition: all 0.3s ease;
}

.timeline-item:hover .timeline-arrow {
  color: var(--color-primary);
  transform: translateX(4px);
}

@media (max-width: 768px) {
  .timeline-container {
    padding-left: 50px;
  }

  .timeline-line {
    left: 20px;
  }

  .timeline-icon {
    left: -30px;
    width: 40px;
    height: 40px;
  }

  .icon-emoji {
    font-size: 20px;
  }

  .timeline-card {
    padding: 16px;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .timeline-arrow {
    display: none;
  }
}
</style>
