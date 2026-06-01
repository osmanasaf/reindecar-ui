<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '@/utils/format'
import { calculatePaymentProgress } from '@/utils/accounting'

interface Props {
  amount: number
  paidAmount: number
  currency?: string
  showAmounts?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currency: 'TRY',
  showAmounts: true,
})

const percentage = computed(() => calculatePaymentProgress(props.paidAmount, props.amount))
const remainingAmount = computed(() => props.amount - props.paidAmount)

const progressColor = computed(() => {
  if (percentage.value === 100) return 'var(--rc-green-500)'
  if (percentage.value >= 50) return 'var(--rc-blue-500)'
  if (percentage.value > 0) return 'var(--rc-orange-500)'
  return 'var(--rc-ink-300)'
})
</script>

<template>
  <div class="rca-progress">
    <div class="rca-progress__head">
      <span class="rca-progress__label">Ödeme ilerlemesi</span>
      <span class="rca-progress__pct">{{ percentage }}%</span>
    </div>
    <div class="rca-progress__bar">
      <div
        class="rca-progress__fill"
        :style="{ width: `${percentage}%`, backgroundColor: progressColor }"
      />
    </div>
    <div v-if="showAmounts" class="rca-progress__amounts">
      <span>Ödenen: <strong style="color: var(--rc-green-600)">{{ formatCurrency(paidAmount, currency) }}</strong></span>
      <span>Kalan: <strong style="color: var(--rc-orange-600)">{{ formatCurrency(remainingAmount, currency) }}</strong></span>
    </div>
  </div>
</template>
