<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcStatusPill } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { fmtTRY } from '@/utils/format'
import type { RentalHistoryItem, VehicleHistory } from '@/types'
import RentalDetailModal from '../RentalDetailModal.vue'

const props = defineProps<{ vehicleId: number }>()

const toast = useToast()
const history = ref<VehicleHistory | null>(null)
const loading = ref(false)
const selectedRental = ref<RentalHistoryItem | null>(null)
const heatmapYear = new Date().getFullYear()

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

const rentals = computed(() => {
  if (!history.value) return []
  return [...history.value.rentals].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )
})

const totalRevenue = computed(() =>
  rentals.value.reduce((s, r) => s + (r.grandTotalAmount || 0), 0)
)

const rentedDays = computed(() => {
  let days = 0
  for (const r of rentals.value) {
    const start = new Date(r.startDate)
    const end = new Date(r.actualReturnDate || r.endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
    const diff = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000))
    days += diff
  }
  return days
})

function dateInRange(d: Date, start: Date, end: Date): boolean {
  const t = d.setHours(0, 0, 0, 0)
  return t >= start.setHours(0, 0, 0, 0) && t <= end.setHours(0, 0, 0, 0)
}

function cellLevel(monthIdx: number, day: number): string {
  const date = new Date(heatmapYear, monthIdx, day)
  if (date.getMonth() !== monthIdx) return '0'

  for (const m of history.value?.maintenances ?? []) {
    const md = new Date(m.maintenanceDate)
    if (md.getFullYear() === heatmapYear && md.getMonth() === monthIdx && md.getDate() === day) {
      return 'm'
    }
  }

  for (const d of history.value?.damages ?? []) {
    if (d.repaired) continue
    const dd = new Date(d.reportDate)
    if (dd.getFullYear() === heatmapYear && dd.getMonth() === monthIdx && dd.getDate() === day) {
      return 'd'
    }
  }

  let rentalHits = 0
  for (const r of rentals.value) {
    const start = new Date(r.startDate)
    const end = new Date(r.actualReturnDate || r.endDate)
    if (dateInRange(new Date(date), start, end)) rentalHits++
  }
  if (rentalHits === 0) return '0'
  if (rentalHits === 1) return '2'
  if (rentalHits === 2) return '3'
  return '4'
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function rentalDuration(r: RentalHistoryItem): string {
  const days = r.actualDays ?? r.plannedDays
  return `${days} gün`
}

async function loadHistory() {
  loading.value = true
  try {
    history.value = await vehiclesApi.getHistory(props.vehicleId)
  } catch {
    toast.error('Kiralama geçmişi yüklenemedi')
  } finally {
    loading.value = false
  }
}

onMounted(loadHistory)
</script>

<template>
  <div class="rc-veh-rentals-tab">
    <div v-if="loading" class="rc-veh-map__loading loading-state">
      <div class="loading-spinner rc-veh-map__spinner" />
      <span>Yükleniyor…</span>
    </div>

    <template v-else>
      <div class="rc-card">
        <div class="rc-card__head">
          <div>
            <div class="rc-card__title">Yıllık doluluk haritası</div>
            <div class="rc-veh-rentals-tab__sub">
              {{ heatmapYear }} · {{ rentedDays }} gün kirada · {{ rentals.length }} kiralama
            </div>
          </div>
        </div>
        <div class="rc-card__body rc-veh-rentals-tab__heatmap-body">
          <div class="rc-veh-rentals-tab__months">
            <div v-for="(m, mi) in MONTHS" :key="m" class="rc-veh-rentals-tab__month-col">
              <div class="rc-veh-rentals-tab__month-label">{{ m }}</div>
              <div class="rc-veh-rentals-tab__month-grid">
                <div
                  v-for="di in 31"
                  :key="di"
                  class="rcv-heatmap__cell"
                  :data-lvl="cellLevel(mi, di)"
                  :title="`${di} ${m} ${heatmapYear}`"
                />
              </div>
            </div>
          </div>
          <div class="rcv-heatmap__legend">
            <span>Az</span>
            <div class="rcv-heatmap__scale">
              <span style="background: var(--rc-ink-100)" />
              <span style="background: var(--rc-blue-100)" />
              <span style="background: var(--rc-blue-300)" />
              <span style="background: var(--rc-blue-500)" />
              <span style="background: var(--rc-blue-700)" />
            </div>
            <span>Çok</span>
            <span class="rc-veh-rentals-tab__legend-item">
              <span class="rc-veh-rentals-tab__legend-swatch rc-veh-rentals-tab__legend-swatch--m" />
              Bakım
            </span>
            <span class="rc-veh-rentals-tab__legend-item">
              <span class="rc-veh-rentals-tab__legend-swatch rc-veh-rentals-tab__legend-swatch--d" />
              Hasar
            </span>
          </div>
        </div>
      </div>

      <div class="rc-card">
        <div class="rc-card__head">
          <div>
            <div class="rc-card__title">Kiralama geçmişi</div>
            <div class="rc-veh-rentals-tab__sub">
              {{ rentals.length }} kayıt · {{ fmtTRY(totalRevenue) }} toplam ciro
            </div>
          </div>
          <div class="rc-veh-rentals-tab__head-actions">
            <RcButton variant="ghost" size="sm" @click="toast.info('Filtre yakında')">
              <RcIcon name="filter" :size="14" />
              Filtre
            </RcButton>
            <RcButton variant="ghost" size="sm" @click="toast.info('CSV dışa aktarma yakında')">
              <RcIcon name="download" :size="14" />
              CSV
            </RcButton>
          </div>
        </div>
        <div class="rc-card__body rc-veh-rentals-tab__table-wrap">
          <table v-if="rentals.length" class="rc-table">
            <thead>
              <tr>
                <th>Kiralama</th>
                <th>Müşteri</th>
                <th>Süre</th>
                <th class="rc-right">KM</th>
                <th>Durum</th>
                <th class="rc-right">Gelir</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in rentals"
                :key="r.id"
                class="rc-veh-rentals-tab__row"
                @click="selectedRental = r"
              >
                <td>
                  <div class="rc-veh-rentals-tab__rental-id">
                    <span class="rc-mono">{{ r.rentalNumber }}</span>
                    <small>{{ formatShortDate(r.startDate) }}</small>
                  </div>
                </td>
                <td>{{ r.customerName }}</td>
                <td>{{ rentalDuration(r) }}</td>
                <td class="rc-right rc-num">
                  {{ r.totalKm != null ? r.totalKm.toLocaleString('tr-TR') : '—' }}
                </td>
                <td>
                  <RcStatusPill :status="r.status" />
                </td>
                <td class="rc-right rc-num">{{ fmtTRY(r.grandTotalAmount) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="rc-veh-rentals-tab__empty">Henüz kiralama kaydı yok.</p>
        </div>
      </div>
    </template>

    <RentalDetailModal
      :rental="selectedRental"
      :visible="selectedRental !== null"
      @close="selectedRental = null"
    />
  </div>
</template>
