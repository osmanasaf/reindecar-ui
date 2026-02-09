import { BaseApi } from './client'
import type {
    PaginatedResponse,
    PaginationParams,
    Customer,
    CreatePersonalCustomerForm,
    CreateCompanyCustomerForm,
    Driver,
    CreateDriverForm
} from '@/types'

interface CustomerRentalInfo {
    customerId: number
    customerType: 'PERSONAL' | 'COMPANY'
    activeRentalCount: number
    canCreateRental: boolean
    reason?: string
}

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

    async update(id: number, customer: CreatePersonalCustomerForm | CreateCompanyCustomerForm): Promise<Customer> {
        return this.put(`/${id}`, customer)
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

    async getDrivers(customerId: number, active?: boolean): Promise<Driver[]> {
        const params = active === undefined ? undefined : { active }
        const response = await this.get<PaginatedResponse<Driver> | Driver[]>(`/${customerId}/drivers`, params)
        if (response && typeof response === 'object' && 'content' in response) {
            const paginated = response as PaginatedResponse<Driver>
            return paginated.content
        }
        return Array.isArray(response) ? response : []
    }

    async createDriver(customerId: number, driver: CreateDriverForm): Promise<Driver> {
        return this.post(`/${customerId}/drivers`, driver)
    }
}

export const customersApi = new CustomersApiService()
