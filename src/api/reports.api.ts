import { BaseApi } from './client'
import type { VehicleProfitabilityDetailResponse, VehicleProfitabilityResponse } from '@/types/profitability'

export interface VehicleProfitabilityParams {
    from: string
    to: string
    branchId?: number | null
    categoryId?: number | null
}

class VehicleProfitabilityApiService extends BaseApi {
    protected readonly basePath = '/reports'

    async getProfitability(params: VehicleProfitabilityParams): Promise<VehicleProfitabilityResponse> {
        return this.get('/vehicle-profitability', {
            from: params.from,
            to: params.to,
            ...(params.branchId ? { branchId: params.branchId } : {}),
            ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        })
    }

    async getProfitabilityDetail(
        vehicleId: number,
        params: { from: string; to: string }
    ): Promise<VehicleProfitabilityDetailResponse> {
        return this.get(`/vehicle-profitability/${vehicleId}`, params)
    }
}

export const vehicleProfitabilityApi = new VehicleProfitabilityApiService()
