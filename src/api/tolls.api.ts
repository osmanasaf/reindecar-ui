import { BaseApi } from './client'
import type { TollRecord, TollType } from '@/types'

export interface CreateTollRecordRequest {
    rentalId: number
    vehicleId: number
    customerId: number
    tollType: TollType
    passageDate: string
    passageLocation?: string
    tollAmount: number
    hgsTagNumber?: string
    description?: string
}

class TollsApiService extends BaseApi {
    protected readonly basePath = '/tolls'

    async create(request: CreateTollRecordRequest): Promise<TollRecord> {
        return this.post('', request)
    }

    async getById(id: number): Promise<TollRecord> {
        return this.get(`/${id}`)
    }

    async getByRental(rentalId: number): Promise<TollRecord[]> {
        return this.get(`/rental/${rentalId}`)
    }

    async getByVehicle(vehicleId: number): Promise<TollRecord[]> {
        const response = await this.getList<TollRecord>(`/vehicle/${vehicleId}`)
        return response.content
    }
}

export const tollsApi = new TollsApiService()
