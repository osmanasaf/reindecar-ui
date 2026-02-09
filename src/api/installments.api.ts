import { BaseApi } from './client'
import type { VehicleInstallmentResponse, CreateVehicleInstallmentRequest, CloseInstallmentEarlyForm } from '@/types'

class InstallmentsApiService extends BaseApi {
    protected readonly basePath = '/vehicle-installments'

    async create(vehicleId: number, form: CreateVehicleInstallmentRequest): Promise<VehicleInstallmentResponse> {
        return this.post(`?vehicleId=${vehicleId}`, form)
    }

    async createInstallment(vehicleId: number, form: CreateVehicleInstallmentRequest): Promise<VehicleInstallmentResponse> {
        return this.create(vehicleId, form)
    }

    async getById(id: number): Promise<VehicleInstallmentResponse> {
        return this.get(`/${id}`)
    }

    async getByVehicleId(vehicleId: number): Promise<VehicleInstallmentResponse> {
        return this.get(`/vehicle/${vehicleId}`)
    }

    async delete(id: number): Promise<void> {
        return this.remove(`/${id}`)
    }

    async recordPayment(installmentId: number, paymentId: number): Promise<any> {
        return this.post(`/${installmentId}/payments/${paymentId}/record`)
    }

    async closeEarly(id: number, form: CloseInstallmentEarlyForm): Promise<VehicleInstallmentResponse> {
        return this.post(`/${id}/close-early`, form)
    }

    async getDashboard(): Promise<any> {
        return this.get('/dashboard')
    }

    async getVehicleDetails(vehicleId: number): Promise<any> {
        return this.get(`/vehicles/${vehicleId}/details`)
    }
}

export const installmentsApi = new InstallmentsApiService()
