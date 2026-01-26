import { BaseApi } from './client'
import type { RentalType } from '@/types'

export interface PriceBreakdownItem {
    label: string
    amount: number
    type: 'ADD' | 'SUBTRACT' | 'MULTIPLY'
}

export interface KmPackageInfo {
    id: number
    name: string
    includedKm: number
    extraKmPrice: number
    unlimited: boolean
}

export interface PriceCalculationRequest {
    vehicleId: number
    customerId?: number
    rentalType: RentalType
    startDate: string
    endDate: string
    kmPackageId?: number
}

export interface PriceCalculationResponse {
    vehicleId: number
    vehicleName: string
    customerId?: number
    rentalType: RentalType
    startDate: string
    endDate: string
    totalDays: number
    dailyPrice: number
    baseTotal: number
    finalTotal: number
    currency: string
    kmPackage?: KmPackageInfo
    breakdown: PriceBreakdownItem[]
}

export interface LeasingPlan {
    id: number
    categoryId: number
    categoryName: string
    termMonths: number
    monthlyBasePrice: number
    currency: string
    includedKmPerMonth: number
    totalContractPrice: number
    totalIncludedKm: number
    validFrom: string
    validTo: string
    active: boolean
}

class PricingApiService extends BaseApi {
    protected readonly basePath = '/pricing'

    async calculate(request: PriceCalculationRequest): Promise<PriceCalculationResponse> {
        return this.post('/calculate', request)
    }
}

class LeasingApiService extends BaseApi {
    protected readonly basePath = '/leasing'

    async getPlans(): Promise<LeasingPlan[]> {
        return this.get('/plans')
    }

    async getPlansByCategory(categoryId: number): Promise<LeasingPlan[]> {
        return this.get(`/plans/category/${categoryId}`)
    }

    async getPlanById(id: number): Promise<LeasingPlan> {
        return this.get(`/plans/${id}`)
    }

    async calculateLeasingPrice(request: PriceCalculationRequest): Promise<PriceCalculationResponse> {
        return this.post('/calculate', request)
    }
}

export const pricingApi = new PricingApiService()
export const leasingApi = new LeasingApiService()
