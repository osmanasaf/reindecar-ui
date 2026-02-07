import { computed } from 'vue'
import { useAccountingStore } from '@/stores'

export function useAccountingStats() {
  const accountingStore = useAccountingStore()


  const totalReceivables = computed(() => accountingStore.totalReceivablesAmount)
  const outstandingReceivables = computed(() => accountingStore.outstandingReceivablesAmount)
  const overdueReceivablesCount = computed(() => accountingStore.overdueReceivables.length)
  const overdueReceivablesAmount = computed(() =>
    accountingStore.overdueReceivables.reduce((sum, r) => sum + r.remainingAmount, 0)
  )

  const fullyPaidReceivablesCount = computed(() =>
    accountingStore.receivables.filter(r => r.status === 'FULLY_PAID').length
  )

  const receivablesCollectionRate = computed(() => {
    const total = accountingStore.totalReceivablesAmount
    if (total === 0) return 0
    const paid = total - accountingStore.outstandingReceivablesAmount
    return Math.round((paid / total) * 100)
  })


  const totalPayables = computed(() => accountingStore.totalPayablesAmount)
  const outstandingPayables = computed(() => accountingStore.outstandingPayablesAmount)
  const overduePayablesCount = computed(() => accountingStore.overduePayables.length)
  const overduePayablesAmount = computed(() =>
    accountingStore.overduePayables.reduce((sum, p) => sum + p.remainingAmount, 0)
  )

  const fullyPaidPayablesCount = computed(() =>
    accountingStore.payables.filter(p => p.status === 'FULLY_PAID').length
  )

  const payablesPaymentRate = computed(() => {
    const total = accountingStore.totalPayablesAmount
    if (total === 0) return 0
    const paid = total - accountingStore.outstandingPayablesAmount
    return Math.round((paid / total) * 100)
  })


  const totalClaims = computed(() => accountingStore.insuranceClaims.length)
  const pendingClaimsCount = computed(() => accountingStore.pendingClaims.length)
  const approvedClaimsCount = computed(() =>
    accountingStore.insuranceClaims.filter(c => c.status === 'APPROVED').length
  )
  const rejectedClaimsCount = computed(() =>
    accountingStore.insuranceClaims.filter(c => c.status === 'REJECTED').length
  )

  const totalClaimedAmount = computed(() => accountingStore.totalClaimedAmount)
  const totalApprovedAmount = computed(() => accountingStore.totalApprovedAmount)
  const totalPaidClaimsAmount = computed(() =>
    accountingStore.insuranceClaims.reduce((sum, c) => sum + c.paidAmount, 0)
  )

  const claimApprovalRate = computed(() => {
    const total = totalClaims.value
    if (total === 0) return 0
    return Math.round((approvedClaimsCount.value / total) * 100)
  })

  const claimAmountApprovalRate = computed(() => {
    const claimed = totalClaimedAmount.value
    if (claimed === 0) return 0
    return Math.round((totalApprovedAmount.value / claimed) * 100)
  })


  const totalProviders = computed(() => accountingStore.serviceProviders.length)
  const activeProvidersCount = computed(() => accountingStore.activeProviders.length)
  const inactiveProvidersCount = computed(() =>
    accountingStore.serviceProviders.filter(p => !p.active).length
  )


  const netPosition = computed(() =>
    outstandingReceivables.value - outstandingPayables.value
  )

  const isNetPositive = computed(() => netPosition.value > 0)

  return {

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
    isNetPositive
  }
}
