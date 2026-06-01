<script setup lang="ts">
import type { InsuranceClaimResponse } from '@/types'
import { useEnumTranslations } from '@/composables'
import { RcStatusPill } from '@/components/rc'
import { PaymentProgress } from '@/components/accounting'
import { fmtTRY, formatDate } from '@/utils/format'

defineProps<{
  claims: readonly InsuranceClaimResponse[]
}>()

const emit = defineEmits<{
  rowClick: [id: number]
}>()

const { translateClaimType } = useEnumTranslations()
</script>

<template>
  <div class="rc-card" style="overflow: hidden">
    <table class="rc-table rcv-table--slim">
      <thead>
        <tr>
          <th>Başvuru</th>
          <th>Araç</th>
          <th>Tip</th>
          <th>Olay</th>
          <th>Durum</th>
          <th class="rc-right">Talep</th>
          <th class="rc-right">Onay</th>
          <th>Ödeme</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="claim in claims"
          :key="claim.id"
          style="cursor: pointer"
          @click="emit('rowClick', claim.id)"
        >
          <td>
            <div class="rcr-row__primary rcr-row__mono">{{ claim.claimNumber }}</div>
          </td>
          <td>
            <div class="rcr-row__primary">{{ claim.vehiclePlate || '—' }}</div>
          </td>
          <td>{{ translateClaimType(claim.claimType) }}</td>
          <td class="rc-mono" style="font-size: 12.5px">{{ formatDate(claim.incidentDate) }}</td>
          <td>
            <RcStatusPill :status="claim.status" />
          </td>
          <td class="rc-right rc-num">{{ fmtTRY(claim.claimedAmount) }}</td>
          <td class="rc-right rc-num">{{ fmtTRY(claim.approvedAmount) }}</td>
          <td style="min-width: 160px">
            <PaymentProgress
              v-if="claim.approvedAmount > 0"
              :amount="claim.approvedAmount"
              :paid-amount="claim.paidAmount"
              :currency="claim.currency"
              :show-amounts="false"
            />
            <span v-else class="rcr-row__secondary">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
