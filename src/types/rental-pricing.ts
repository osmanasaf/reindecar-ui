import type { RentalType } from './enums'

export type PricingLevel = 'VEHICLE' | 'CUSTOMER' | 'CATEGORY'

export interface RentalPricingResponse {
    id: number
    vehicleId: number | null
    customerId: number | null
    categoryId: number | null
    rentalType: RentalType
    monthlyPrice: number
    currency: string
    kmLimit: number
    extraKmPrice: number
    validFrom: string | null
    validTo: string | null
    active: boolean
    notes: string | null
    pricingLevel: PricingLevel
}

export interface CreateRentalPricingRequest {
    vehicleId?: number
    customerId?: number
    categoryId?: number
    rentalType: RentalType
    monthlyPrice: number
    kmLimit: number
    extraKmPrice: number
    validFrom?: string
    validTo?: string
    notes?: string
}

export const PRICING_LEVEL_LABELS: Record<PricingLevel, string> = {
    VEHICLE: 'Araç bazlı',
    CUSTOMER: 'Müşteri bazlı',
    CATEGORY: 'Kategori bazlı',
}
