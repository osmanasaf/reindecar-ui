<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import { fmtTRY } from '@/utils/format'
import type { VehicleHistory } from '@/types'
import VehiclePaymentDetails from '@/components/installments/VehiclePaymentDetails.vue'

const props = defineProps<{ vehicleId: number }>()

const toast = useToast()
const history = ref<VehicleHistory | null>(null)
const loading = ref(false)

const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

const monthlyData = computed(() => {
  const buckets = Array.from({ length: 12 }, () => ({ rev: 0, cost: 0 }))
  if (!history.value) return buckets

  for (const r of history.value.rentals) {
    const d = new Date(r.startDate)
    if (Number.isNaN(d.getTime())) continue
    const bucket = buckets[d.getMonth()]
    if (!bucket) continue
    bucket.rev += r.grandTotalAmount || 0
  }

  for (const m of history.value.maintenances) {
    const d = new Date(m.maintenanceDate)
    if (Number.isNaN(d.getTime())) continue
    const bucket = buckets[d.getMonth()]
    if (!bucket) continue
    bucket.cost += m.costAmount || 0
  }

  return buckets
})

const totalRev = computed(() => monthlyData.value.reduce((s, d) => s + d.rev, 0))
const totalCost = computed(() => monthlyData.value.reduce((s, d) => s + d.cost, 0))
const netProfit = computed(() => totalRev.value - totalCost.value)
const profitMargin = computed(() =>
  totalRev.value > 0 ? Math.round((netProfit.value / totalRev.value) * 100) : 0
)

const chartMax = computed(() => {
  const max = Math.max(...monthlyData.value.map((d) => d.rev + d.cost), 1)
  return max
})

const costBreakdown = computed(() => {
  const maintenance = history.value?.maintenances.reduce((s, m) => s + (m.costAmount || 0), 0) ?? 0
  const insurance = 0
  const other = Math.max(0, totalCost.value - maintenance)
  const total = maintenance + insurance + other || 1
  return [
    { label: 'Bakım', value: maintenance, pct: Math.round((maintenance / total) * 100) },
    { label: 'Sigorta (tahmini)', value: insurance, pct: 0 },
    { label: 'Diğer', value: other, pct: Math.round((other / total) * 100) },
  ]
})

async function loadHistory() {
  loading.value = true
  try {
    history.value = await vehiclesApi.getHistory(props.vehicleId)
  } catch {
    toast.error('Finansal veriler yüklenemedi')
  } finally {
    loading.value = false
  }
}

onMounted(loadHistory)
</script>

<template>
  <div class="rc-veh-financial-tab">
    <div v-if="loading" class="rc-skeleton" style="height: 200px" />

    <template v-else>
      <div class="rcv-stats rcv-stats--4">
        <div class="rcv-stat">
          <div class="rcv-stat__label">Yıllık ciro</div>
          <div class="rcv-stat__value">{{ fmtTRY(totalRev) }}</div>
          <div class="rcv-stat__sub">kiralama gelirleri</div>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Yıllık gider</div>
          <div class="rcv-stat__value">{{ fmtTRY(totalCost) }}</div>
          <div class="rcv-stat__sub">bakım · sigorta · trafik</div>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Net kâr</div>
          <div class="rcv-stat__value" style="color: var(--rc-success-700)">
            {{ fmtTRY(netProfit) }}
          </div>
          <div class="rcv-stat__sub">marj %{{ profitMargin }}</div>
        </div>
        <div class="rcv-stat">
          <div class="rcv-stat__label">Kiralama sayısı</div>
          <div class="rcv-stat__value">{{ history?.rentals.length ?? 0 }}</div>
          <div class="rcv-stat__sub">bu yıl kayıtlı</div>
        </div>
      </div>

      <div class="rc-card">
        <div class="rc-card__head">
          <div class="rc-card__title">Aylık gelir / gider</div>
        </div>
        <div class="rc-card__body">
          <div class="rcv-pnl">
            <div>
              <div class="rcv-pnl-bars">
                <div
                  v-for="(d, i) in monthlyData"
                  :key="i"
                  class="rcv-pnl-bars__col"
                >
                  <div
                    class="rcv-pnl-bars__bar"
                    :style="{
                      height: `${((d.rev + d.cost) / chartMax) * 100}%`,
                    }"
                  >
                    <div
                      v-if="d.cost > 0"
                      class="rcv-pnl-bars__seg rcv-pnl-bars__seg--cost"
                      :style="{ height: `${(d.cost / (d.rev + d.cost || 1)) * 100}%` }"
                    />
                    <div
                      v-if="d.rev > 0"
                      class="rcv-pnl-bars__seg rcv-pnl-bars__seg--rev"
                      :style="{ height: `${(d.rev / (d.rev + d.cost || 1)) * 100}%` }"
                    />
                  </div>
                  <span>{{ MONTH_LABELS[i] }}</span>
                </div>
              </div>
              <div class="rc-veh-financial-tab__chart-legend">
                <span><span class="rc-veh-financial-tab__swatch rc-veh-financial-tab__swatch--rev" /> Gelir</span>
                <span><span class="rc-veh-financial-tab__swatch rc-veh-financial-tab__swatch--cost" /> Gider</span>
              </div>
            </div>
            <div class="rcv-cost-list">
              <div v-for="row in costBreakdown" :key="row.label" class="rcv-cost-row">
                <span class="rcv-cost-row__label">{{ row.label }}</span>
                <div class="rcv-cost-row__bar">
                  <div class="rcv-cost-row__fill" :style="{ width: `${row.pct}%` }" />
                </div>
                <span class="rcv-cost-row__value">{{ fmtTRY(row.value) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div class="rc-card">
      <div class="rc-card__head">
        <div class="rc-card__title">Taksit planı</div>
      </div>
      <div class="rc-card__body rc-card__body--flush">
        <VehiclePaymentDetails :vehicle-id="vehicleId" />
      </div>
    </div>
  </div>
</template>
