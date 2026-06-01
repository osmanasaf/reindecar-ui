<script setup lang="ts">
import type { ReceivableResponse } from '@/types'
import { ReceivableStatus } from '@/types'
import { useEnumTranslations } from '@/composables'
import { RcButton, RcBadge, RcStatusPill } from '@/components/rc'
import { fmtTRY, formatDate } from '@/utils/format'
import { getDueAgeBadge } from '@/utils/accounting'

defineProps<{
  receivables: readonly ReceivableResponse[]
}>()

const emit = defineEmits<{
  rowClick: [id: number]
  payment: [id: number]
}>()

const { translateReceivableType } = useEnumTranslations()

function canCollect(status: ReceivableStatus): boolean {
  return status === ReceivableStatus.PENDING
    || status === ReceivableStatus.PARTIAL_PAID
    || status === ReceivableStatus.OVERDUE
}

function sourceLabel(item: ReceivableResponse): string {
  if (item.sourceType === 'RENTAL') return `Kiralama #${item.sourceId}`
  if (item.sourceType === 'DAMAGE') return `Hasar #${item.sourceId}`
  return item.sourceType || '—'
}
</script>

<template>
  <div class="rc-card" style="overflow: hidden">
    <table class="rc-table rcv-table--slim">
      <thead>
        <tr>
          <th>Belge</th>
          <th>Müşteri</th>
          <th>Tip</th>
          <th>Vade</th>
          <th>Yaş</th>
          <th>Durum</th>
          <th class="rc-right">Tutar</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in receivables"
          :key="item.id"
          style="cursor: pointer"
          @click="emit('rowClick', item.id)"
        >
          <td>
            <div class="rcr-row__primary rcr-row__mono">{{ item.receivableNumber }}</div>
            <div class="rcr-row__secondary">{{ sourceLabel(item) }}</div>
          </td>
          <td>
            <div class="rcr-row__primary">{{ item.customerName || '—' }}</div>
            <div v-if="item.vehiclePlate" class="rcr-row__secondary">{{ item.vehiclePlate }}</div>
          </td>
          <td>{{ translateReceivableType(item.type) }}</td>
          <td class="rc-mono" style="font-size: 12.5px">{{ formatDate(item.dueDate) }}</td>
          <td>
            <RcBadge
              v-if="getDueAgeBadge(item.dueDate, item.status)"
              :class="{
                'rc-badge--danger': getDueAgeBadge(item.dueDate, item.status)?.variant === 'danger',
              }"
            >
              {{ getDueAgeBadge(item.dueDate, item.status)?.label }}
            </RcBadge>
            <span v-else class="rcr-row__secondary">—</span>
          </td>
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
              v-if="canCollect(item.status)"
              variant="secondary"
              size="sm"
              @click="emit('payment', item.id)"
            >
              Tahsil et
            </RcButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
