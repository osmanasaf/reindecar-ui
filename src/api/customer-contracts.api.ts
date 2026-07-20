import { BaseApi } from './client'
import type { CreateCustomerContractRequest, CustomerContractResponse } from '@/types/customer-contract'

class CustomerContractsApiService extends BaseApi {
    protected readonly basePath = '/customer-contracts'

    async findAll(): Promise<CustomerContractResponse[]> {
        return this.get('')
    }

    async findById(id: number): Promise<CustomerContractResponse> {
        return this.get(`/${id}`)
    }

    async findByContractNumber(contractNumber: string): Promise<CustomerContractResponse> {
        return this.get(`/by-number/${contractNumber}`)
    }

    async findByCustomerId(customerId: number): Promise<CustomerContractResponse[]> {
        return this.get(`/customer/${customerId}`)
    }

    async findActiveByCustomerId(customerId: number): Promise<CustomerContractResponse[]> {
        return this.get(`/customer/${customerId}/active`)
    }

    async create(request: CreateCustomerContractRequest): Promise<CustomerContractResponse> {
        return this.post('', request)
    }

    async activate(id: number): Promise<void> {
        return this.post(`/${id}/activate`)
    }

    async suspend(id: number): Promise<void> {
        return this.post(`/${id}/suspend`)
    }

    async terminate(id: number): Promise<void> {
        return this.post(`/${id}/terminate`)
    }

    async complete(id: number): Promise<void> {
        return this.post(`/${id}/complete`)
    }
}

export const customerContractsApi = new CustomerContractsApiService()
