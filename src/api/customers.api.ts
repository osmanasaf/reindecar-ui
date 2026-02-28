import { BaseApi } from './client'
import type {
    PaginatedResponse,
    PaginationParams,
    Customer,
    CustomerStats,
    CreatePersonalCustomerForm,
    CreateCompanyCustomerForm,
    UpdateCompanyCustomerForm,
    CreateAuthorizedPersonRequest,
    UpdateAuthorizedPersonRequest,
    CompanyAuthorizedPerson,
    Driver,
    CreateDriverForm
} from '@/types'
import { normalizePhoneDigits } from '@/utils/phone'

class CustomersApiService extends BaseApi {
    protected readonly basePath = '/customers'

    private getAuthorizedPersonsPath(customerId: number, legacy = false): string {
        return legacy
            ? `/companies/${customerId}/authorized-persons`
            : `/${customerId}/authorized-persons`
    }

    async getAll(params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
        return this.getList<Customer>('', params)
    }

    async getByType(type: string, params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
        return this.getList<Customer>(`/type/${type}`, params)
    }

    async search(query: string, params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
        const searchParams = { q: query, ...params } as PaginationParams
        return this.getList<Customer>('/search', searchParams)
    }

    async getBlacklisted(): Promise<Customer[]> {
        return this.get('/blacklisted')
    }

    async getById(id: number): Promise<Customer> {
        return this.get(`/${id}`)
    }

    async getStats(id: number): Promise<CustomerStats> {
        return this.get(`/${id}/stats`)
    }

    async getByPublicId(publicId: string): Promise<Customer> {
        return this.get(`/public/${publicId}`)
    }

    async createPersonal(customer: CreatePersonalCustomerForm): Promise<Customer> {
        return this.post('/personal', {
            ...customer,
            phone: normalizePhoneDigits(customer.phone)
        })
    }

    async createCompany(customer: CreateCompanyCustomerForm): Promise<Customer> {
        const payload: CreateCompanyCustomerForm = {
            ...customer,
            phone: normalizePhoneDigits(customer.phone),
            authorizedPersons: customer.authorizedPersons.map(person => ({
                ...person,
                phone: normalizePhoneDigits(person.phone)
            }))
        }

        return this.post('/company', payload)
    }

    async update(id: number, customer: CreatePersonalCustomerForm | UpdateCompanyCustomerForm): Promise<Customer> {
        const payload = {
            ...customer,
            phone: normalizePhoneDigits(customer.phone)
        } as CreatePersonalCustomerForm | UpdateCompanyCustomerForm

        return this.put(`/${id}`, payload)
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
        const params = active === undefined ? undefined : ({ active } as PaginationParams)
        const response = await this.get<PaginatedResponse<Driver> | Driver[]>(`/${customerId}/drivers`, params)
        if (response && typeof response === 'object' && 'content' in response) {
            const paginated = response as PaginatedResponse<Driver>
            return paginated.content
        }
        return Array.isArray(response) ? response : []
    }

    async createDriver(customerId: number, driver: CreateDriverForm): Promise<Driver> {
        return this.post(`/${customerId}/drivers`, {
            ...driver,
            phone: normalizePhoneDigits(driver.phone)
        })
    }

    async getAuthorizedPersons(customerId: number, legacy = false): Promise<CompanyAuthorizedPerson[]> {
        return this.get(this.getAuthorizedPersonsPath(customerId, legacy))
    }

    async getAuthorizedPerson(customerId: number, id: number, legacy = false): Promise<CompanyAuthorizedPerson> {
        return this.get(`${this.getAuthorizedPersonsPath(customerId, legacy)}/${id}`)
    }

    async createAuthorizedPerson(
        customerId: number,
        form: CreateAuthorizedPersonRequest,
        legacy = false
    ): Promise<CompanyAuthorizedPerson> {
        return this.post(this.getAuthorizedPersonsPath(customerId, legacy), {
            ...form,
            phone: normalizePhoneDigits(form.phone)
        })
    }

    async updateAuthorizedPerson(
        customerId: number,
        id: number,
        form: UpdateAuthorizedPersonRequest,
        legacy = false
    ): Promise<CompanyAuthorizedPerson> {
        const payload = { ...form }
        if (typeof payload.phone === 'string') {
            payload.phone = normalizePhoneDigits(payload.phone)
        }
        return this.put(`${this.getAuthorizedPersonsPath(customerId, legacy)}/${id}`, payload)
    }

    async deleteAuthorizedPerson(customerId: number, id: number, legacy = false): Promise<void> {
        return this.remove(`${this.getAuthorizedPersonsPath(customerId, legacy)}/${id}`)
    }

    async setPrimaryAuthorizedPerson(customerId: number, id: number, legacy = false): Promise<CompanyAuthorizedPerson> {
        return this.patch(`${this.getAuthorizedPersonsPath(customerId, legacy)}/${id}/primary`)
    }

    async activateAuthorizedPerson(customerId: number, id: number, legacy = false): Promise<CompanyAuthorizedPerson> {
        return this.patch(`${this.getAuthorizedPersonsPath(customerId, legacy)}/${id}/activate`)
    }

    async deactivateAuthorizedPerson(customerId: number, id: number, legacy = false): Promise<CompanyAuthorizedPerson> {
        return this.patch(`${this.getAuthorizedPersonsPath(customerId, legacy)}/${id}/deactivate`)
    }
}

export const customersApi = new CustomersApiService()
