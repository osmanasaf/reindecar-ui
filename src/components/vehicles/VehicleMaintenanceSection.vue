<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { maintenancesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleMaintenanceMap, MaintenanceRecord } from '@/types'
import { RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import MaintenanceDetailModal from './MaintenanceDetailModal.vue'

const props = defineProps<{
  vehicleId: number
  currentKm: number
}>()

const emit = defineEmits<{
  count: [count: number]
  'add-maintenance': []
  'edit-maintenance': [maintenanceId: number]
}>()

const toast = useToast()
const maintenanceMap = ref<VehicleMaintenanceMap | null>(null)
const loading = ref(false)
const maintenanceForDetailModal = ref<MaintenanceRecord | null>(null)

const sortedMaintenances = computed(() => {
  if (!maintenanceMap.value) return []
  return [...maintenanceMap.value.maintenances].sort(
    (a, b) => new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime()
  )
})

const sortedByKm = computed(() =>
  [...sortedMaintenances.value].sort((a, b) => a.currentKm - b.currentKm)
)

const maxScaleKm = computed(() => {
  const kmValues = sortedByKm.value.map(m => m.currentKm)
  const max = Math.max(props.currentKm, ...kmValues, 30000)
  return Math.ceil(max / 10000) * 10000 + 10000
})

const currentPct = computed(() =>
  Math.min(100, (props.currentKm / maxScaleKm.value) * 100)
)

const timelineTicks = computed(() => {
  const ticks = sortedByKm.value.map(m => ({
    id: m.id,
    km: m.currentKm,
    label: formatKmShort(m.currentKm),
    date: formatDate(m.maintenanceDate),
    done: m.currentKm <= props.currentKm,
    upcoming: false
  }))

  const nextInterval = Math.ceil(props.currentKm / 10000) * 10000
  if (nextInterval <= maxScaleKm.value && !ticks.some(t => t.km === nextInterval)) {
    const kmLeft = nextInterval - props.currentKm
    ticks.push({
      id: -1,
      km: nextInterval,
      label: formatKmShort(nextInterval),
      date: kmLeft <= 15000 ? `≈ ${Math.ceil(kmLeft / 1000)}k km` : 'Yakında',
      done: false,
      upcoming: true
    })
  }

  return ticks.sort((a, b) => a.km - b.km)
})

const doneCount = computed(() => timelineTicks.value.filter(t => t.done && t.id > 0).length)
const upcomingCount = computed(() => timelineTicks.value.filter(t => t.upcoming).length)

const yearMaintenanceCost = computed(() => {
  const yearAgo = new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  return sortedMaintenances.value
    .filter(m => new Date(m.maintenanceDate) >= yearAgo)
    .reduce((sum, m) => sum + (m.costAmount || 0), 0)
})

const kmToNextService = computed(() => {
  const next = timelineTicks.value.find(t => t.upcoming)
  return next ? Math.max(0, next.km - props.currentKm) : 0
})

watch(sortedMaintenances, (list) => {
  emit('count', list.length)
}, { immediate: true })

function handleMaintenanceDetailEdit(maintenanceId: number) {
  maintenanceForDetailModal.value = null
  emit('edit-maintenance', maintenanceId)
}

defineExpose({ refresh: fetchMaintenanceMap })

async function fetchMaintenanceMap() {
  loading.value = true
  try {
    maintenanceMap.value = await maintenancesApi.getVehicleMaintenanceMap(props.vehicleId)
  } catch {
    toast.error('Bakım geçmişi yüklenemedi')
  } finally {
    loading.value = false
  }
}

function handleRowClick(record: MaintenanceRecord) {
  maintenanceForDetailModal.value = record
}

function handleRowEdit(record: MaintenanceRecord, event: Event) {
  event.stopPropagation()
  emit('edit-maintenance', record.id)
}

onMounted(() => {
  fetchMaintenanceMap()
})

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

function formatKm(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

function formatKmShort(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('tr-TR').format(n)
}

function tickPct(km: number): number {
  return Math.min(100, (km / maxScaleKm.value) * 100)
}
</script>

<template>
  <div class="rc-veh-maintenance-section">
    <div v-if="loading" class="rc-veh-damage-map__loading">
      <div class="rc-veh-damage-map__spinner" />
      <span>Bakım geçmişi yükleniyor...</span>
    </div>

    <template v-else-if="maintenanceMap">
      <div class="rcv-mtimeline">
        <div class="rcv-mt__head">
          <div>
            <div class="rcv-mt__title">Bakım Yolculuğu</div>
            <div class="rcv-mt__sub">
              Şu an <b>{{ formatKm(currentKm) }}</b>'desin
              <template v-if="kmToNextService > 0">
                · sonraki bakıma <b>{{ formatKm(kmToNextService) }}</b> kaldı
              </template>
            </div>
          </div>
          <RcButton variant="ghost" size="sm" @click="emit('add-maintenance')">
            <RcIcon name="settings" />
            Bakım planı
          </RcButton>
        </div>

        <div class="rcv-mt__rail">
          <div class="rcv-mt__progress" :style="{ width: `${currentPct}%` }" />

          <template v-for="tick in timelineTicks" :key="`${tick.km}-${tick.id}`">
            <div
              class="rcv-mt__tick"
              :class="{
                'rcv-mt__tick--done': tick.done,
                'rcv-mt__tick--upcoming': tick.upcoming
              }"
              :style="{ left: `${tickPct(tick.km)}%` }"
            />
            <div class="rcv-mt__tick-label" :style="{ left: `${tickPct(tick.km)}%` }">
              <b>{{ tick.label }}</b>
              {{ tick.date }}
            </div>
          </template>

          <div class="rcv-mt__current" :style="{ left: `${currentPct}%` }">
            <div class="rcv-mt__current-label">{{ formatKmShort(currentKm) }}</div>
          </div>
        </div>

        <div class="rcv-mt__legend">
          <div class="rcv-mt__legend-item">
            <span class="rcv-mt__legend-dot rcv-mt__legend-dot--done" />
            Tamamlanan ({{ doneCount }})
          </div>
          <div class="rcv-mt__legend-item">
            <span class="rcv-mt__legend-dot rcv-mt__legend-dot--current" />
            Şu an
          </div>
          <div v-if="upcomingCount" class="rcv-mt__legend-item">
            <span class="rcv-mt__legend-dot rcv-mt__legend-dot--upcoming" />
            Yaklaşan ({{ upcomingCount }})
          </div>
          <span class="rcv-mt__legend-cost">
            Bu yıl bakım maliyeti:
            <b>{{ formatCurrency(yearMaintenanceCost, 'TRY') }}</b>
          </span>
        </div>
      </div>

      <div class="rc-card">
        <div class="rc-card__head">
          <div>
            <div class="rc-card__title">Servis kayıtları</div>
            <div class="rc-veh-damage-map__sub">
              Bu araç son 12 ayda
              <b>{{ sortedMaintenances.length }} servis ziyareti</b>
              yaptı
            </div>
          </div>
          <RcButton variant="ghost" size="sm" @click="emit('add-maintenance')">
            <RcIcon name="plus" />
            Kayıt ekle
          </RcButton>
        </div>

        <div v-if="sortedMaintenances.length === 0" class="rc-veh-maintenance-section__empty">
          Henüz bakım kaydı yok
        </div>

        <table v-else class="rc-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Tip</th>
              <th>Açıklama</th>
              <th class="rc-right">KM</th>
              <th>Servis</th>
              <th class="rc-right">Tutar</th>
              <th class="rc-right rc-veh-maintenance-section__actions-col" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in sortedMaintenances"
              :key="record.id"
              class="rc-veh-maintenance-section__row"
              @click="handleRowClick(record)"
            >
              <td class="rc-mono rc-veh-maintenance-section__date">{{ formatDate(record.maintenanceDate) }}</td>
              <td>
                <span class="rc-badge">{{ record.maintenanceTypeDisplayName }}</span>
              </td>
              <td>{{ record.description || '—' }}</td>
              <td class="rc-right rc-num">{{ formatNum(record.currentKm) }}</td>
              <td class="rc-veh-maintenance-section__provider">
                {{ record.serviceProviderName || record.serviceProvider || '—' }}
              </td>
              <td class="rc-right rc-num">
                {{ formatCurrency(record.costAmount, record.costCurrency) }}
              </td>
              <td class="rc-right">
                <RcButton variant="ghost" size="xs" @click="handleRowEdit(record, $event)">
                  <RcIcon name="edit" />
                </RcButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <MaintenanceDetailModal
      :maintenance="maintenanceForDetailModal"
      :visible="maintenanceForDetailModal !== null"
      @close="maintenanceForDetailModal = null"
      @edit="handleMaintenanceDetailEdit"
    />
  </div>
</template>
