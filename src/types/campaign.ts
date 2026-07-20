import type { RentalType } from './enums'

export type CampaignDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'

export interface CampaignResponse {
    id: number
    name: string
    description: string | null
    discountType: CampaignDiscountType
    discountValue: number
    applicableRentalTypes: RentalType[]
    validFrom: string
    validTo: string
    minTermMonths: number | null
    categoryId: number | null
    active: boolean
}

export interface CreateCampaignRequest {
    name: string
    description?: string
    discountType: CampaignDiscountType
    discountValue: number
    applicableRentalTypes: RentalType[]
    validFrom: string
    validTo: string
    minTermMonths?: number
    categoryId?: number
}

export const CAMPAIGN_DISCOUNT_TYPE_LABELS: Record<CampaignDiscountType, string> = {
    PERCENTAGE: 'Yüzde (%)',
    FIXED_AMOUNT: 'Sabit tutar',
}
