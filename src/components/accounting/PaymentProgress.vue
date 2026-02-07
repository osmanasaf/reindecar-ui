<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '@/utils/format'

interface Props {
  amount: number
  paidAmount: number
  currency?: string
  showAmounts?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currency: 'TRY',
  showAmounts: true
})

const percentage = computed(() => {
  if (props.amount === 0) return 0
  return Math.min((props.paidAmount / props.amount) * 100, 100)
})

const remainingAmount = computed(() => props.amount - props.paidAmount)

const progressColor = computed(() => {
  if (percentage.value === 100) return '#10b981'
  if (percentage.value >= 50) return '#3b82f6'
  if (percentage.value > 0) return '#f59e0b'
  return '#9ca3af'
})
</script>

<template>
  <div class="payment-progress">
    <div class="progress-header">
      <span class="progress-label">Ödeme İlerlemesi</span>
      <span class="progress-percentage">{{ percentage.toFixed(0) }}%</span>
    </div>
    
    <div class="progress-bar-container">
      <div 
        class="progress-bar"
        :style="{ 
          width: `${percentage}%`,
          backgroundColor: progressColor
        }"
      />
    </div>
    
    <div v-if="showAmounts" class="progress-amounts">
      <div class="amount-item">
        <span class="amount-label">Ödenen:</span>
        <span class="amount-value paid">{{ formatCurrency(paidAmount, currency) }}</span>
      </div>
      <div class="amount-item">
        <span class="amount-label">Kalan:</span>
        <span class="amount-value remaining">{{ formatCurrency(remainingAmount, currency) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payment-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #111827);
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
}

.progress-bar-container {
  width: 100%;
  height: 0.5rem;
  background-color: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.progress-amounts {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.amount-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.amount-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.amount-value {
  font-size: 0.875rem;
  font-weight: 600;
}

.amount-value.paid {
  color: #10b981;
}

.amount-value.remaining {
  color: #ef4444;
}
</style>
