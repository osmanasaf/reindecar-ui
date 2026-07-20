export interface MoneySummary {
    currency: string
    amount: number
}

export interface VehicleProfitabilityRow {
    vehicleId: number
    plateNumber: string
    brand: string
    model: string
    categoryId: number | null
    categoryName: string | null
    branchId: number | null
    branchName: string | null
    revenue: MoneySummary[]
    maintenanceCost: MoneySummary[]
    damageCost: MoneySummary[]
    penaltyCost: MoneySummary[]
    tollCost: MoneySummary[]
    insuranceCost: MoneySummary[]
    financingOutflow: MoneySummary[]
    netContribution: MoneySummary[]
    rentedDays: number
    availableDays: number
    utilizationRate: number
    rentalCount: number
}

export interface VehicleProfitabilityResponse {
    from: string
    to: string
    rows: VehicleProfitabilityRow[]
}

export type ProfitabilityLineItemType =
    | 'REVENUE'
    | 'MAINTENANCE'
    | 'DAMAGE'
    | 'PENALTY'
    | 'TOLL'
    | 'INSURANCE'
    | 'FINANCING'

export interface ProfitabilityLineItem {
    type: ProfitabilityLineItemType
    referenceId: number | null
    date: string
    description: string | null
    amount: MoneySummary
    excludedFromCost: boolean
}

export interface VehicleProfitabilityDetailResponse {
    summary: VehicleProfitabilityRow
    items: ProfitabilityLineItem[]
}

export const PROFITABILITY_LINE_ITEM_LABELS: Record<ProfitabilityLineItemType, string> = {
    REVENUE: 'Gelir',
    MAINTENANCE: 'Bakım',
    DAMAGE: 'Hasar',
    PENALTY: 'Ceza',
    TOLL: 'HGS/OGS',
    INSURANCE: 'Sigorta',
    FINANCING: 'Taksit',
}
