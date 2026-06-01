<script setup lang="ts">
import type { PayableResponse } from '@/types'
import { PayableStatus } from '@/types'
import { RcButton, RcStatusPill } from '@/components/rc'
import { fmtTRY, formatDate } from '@/utils/format'

defineProps<{
  payables: readonly PayableResponse[]
}>()

const emit = defineEmits<{
  rowClick: [id: number]
  payment: [id: number]
}>()

function canPay(status: PayableStatus): boolean {
  return status === PayableStatus.PENDING
    || status === PayableStatus.PARTIAL_PAID
    || status === PayableStatus.OVERDUE
}
</script>

<template>
  <div class="rc-card" style="overflow: hidden">
    <table class="rc-table rcv-table--slim">
      <thead>
        <tr>
          <th>Belge</th>
          <th>Tedarikçi</th>
          <th>Vade</th>
          <th>Durum</th>
          <th class="rc-right">Tutar</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in payables"
          :key="item.id"
          style="cursor: pointer"
          @click="emit('rowClick', item.id)"
        >
          <td>
            <div class="rcr-row__primary rcr-row__mono">{{ item.payableNumber }}</div>
            <div v-if="item.invoiceNumber" class="rcr-row__secondary">{{ item.invoiceNumber }}</div>
          </td>
          <td>
            <div class="rcr-row__primary">{{ item.serviceProviderName || '—' }}</div>
            <div v-if="item.vehiclePlate" class="rcr-row__secondary">{{ item.vehiclePlate }}</div>
          </td>
          <td class="rc-mono" style="font-size: 12.5px">{{ formatDate(item.dueDate) }}</td>
          <td>
            <RcStatusPill :status="item.status" />
          </td>
          <td class="rc-right">
            <div class="rcr-row__primary rc-num">{{ fmtTRY(item.remainingAmount) }}</div>
            <div v-if="item.paidAmount > 0" class="rcr-row__secondary">
              / {{ fmtTRY(item.amount) }}
            </div>
          </td>
          <td class="rc-right" @click.stop>
            <RcButton
              v-if="canPay(item.status)"
              variant="secondary"
              size="sm"
              @click="emit('payment', item.id)"
            >
              Öde
            </RcButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
