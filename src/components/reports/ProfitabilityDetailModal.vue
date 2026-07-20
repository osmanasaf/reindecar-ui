<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { vehicleProfitabilityApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcBadge, RcEmpty } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate } from '@/utils/format'
import { PROFITABILITY_LINE_ITEM_LABELS } from '@/types/profitability'
import type { VehicleProfitabilityDetailResponse } from '@/types/profitability'

const props = defineProps<{
  open: boolean
  vehicleId: number
  from: string
  to: string
}>()

const emit = defineEmits<{ close: [] }>()

const toast = useToast()
const loading = ref(true)
const detail = ref<VehicleProfitabilityDetailResponse | null>(null)

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

async function loadDetail() {
  loading.value = true
  try {
    detail.value = await vehicleProfitabilityApi.getProfitabilityDetail(props.vehicleId, {
      from: props.from,
      to: props.to,
    })
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Araç detayı yüklenemedi')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.vehicleId, props.from, props.to, props.open],
  () => {
    if (props.open) void loadDetail()
  }
)

onMounted(() => {
  if (props.open) void loadDetail()
})
</script>

<template>
  <RcModal :open="open" wide @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">{{ detail?.summary.plateNumber ?? 'Araç Detayı' }}</h2>
        <div class="rc-modal__sub">{{ detail?.summary.brand }} {{ detail?.summary.model }}</div>
      </div>
    </template>

    <div v-if="loading" class="rc-skeleton" style="height: 240px" />

    <template v-else-if="detail">
      <div class="rcp-detail-summary">
        <div>
          <div class="rca-stat__label">Net katkı</div>
          <div class="rc-num">
            <span v-for="m in detail.summary.netContribution" :key="m.currency">
              {{ formatAmount(m.amount, m.currency) }}
            </span>
            <span v-if="detail.summary.netContribution.length === 0">—</span>
          </div>
        </div>
        <div>
          <div class="rca-stat__label">Doluluk</div>
          <div class="rc-num">{{ detail.summary.utilizationRate.toFixed(1) }}% ({{ detail.summary.rentedDays }}/{{ detail.summary.availableDays }} gün)</div>
        </div>
        <div>
          <div class="rca-stat__label">Kiralama sayısı</div>
          <div class="rc-num">{{ detail.summary.rentalCount }}</div>
        </div>
      </div>

      <RcEmpty
        v-if="detail.items.length === 0"
        title="Kalem yok"
        description="Bu aralıkta gelir veya maliyet kaydı bulunamadı"
      >
        <template #icon><RcIcon name="folder" :size="28" /></template>
      </RcEmpty>

      <table v-else class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th>Tür</th>
            <th>Tarih</th>
            <th>Açıklama</th>
            <th class="rc-right">Tutar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in detail.items" :key="idx">
            <td>{{ PROFITABILITY_LINE_ITEM_LABELS[item.type] }}</td>
            <td class="rc-mono" style="font-size: 12.5px">{{ formatDate(item.date) }}</td>
            <td>
              {{ item.description || '—' }}
              <RcBadge v-if="item.excludedFromCost" variant="info" style="margin-left: 6px">Hariç</RcBadge>
            </td>
            <td class="rc-right rc-num">{{ formatAmount(item.amount.amount, item.amount.currency) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </RcModal>
</template>

<style scoped>
.rcp-detail-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--rc-border);
}
</style>
