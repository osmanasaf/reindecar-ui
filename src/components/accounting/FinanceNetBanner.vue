<script setup lang="ts">
import { computed } from 'vue'
import { fmtTRY } from '@/utils/format'
import type { AccountingSummaryResponse } from '@/types'

const props = defineProps<{
  summary: AccountingSummaryResponse | null
  loading?: boolean
}>()

const periodLabel = computed(() => {
  const raw = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date())
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

const netPosition = computed(() => props.summary?.netPosition ?? 0)
const totalReceivable = computed(() => props.summary?.receivables.remainingAmount ?? 0)
const totalPayable = computed(() => props.summary?.payables.remainingAmount ?? 0)
const receivableCount = computed(() => props.summary?.receivables.totalCount ?? 0)
const payableCount = computed(() => props.summary?.payables.totalCount ?? 0)
const overdueTotal = computed(() => {
  if (!props.summary) return 0
  return props.summary.receivables.overdueAmount + props.summary.payables.overdueAmount
})
</script>

<template>
  <div class="rc-card rca-net-banner" aria-live="polite">
    <div class="rca-net-banner__glow" aria-hidden="true" />
    <div v-if="loading && !summary" class="rca-net-banner__grid">
      <div v-for="i in 4" :key="i" class="rc-skeleton" style="height: 72px" />
    </div>
    <div v-else class="rca-net-banner__grid">
      <div class="rca-net-banner__primary">
        <div class="rca-net-banner__label">Net pozisyon · {{ periodLabel }}</div>
        <div class="rca-net-banner__net rc-num">{{ fmtTRY(netPosition) }}</div>
        <div class="rca-net-banner__hint">
          <span
            v-if="summary"
            class="rc-badge"
            :class="summary.netPositive ? 'rca-net-banner__badge--up' : 'rca-net-banner__badge--down'"
          >
            {{ summary.netPositive ? 'Pozitif' : 'Negatif' }}
          </span>
          <span>Açık alacak − açık verecek</span>
        </div>
      </div>
      <div class="rca-net-banner__metric">
        <div class="rca-net-banner__label">Toplam alacak</div>
        <div class="rca-net-banner__value rc-num">{{ fmtTRY(totalReceivable) }}</div>
        <div class="rca-net-banner__sub">{{ receivableCount }} kayıt</div>
      </div>
      <div class="rca-net-banner__metric">
        <div class="rca-net-banner__label">Toplam verecek</div>
        <div class="rca-net-banner__value rc-num">{{ fmtTRY(totalPayable) }}</div>
        <div class="rca-net-banner__sub">{{ payableCount }} kayıt</div>
      </div>
      <div class="rca-net-banner__metric">
        <div class="rca-net-banner__label">Vadesi geçmiş</div>
        <div class="rca-net-banner__value rca-net-banner__value--warn rc-num">{{ fmtTRY(overdueTotal) }}</div>
        <div class="rca-net-banner__sub">Acil aksiyon</div>
      </div>
    </div>
  </div>
</template>
