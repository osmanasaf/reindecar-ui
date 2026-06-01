<script setup lang="ts">
import { computed } from 'vue'
import { formatDate, formatCurrency, getStatusBadgeColor, getStatusLabel } from '@/utils/installmentHelpers'
import type { InstallmentPaymentResponse, VehicleInstallmentResponse, InstallmentPaymentStatus } from '@/types'
import { RcBadge, RcButton } from '@/components/rc'
import RecordPaymentButton from './RecordPaymentButton.vue'

interface Props {
  payments: InstallmentPaymentResponse[]
  showVehicleInfo?: boolean
  installment?: VehicleInstallmentResponse | null
}

const props = withDefaults(defineProps<Props>(), {
  showVehicleInfo: false,
  installment: null
})

const emit = defineEmits<{
  paymentRecorded: [paymentId: number]
  viewInstallment: [installmentId: number]
}>()

const sortedPayments = computed(() =>
  [...props.payments].sort((a, b) => a.installmentNumber - b.installmentNumber)
)

function badgeVariant(status: InstallmentPaymentStatus) {
  const color = getStatusBadgeColor(status)
  if (color === 'success' || color === 'danger' || color === 'info') return color
  return 'default' as const
}
</script>

<template>
  <div class="rc-veh-installment-table">
    <div v-if="payments.length === 0" class="rc-veh-map__empty">
      Ödeme kaydı bulunamadı
    </div>

    <div v-else class="rc-table-wrap">
      <table class="rc-table">
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
          <tr
            v-for="payment in sortedPayments"
            :key="payment.id"
            :class="{
              'rc-veh-installment-table__overdue': payment.isOverdue,
              'rc-veh-installment-table__closed':
                props.installment?.earlyClosedAt &&
                payment.dueDate > props.installment.earlyClosedAt
            }"
          >
            <td class="rc-mono">{{ payment.installmentNumber }}</td>
            <td>{{ formatDate(payment.dueDate) }}</td>
            <td class="rc-mono rc-num">{{ formatCurrency(payment.amount, payment.currency) }}</td>
            <td>
              <RcBadge :variant="badgeVariant(payment.status)">
                {{ getStatusLabel(payment.status) }}
              </RcBadge>
            </td>
            <td>{{ formatDate(payment.paidDate) }}</td>
            <td>
              <div class="rc-veh-installment-table__actions">
                <RcButton
                  v-if="showVehicleInfo"
                  variant="ghost"
                  size="xs"
                  @click="emit('viewInstallment', payment.installmentId)"
                >
                  Detay
                </RcButton>
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
  </div>
</template>
