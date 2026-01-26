import { BaseApi } from './client'
import type { 
    RentalType, 
    CategoryPricing, 
    VehiclePricing, 
    TermDiscount, 
    ExtraItemType, 
    RentalExtraItem,
    DiscountType,
    CalculationType
} from '@/types'

export interface PriceBreakdownItem {
    description: string
    amount: number
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
    termMonths?: number
    kmPackageId?: number
}

export interface CategoryPricingRequest {
    categoryId: number
    dailyPrice: number
    weeklyPrice: number
    monthlyPrice: number
    yearlyPrice: number
    currency?: string
    validFrom?: string
    validTo?: string
}

export interface VehiclePricingRequest {
    vehicleId: number
    dailyPrice?: number
    weeklyPrice?: number
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    validFrom?: string
    validTo?: string
}

export interface TermDiscountRequest {
    categoryId?: number
    termMonths: number
    discountType: DiscountType
    discountValue: number
}

export interface ExtraItemTypeRequest {
    code: string
    name: string
    description?: string
    defaultAmount?: number
    currency?: string
    calculationType: CalculationType
    sortOrder?: number
}

export interface RentalExtraItemRequest {
    itemTypeId?: number
    customName?: string
    description?: string
    amount: number
    currency?: string
    calculationType: CalculationType
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
    weeklyPrice?: number
    monthlyPrice?: number
    unitPrice: number
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

class CategoryPricingApiService extends BaseApi {
    protected readonly basePath = '/pricing/categories'

    async getAll(): Promise<CategoryPricing[]> {
        return this.get('')
    }

    async getByCategory(categoryId: number): Promise<CategoryPricing[]> {
        return this.get(`/${categoryId}`)
    }

    async getApplicable(categoryId: number, date: string): Promise<CategoryPricing> {
        return this.get(`/${categoryId}/applicable`, { date })
    }

    async getById(id: number): Promise<CategoryPricing> {
        return this.get(`/${id}`)
    }

    async create(request: CategoryPricingRequest): Promise<CategoryPricing> {
        return this.post('', request)
    }

    async update(id: number, request: CategoryPricingRequest): Promise<CategoryPricing> {
        return this.put(`/${id}`, request)
    }

    async deactivate(id: number): Promise<void> {
        return this.delete(`/${id}`)
    }
}

class VehiclePricingApiService extends BaseApi {
    protected readonly basePath = '/pricing/vehicles'

    async getByVehicle(vehicleId: number): Promise<VehiclePricing | null> {
        return this.get(`/${vehicleId}`)
    }

    async upsert(request: VehiclePricingRequest): Promise<VehiclePricing> {
        return this.post('', request)
    }

    async deactivate(vehicleId: number): Promise<void> {
        return this.delete(`/${vehicleId}`)
    }
}

class TermDiscountApiService extends BaseApi {
    protected readonly basePath = '/pricing/term-discounts'

    async getAll(): Promise<TermDiscount[]> {
        return this.get('')
    }

    async getByCategory(categoryId: number): Promise<TermDiscount[]> {
        return this.get(`/category/${categoryId}`)
    }

    async getByTerm(termMonths: number): Promise<TermDiscount[]> {
        return this.get(`/term/${termMonths}`)
    }

    async create(request: TermDiscountRequest): Promise<TermDiscount> {
        return this.post('', request)
    }

    async update(id: number, request: TermDiscountRequest): Promise<TermDiscount> {
        return this.put(`/${id}`, request)
    }

    async deactivate(id: number): Promise<void> {
        return this.delete(`/${id}`)
    }
}

class ExtraItemTypeApiService extends BaseApi {
    protected readonly basePath = '/pricing/extra-item-types'

    async getAll(): Promise<ExtraItemType[]> {
        return this.get('')
    }

    async create(request: ExtraItemTypeRequest): Promise<ExtraItemType> {
        return this.post('', request)
    }

    async update(id: number, request: ExtraItemTypeRequest): Promise<ExtraItemType> {
        return this.put(`/${id}`, request)
    }

    async deactivate(id: number): Promise<void> {
        return this.delete(`/${id}`)
    }
}

class RentalExtraItemApiService extends BaseApi {
    protected readonly basePath = '/pricing'

    async getByRental(rentalId: number): Promise<RentalExtraItem[]> {
        return this.get(`/rentals/${rentalId}/extra-items`)
    }

    async add(rentalId: number, request: RentalExtraItemRequest): Promise<RentalExtraItem> {
        return this.post(`/rentals/${rentalId}/extra-items`, request)
    }

    async remove(itemId: number): Promise<void> {
        return this.delete(`/extra-items/${itemId}`)
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
export const categoryPricingApi = new CategoryPricingApiService()
export const vehiclePricingApi = new VehiclePricingApiService()
export const termDiscountApi = new TermDiscountApiService()
export const extraItemTypeApi = new ExtraItemTypeApiService()
export const rentalExtraItemApi = new RentalExtraItemApiService()
export const leasingApi = new LeasingApiService()
