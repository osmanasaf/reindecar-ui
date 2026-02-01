<script setup lang="ts">
import { computed } from 'vue'
import type { ReceivableResponse } from '@/types'
import ReceivableStatusBadge from './ReceivableStatusBadge.vue'
import { useEnumTranslations } from '@/composables'
import { calculatePaymentProgress } from '@/utils/accounting'
import { formatCurrency, formatDate } from '@/utils/format'

interface Props {
  receivable: ReceivableResponse
  showCustomer?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCustomer: true
})

const emit = defineEmits<{
  click: [id: number]
  payment: [id: number]
}>()

const { translateReceivableType } = useEnumTranslations()

const progress = computed(() => 
  calculatePaymentProgress(props.receivable.paidAmount, props.receivable.amount)
)

const typeText = computed(() => translateReceivableType(props.receivable.type))
</script>

<template>
  <div class="receivable-card" @click="emit('click', receivable.id)">
    <div class="card-header">
      <div class="card-header-left">
        <h3 class="card-title">{{ receivable.receivableNumber }}</h3>
        <span class="card-type">{{ typeText }}</span>
      </div>
      <ReceivableStatusBadge :status="receivable.status" />
    </div>

    <div class="card-body">
      <div v-if="showCustomer && receivable.customerName" class="card-info-row">
        <span class="label">Müşteri:</span>
        <span class="value">{{ receivable.customerName }}</span>
      </div>

      <div class="card-info-row">
        <span class="label">Açıklama:</span>
        <span class="value">{{ receivable.description }}</span>
      </div>

      <div class="card-info-row">
        <span class="label">Vade Tarihi:</span>
        <span class="value">{{ formatDate(receivable.dueDate) }}</span>
      </div>

      <div class="amounts">
        <div class="amount-row">
          <span class="label">Toplam:</span>
          <span class="value total">{{ formatCurrency(receivable.amount) }}</span>
        </div>
        <div class="amount-row">
          <span class="label">Ödenen:</span>
          <span class="value paid">{{ formatCurrency(receivable.paidAmount) }}</span>
        </div>
        <div class="amount-row">
          <span class="label">Kalan:</span>
          <span class="value remaining">{{ formatCurrency(receivable.remainingAmount) }}</span>
        </div>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <span class="progress-text">{{ progress }}%</span>
      </div>
    </div>

    <div v-if="receivable.status !== 'FULLY_PAID' && receivable.status !== 'CANCELLED'" class="card-footer">
      <button 
        class="btn btn-primary" 
        @click.stop="emit('payment', receivable.id)"
      >
        Ödeme Al
      </button>
    </div>
  </div>
</template>

<style scoped>
.receivable-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.receivable-card:hover {
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
