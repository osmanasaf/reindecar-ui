import { BaseApi } from './client'
import type { Driver, CreateDriverForm } from '@/types'

interface DriverListParams {
    customerId?: number
    active?: boolean
}

class DriversApiService extends BaseApi {
    protected readonly basePath = '/drivers'

    async getAll(params?: DriverListParams): Promise<Driver[]> {
        return this.get('', params)
    }

    async getById(id: number): Promise<Driver> {
        return this.get(`/${id}`)
    }

    async create(form: CreateDriverForm): Promise<Driver> {
        return this.post('', form)
    }
}

export const driversApi = new DriversApiService()
