<script setup lang="ts">
import { computed } from 'vue'
import type { PayableResponse } from '@/types'
import PayableStatusBadge from './PayableStatusBadge.vue'
import { useEnumTranslations } from '@/composables'
import { calculatePaymentProgress, getDueDateBadgeColor } from '@/utils/accounting'
import { formatCurrency, formatDate } from '@/utils/format'

interface Props {
  payable: PayableResponse
  showProvider?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showProvider: true
})

const emit = defineEmits<{
  click: [id: number]
  payment: [id: number]
}>()

const { translatePayableType } = useEnumTranslations()

const progress = computed(() => 
  calculatePaymentProgress(props.payable.paidAmount, props.payable.amount)
)

const typeText = computed(() => translatePayableType(props.payable.type))
const dueDateBadgeColor = computed(() => getDueDateBadgeColor(props.payable.dueDate))
</script>

<template>
  <div class="payable-card" @click="emit('click', payable.id)">
    <div class="card-header">
      <div class="card-header-left">
        <h3 class="card-title">{{ payable.payableNumber }}</h3>
        <span class="card-type">{{ typeText }}</span>
      </div>
      <PayableStatusBadge :status="payable.status" />
    </div>

    <div class="card-body">
      <div v-if="showProvider && payable.serviceProviderName" class="card-info-row">
        <span class="label">Servis Sağlayıcı:</span>
        <span class="value">{{ payable.serviceProviderName }}</span>
      </div>

      <div class="card-info-row">
        <span class="label">Açıklama:</span>
        <span class="value">{{ payable.description }}</span>
      </div>

      <div v-if="payable.invoiceNumber" class="card-info-row">
        <span class="label">Fatura No:</span>
        <span class="value">{{ payable.invoiceNumber }}</span>
      </div>

      <div class="card-info-row">
        <span class="label">Vade Tarihi:</span>
        <span :class="['value', `text-${dueDateBadgeColor}`]">
          {{ formatDate(payable.dueDate) }}
        </span>
      </div>

      <div class="amounts">
        <div class="amount-row">
          <span class="label">Toplam:</span>
          <span class="value total">{{ formatCurrency(payable.amount) }}</span>
        </div>
        <div class="amount-row">
          <span class="label">Ödenen:</span>
          <span class="value paid">{{ formatCurrency(payable.paidAmount) }}</span>
        </div>
        <div class="amount-row">
          <span class="label">Kalan:</span>
          <span class="value remaining">{{ formatCurrency(payable.remainingAmount) }}</span>
        </div>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <span class="progress-text">{{ progress }}%</span>
      </div>
    </div>

    <div v-if="payable.status !== 'FULLY_PAID' && payable.status !== 'CANCELLED'" class="card-footer">
      <button 
        class="btn btn-primary" 
        @click.stop="emit('payment', payable.id)"
      >
        Ödeme Yap
      </button>
    </div>
  </div>
</template>

<style scoped>
.payable-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.payable-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary, #2563eb);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.card-header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.card-type {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.card-info-row .label {
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
}

.card-info-row .value {
  color: var(--color-text, #111827);
  text-align: right;
}

.text-green {
  color: #15803d !important;
}

.text-yellow {
  color: #ca8a04 !important;
  font-weight: 600;
}

.text-red {
  color: #b91c1c !important;
  font-weight: 600;
}

.amounts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-background, #f9fafb);
  border-radius: 0.375rem;
  margin-top: 0.5rem;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.amount-row .value.total {
  font-weight: 600;
  color: var(--color-text, #111827);
}

.amount-row .value.paid {
  color: #15803d;
}

.amount-row .value.remaining {
  font-weight: 600;
  color: #c2410c;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 0.5rem;
  background: var(--color-background, #f3f4f6);
  border-radius: 0.25rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  min-width: 3rem;
  text-align: right;
}

.card-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark, #1d4ed8);
}
</style>
