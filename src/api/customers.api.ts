import { BaseApi } from './client'
import type {
    PaginatedResponse,
    PaginationParams,
    Customer,
    CreatePersonalCustomerForm,
    CreateCompanyCustomerForm
} from '@/types'

class CustomersApiService extends BaseApi {
    protected readonly basePath = '/customers'

    async getAll(params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
        return this.getList<Customer>('', params)
    }

    async getByType(type: string, params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
        return this.getList<Customer>(`/type/${type}`, params)
    }

    async search(query: string, params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
        return this.getList<Customer>('/search', { q: query, ...params })
    }

    async getBlacklisted(): Promise<Customer[]> {
        return this.get('/blacklisted')
    }

    async getById(id: number): Promise<Customer> {
        return this.get(`/${id}`)
    }

    async getByPublicId(publicId: string): Promise<Customer> {
        return this.get(`/public/${publicId}`)
    }

    async createPersonal(customer: CreatePersonalCustomerForm): Promise<Customer> {
        return this.post('/personal', customer)
    }

    async createCompany(customer: CreateCompanyCustomerForm): Promise<Customer> {
        return this.post('/company', customer)
    }

    async addToBlacklist(id: number, reason: string): Promise<Customer> {
        return this.patch(`/${id}/blacklist`, { reason })
    }

    async removeFromBlacklist(id: number): Promise<Customer> {
        return this.patch(`/${id}/unblacklist`)
    }

    async deleteById(id: number): Promise<void> {
        return this.remove(`/${id}`)
    }
}

export const customersApi = new CustomersApiService()
