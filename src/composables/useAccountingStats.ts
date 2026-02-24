import { ref, computed, onMounted } from 'vue'
import { useAccountingStore } from '@/stores'
import { accountingApi } from '@/api/accounting.api'
import type { AccountingSummaryResponse } from '@/types'
import { ReceivableStatus, PayableStatus, ClaimStatus } from '@/types/accounting'

export function useAccountingStats() {
  const accountingStore = useAccountingStore()
  const summary = ref<AccountingSummaryResponse | null>(null)

  const loadSummary = async () => {
    try {
      summary.value = await accountingApi.getSummary()
    } catch {
      summary.value = null
    }
  }

  onMounted(loadSummary)

  const totalReceivables = computed(() =>
    summary.value ? summary.value.receivables.totalAmount : accountingStore.totalReceivablesAmount
  )
  const outstandingReceivables = computed(() =>
    summary.value ? summary.value.receivables.remainingAmount : accountingStore.outstandingReceivablesAmount
  )
  const overdueReceivablesCount = computed(() =>
    summary.value ? summary.value.receivables.overdueCount : accountingStore.overdueReceivables.length
  )
  const overdueReceivablesAmount = computed(() =>
    summary.value ? summary.value.receivables.overdueAmount :
      accountingStore.overdueReceivables.reduce((s, r) => s + r.remainingAmount, 0)
  )

  const fullyPaidReceivablesCount = computed(() =>
    accountingStore.receivables.filter(r => r.status === ReceivableStatus.FULLY_PAID).length
  )

  const receivablesCollectionRate = computed(() => {
    const total = totalReceivables.value
    if (!total) return 0
    const paid = summary.value
      ? summary.value.receivables.paidAmount
      : total - outstandingReceivables.value
    return Math.round((paid / total) * 100)
  })

  const totalPayables = computed(() =>
    summary.value ? summary.value.payables.totalAmount : accountingStore.totalPayablesAmount
  )
  const outstandingPayables = computed(() =>
    summary.value ? summary.value.payables.remainingAmount : accountingStore.outstandingPayablesAmount
  )
  const overduePayablesCount = computed(() =>
    summary.value ? summary.value.payables.overdueCount : accountingStore.overduePayables.length
  )
  const overduePayablesAmount = computed(() =>
    summary.value ? summary.value.payables.overdueAmount :
      accountingStore.overduePayables.reduce((s, p) => s + p.remainingAmount, 0)
  )

  const fullyPaidPayablesCount = computed(() =>
    accountingStore.payables.filter(p => p.status === PayableStatus.FULLY_PAID).length
  )

  const payablesPaymentRate = computed(() => {
    const total = totalPayables.value
    if (!total) return 0
    const paid = summary.value
      ? summary.value.payables.paidAmount
      : total - outstandingPayables.value
    return Math.round((paid / total) * 100)
  })

  const totalClaims = computed(() => accountingStore.insuranceClaims.length)
  const pendingClaimsCount = computed(() => accountingStore.pendingClaims.length)
  const approvedClaimsCount = computed(() =>
    accountingStore.insuranceClaims.filter(c => c.status === ClaimStatus.APPROVED).length
  )
  const rejectedClaimsCount = computed(() =>
    accountingStore.insuranceClaims.filter(c => c.status === ClaimStatus.REJECTED).length
  )

  const totalClaimedAmount = computed(() => accountingStore.totalClaimedAmount)
  const totalApprovedAmount = computed(() => accountingStore.totalApprovedAmount)
  const totalPaidClaimsAmount = computed(() =>
    accountingStore.insuranceClaims.reduce((s, c) => s + c.paidAmount, 0)
  )

  const claimApprovalRate = computed(() => {
    const total = totalClaims.value
    if (!total) return 0
    return Math.round((approvedClaimsCount.value / total) * 100)
  })

  const claimAmountApprovalRate = computed(() => {
    const claimed = totalClaimedAmount.value
    if (!claimed) return 0
    return Math.round((totalApprovedAmount.value / claimed) * 100)
  })

  const totalProviders = computed(() => accountingStore.serviceProviders.length)
  const activeProvidersCount = computed(() => accountingStore.activeProviders.length)
  const inactiveProvidersCount = computed(() =>
    accountingStore.serviceProviders.filter(p => !p.active).length
  )

  const netPosition = computed(() =>
    summary.value ? summary.value.netPosition : outstandingReceivables.value - outstandingPayables.value
  )
  const isNetPositive = computed(() =>
    summary.value ? summary.value.netPositive : netPosition.value > 0
  )
  const receivableAging = computed(() => summary.value?.receivableAging ?? [])

  return {
    loadSummary,
    totalReceivables,
    outstandingReceivables,
    overdueReceivablesCount,
    overdueReceivablesAmount,
    fullyPaidReceivablesCount,
    receivablesCollectionRate,
    totalPayables,
    outstandingPayables,
    overduePayablesCount,
    overduePayablesAmount,
    fullyPaidPayablesCount,
    payablesPaymentRate,
    totalClaims,
    pendingClaimsCount,
    approvedClaimsCount,
    rejectedClaimsCount,
    totalClaimedAmount,
    totalApprovedAmount,
    totalPaidClaimsAmount,
    claimApprovalRate,
    claimAmountApprovalRate,
    totalProviders,
    activeProvidersCount,
    inactiveProvidersCount,
    netPosition,
    isNetPositive,
    receivableAging
  }
}
