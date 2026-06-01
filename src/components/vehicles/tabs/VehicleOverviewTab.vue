<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcStatusPill } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { VehicleStatus } from '@/types'
import type { Vehicle, RentalHistoryItem, VehicleHistory } from '@/types'
import { fmtTRY, formatDate as formatDateUtil } from '@/utils/format'

const props = defineProps<{ vehicle: Vehicle }>()

const router = useRouter()
const toast = useToast()
const history = ref<VehicleHistory | null>(null)
const loading = ref(false)

const isRented = computed(() => props.vehicle.status === VehicleStatus.RENTED)

const activeRental = computed(() => {
  if (!history.value) return null
  return (
    history.value.rentals.find((r) =>
      ['ACTIVE', 'RENTED', 'IN_PROGRESS'].includes(String(r.status).toUpperCase())
    ) ?? null
  )
})

const upcomingRentals = computed(() => {
  if (!history.value) return []
  const now = Date.now()
  return history.value.rentals
    .filter((r) => new Date(r.startDate).getTime() >= now - 86400000 * 7)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 6)
})

function formatDate(date: unknown): string {
  if (!date || (typeof date !== 'string' && !(date instanceof Date))) return '—'
  return formatDateUtil(date)
}

function bookingDateParts(iso: string): { day: string; month: string } {
  const d = new Date(iso)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', ''),
  }
}

function rentalInfo(r: RentalHistoryItem): string {
  const branch = r.branchName || '—'
  const ret = r.returnBranchName || branch
  const days = r.plannedDays
  return `${days} gün · ${branch} → ${ret}`
}

async function loadHistory() {
  loading.value = true
  try {
    history.value = await vehiclesApi.getHistory(props.vehicle.id)
  } catch {
    toast.error('Rezervasyon verisi yüklenemedi')
  } finally {
    loading.value = false
  }
}

function goRent() {
  router.push({ path: '/rentals/create', query: { vehicleId: String(props.vehicle.id) } })
}

onMounted(loadHistory)
</script>

<template>
  <div class="rc-detail">
    <div class="rc-detail__main rc-veh-overview-tab__main">
      <div v-if="isRented && activeRental" class="rc-action-bar">
        <div class="rc-action-bar__status">
          <div class="rc-action-bar__label">Şu an</div>
          <div class="rc-action-bar__state">{{ activeRental.customerName }}</div>
          <div class="rc-action-bar__next">
            <span class="rc-mono">{{ activeRental.rentalNumber }}</span>
            <span>· {{ activeRental.plannedDays }} gün · {{ fmtTRY(activeRental.grandTotalAmount) }}</span>
          </div>
        </div>
        <div class="rc-action-bar__status rc-action-bar__status--borderless">
          <div class="rc-action-bar__label">Planlanan bitiş</div>
          <div class="rc-action-bar__state">{{ formatDate(activeRental.endDate) }}</div>
          <div class="rc-action-bar__next">
            <span>{{ activeRental.branchName }}</span>
          </div>
        </div>
        <div class="rc-action-bar__actions">
          <RcButton variant="secondary" size="sm" @click="toast.info('Sözleşme görüntüleme yakında')">
            <RcIcon name="receipt" :size="14" />
            Sözleşme
          </RcButton>
        </div>
      </div>

      <div class="rc-card">
        <div class="rc-card__head">
          <div>
            <div class="rc-card__title">Yaklaşan rezervasyonlar</div>
            <div class="rc-veh-rentals-tab__sub">Sonraki dönem kiralamalar</div>
          </div>
          <RcButton variant="ghost" size="sm" @click="goRent">
            <RcIcon name="plus" :size="14" />
            Kirala
          </RcButton>
        </div>
        <div v-if="loading" class="rc-card__body">
          <div class="rc-skeleton" style="height: 80px" />
        </div>
        <div v-else-if="upcomingRentals.length === 0" class="rc-card__body">
          <p class="rc-veh-rentals-tab__empty">Yaklaşan rezervasyon yok.</p>
        </div>
        <div v-else>
          <div v-for="b in upcomingRentals" :key="b.id" class="rcv-booking">
            <div class="rcv-booking__date">
              <b>{{ bookingDateParts(b.startDate).day }}</b>
              {{ bookingDateParts(b.startDate).month }}
            </div>
            <div class="rcv-booking__info">
              <b>{{ b.customerName }}</b>
              <small>
                <span class="rc-mono">{{ b.rentalNumber }}</span> · {{ rentalInfo(b) }}
              </small>
            </div>
            <div class="rcv-booking__price">
              <span class="rc-num">{{ fmtTRY(b.grandTotalAmount) }}</span>
              <RcStatusPill :status="b.status" />
            </div>
          </div>
        </div>
      </div>

      <div class="rc-card">
        <div class="rc-card__head">
          <h3 class="rc-card__title">Araç özellikleri</h3>
        </div>
        <div class="rc-card__body">
          <div class="rc-cust-meta">
            <div class="rc-cust-meta__item">
              <span class="rc-cust-meta__label">Marka / Model</span>
              <span class="rc-cust-meta__value">{{ vehicle.brand }} {{ vehicle.model }}</span>
            </div>
            <div class="rc-cust-meta__item">
              <span class="rc-cust-meta__label">Renk</span>
              <span class="rc-cust-meta__value">{{ vehicle.color || '—' }}</span>
            </div>
            <div class="rc-cust-meta__item">
              <span class="rc-cust-meta__label">Motor</span>
              <span class="rc-cust-meta__value">{{ vehicle.engineCapacity }} cc</span>
            </div>
            <div class="rc-cust-meta__item">
              <span class="rc-cust-meta__label">Koltuk</span>
              <span class="rc-cust-meta__value">{{ vehicle.seatCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="vehicle.notes" class="rc-card">
        <div class="rc-card__head">
          <h3 class="rc-card__title">Notlar</h3>
        </div>
        <div class="rc-card__body">
          <p class="rc-veh-detail__notes">{{ vehicle.notes }}</p>
        </div>
      </div>
    </div>

    <div class="rc-detail__side">
      <div class="rc-card">
        <div class="rc-card__head">
          <h3 class="rc-card__title">Fiyat kademeleri</h3>
        </div>
        <div class="rcv-price-matrix">
          <div class="rcv-price-matrix__cell">
            <span class="rcv-price-matrix__cell-label">Günlük</span>
            <span class="rcv-price-matrix__cell-value">
              {{ fmtTRY(vehicle.dailyPrice ?? vehicle.category?.defaultDailyPrice ?? 0) }}
            </span>
          </div>
          <div class="rcv-price-matrix__cell">
            <span class="rcv-price-matrix__cell-label">Haftalık</span>
            <span class="rcv-price-matrix__cell-value">
              {{ vehicle.weeklyPrice != null ? fmtTRY(vehicle.weeklyPrice) : '—' }}
            </span>
          </div>
          <div class="rcv-price-matrix__cell">
            <span class="rcv-price-matrix__cell-label">Aylık</span>
            <span class="rcv-price-matrix__cell-value">
              {{ vehicle.monthlyPrice != null ? fmtTRY(vehicle.monthlyPrice) : '—' }}
            </span>
          </div>
          <div class="rcv-price-matrix__cell">
            <span class="rcv-price-matrix__cell-label">Kategori</span>
            <span class="rcv-price-matrix__cell-value rcv-price-matrix__cell-value--sm">
              {{ vehicle.categoryName || '—' }}
            </span>
          </div>
        </div>
      </div>

      <div class="rc-card">
        <div class="rc-card__head">
          <h3 class="rc-card__title">Kimlik & tarihler</h3>
        </div>
        <div class="rc-card__body">
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">VIN</span>
            <span class="rc-meta-row__value rc-mono">{{ vehicle.vinNumber }}</span>
          </div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">Tescil</span>
            <span class="rc-meta-row__value">{{ formatDate(vehicle.registrationDate) }}</span>
          </div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">Sigorta bitiş</span>
            <span
              class="rc-meta-row__value"
              :class="{ 'rc-meta-row__value--warn': vehicle.isInsuranceExpiringSoon }"
            >
              {{ formatDate(vehicle.insuranceExpiryDate) }}
            </span>
          </div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">Muayene bitiş</span>
            <span
              class="rc-meta-row__value"
              :class="{ 'rc-meta-row__value--warn': vehicle.isInspectionExpiringSoon }"
            >
              {{ formatDate(vehicle.inspectionExpiryDate) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
