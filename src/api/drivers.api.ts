import { BaseApi } from './client'
import type { Driver, CreateDriverForm, Rental } from '@/types'

interface DriverListParams {
    customerId?: number
    active?: boolean
}

interface DriverAvailability {
    driverId: number
    available: boolean
    blockingRentalId?: number
    blockingRentalStatus?: string
}

class DriversApiService extends BaseApi {
    protected readonly basePath = '/drivers'

    async getAll(params?: DriverListParams): Promise<Driver[]> {
        const response = await this.getList<Driver>('', params)
        return response.content
    }

    async getById(id: number): Promise<Driver> {
        return this.get(`/${id}`)
    }

    async create(form: CreateDriverForm): Promise<Driver> {
        return this.post('', form)
    }

    async checkAvailability(driverId: number): Promise<DriverAvailability> {
        return this.get(`/${driverId}/availability`)
    }

    async getActiveRentals(driverId: number): Promise<Rental[]> {
        return this.get(`/${driverId}/active-rentals`)
    }
}

export const driversApi = new DriversApiService()
export type { DriverListParams, DriverAvailability }
