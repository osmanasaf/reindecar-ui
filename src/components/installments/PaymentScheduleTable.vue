<script setup lang="ts">
import { computed } from 'vue'
import { formatDate, formatCurrency, getStatusBadgeColor, getStatusLabel } from '@/utils/installmentHelpers'
import type { InstallmentPaymentResponse } from '@/types'
import RecordPaymentButton from './RecordPaymentButton.vue'

interface Props {
  payments: InstallmentPaymentResponse[]
  showVehicleInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showVehicleInfo: false
})

const emit = defineEmits<{
  paymentRecorded: [paymentId: number]
  viewInstallment: [installmentId: number]
}>()

const sortedPayments = computed(() => {
  return [...props.payments].sort((a, b) => a.installmentNumber - b.installmentNumber)
})
</script>

<template>
  <div class="payment-schedule-table">
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Taksit No</th>
            <th>Vade Tarihi</th>
            <th>Tutar</th>
            <th>Durum</th>
            <th>Ödeme Tarihi</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="payment in sortedPayments" :key="payment.id" :class="{ 'overdue': payment.isOverdue }">
            <td class="installment-number">{{ payment.installmentNumber }}</td>
            <td>{{ formatDate(payment.dueDate) }}</td>
            <td class="amount">{{ formatCurrency(payment.amount, payment.currency) }}</td>
            <td>
              <span class="status-badge" :class="`status-${getStatusBadgeColor(payment.status)}`">
                {{ getStatusLabel(payment.status) }}
              </span>
            </td>
            <td>{{ formatDate(payment.paidDate) }}</td>
            <td>
              <div class="actions">
                <button
                  v-if="showVehicleInfo"
                  type="button"
                  class="btn-link"
                  @click="emit('viewInstallment', payment.installmentId)"
                >
                  Detay
                </button>
                <RecordPaymentButton
                  v-if="payment.status === 'PENDING'"
                  :installment-id="payment.installmentId"
                  :payment-id="payment.id"
                  @success="emit('paymentRecorded', payment.id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="payments.length === 0" class="empty-state">
      Ödeme kaydı bulunamadı
    </div>
  </div>
</template>

<style scoped>
.payment-schedule-table {
  width: 100%;
}

.table-wrapper {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table thead {
  background: var(--color-bg-secondary);
}

.table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
}

.table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.table tbody tr:hover {
  background: var(--color-bg-secondary);
}

.table tbody tr.overdue {
  background: var(--color-danger-light);
}

.installment-number {
  font-weight: 600;
}

.amount {
  font-weight: 500;
  font-family: monospace;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.status-info {
  background: var(--color-info-light);
  color: var(--color-info);
}

.status-danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-link {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.btn-link:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--color-text-secondary);
}
</style>
