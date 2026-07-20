import { BaseApi } from './client'
import type { CreateRentalPricingRequest, RentalPricingResponse } from '@/types/rental-pricing'
import type { RentalType } from '@/types/enums'

class RentalPricingApiService extends BaseApi {
    protected readonly basePath = '/rental-pricing'

    async getAll(): Promise<RentalPricingResponse[]> {
        return this.get('')
    }

    async getByVehicle(vehicleId: number): Promise<RentalPricingResponse[]> {
        return this.get(`/vehicle/${vehicleId}`)
    }

    async getByCustomer(customerId: number): Promise<RentalPricingResponse[]> {
        return this.get(`/customer/${customerId}`)
    }

    async findApplicable(vehicleId: number, rentalType: RentalType, customerId?: number): Promise<RentalPricingResponse> {
        return this.get('/find', { vehicleId, rentalType, customerId })
    }

    async create(request: CreateRentalPricingRequest): Promise<RentalPricingResponse> {
        return this.post('', request)
    }

    async deactivate(id: number): Promise<void> {
        return this.deleteByPath(`/${id}`)
    }
}

export const rentalPricingApi = new RentalPricingApiService()
