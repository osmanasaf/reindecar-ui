import { BaseApi } from './client'
import type { CreateTenantPayload, Tenant, UpdateTenantPayload } from '@/types/tenant'

class AdminTenantsApiService extends BaseApi {
    protected readonly basePath = '/admin/tenants'

    async list(): Promise<Tenant[]> {
        return this.get<Tenant[]>('')
    }

    async getById(id: number): Promise<Tenant> {
        return this.get<Tenant>(`/${id}`)
    }

    async create(payload: CreateTenantPayload): Promise<Tenant> {
        return this.post<Tenant>('', payload)
    }

    async update(id: number, payload: UpdateTenantPayload): Promise<Tenant> {
        return this.put<Tenant>(`/${id}`, payload)
    }

    async remove(id: number): Promise<void> {
        return this.deleteByPath(`/${id}`)
    }
}

export const adminTenantsApi = new AdminTenantsApiService()
