export type CustomerContractStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'COMPLETED'

export interface CustomerContractResponse {
    id: number
    customerId: number
    categoryId: number
    contractNumber: string
    termMonths: number
    negotiatedMonthlyPrice: number
    currency: string
    includedKmPerMonth: number
    extraKmPrice: number | null
    startDate: string
    endDate: string
    status: CustomerContractStatus
    notes: string | null
    totalContractPrice: number
    totalIncludedKm: number
    createdAt: string
}

export interface CreateCustomerContractRequest {
    customerId: number
    categoryId: number
    termMonths: number
    negotiatedMonthlyPrice: number
    includedKmPerMonth: number
    extraKmPrice?: number
    startDate: string
    notes?: string
}

export const CUSTOMER_CONTRACT_STATUS_LABELS: Record<CustomerContractStatus, string> = {
    DRAFT: 'Taslak',
    ACTIVE: 'Aktif',
    SUSPENDED: 'Askıda',
    TERMINATED: 'Feshedildi',
    COMPLETED: 'Tamamlandı',
}

// Backend CustomerContract.ContractStatus (canActivate/canSuspend/canTerminate/canComplete)
// ile birebir aynı geçiş kuralları; burada backend'in reddedeceği geçişleri UI'da
// önceden gizlemek için tekrarlanıyor.
export const CUSTOMER_CONTRACT_ALLOWED_TRANSITIONS: Record<CustomerContractStatus, CustomerContractStatus[]> = {
    DRAFT: ['ACTIVE'],
    ACTIVE: ['SUSPENDED', 'TERMINATED', 'COMPLETED'],
    SUSPENDED: ['ACTIVE', 'TERMINATED'],
    TERMINATED: [],
    COMPLETED: [],
}
