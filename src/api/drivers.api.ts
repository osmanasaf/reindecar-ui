import { BaseApi } from './client'
import type { Driver, CreateDriverForm, UpdateDriverForm } from '@/types'

class DriversApiService extends BaseApi {
    protected readonly basePath = '/drivers'

    async getAll(customerId?: number, active?: boolean): Promise<Driver[]> {
        const params: Record<string, any> = {}
        if (customerId !== undefined) params.customerId = customerId
        if (active !== undefined) params.active = active
        return this.get('', params)
    }

    async getById(id: number): Promise<Driver> {
        return this.get(`/${id}`)
    }

    async create(form: CreateDriverForm): Promise<Driver> {
        return this.post('', form)
    }

    async update(id: number, form: UpdateDriverForm): Promise<Driver> {
        return this.put(`/${id}`, form)
    }

    async delete(id: number): Promise<void> {
        return this.remove(`/${id}`)
    }
}

export const driversApi = new DriversApiService()
