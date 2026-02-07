import { BaseApi } from './client'
import type {
    CreateVehicleInstallmentRequest,
    VehicleInstallmentResponse,
    InstallmentPaymentResponse,
    PaymentDashboardResponse,
    VehiclePaymentDetailsResponse
} from '@/types'

class InstallmentsApiService extends BaseApi {
    protected readonly basePath = '/vehicle-installments'

    async createInstallment(vehicleId: number, data: CreateVehicleInstallmentRequest): Promise<VehicleInstallmentResponse> {
        return this.post(`?vehicleId=${vehicleId}`, data)
    }

    async getById(id: number): Promise<VehicleInstallmentResponse> {
        return this.get(`/${id}`)
    }

    async getByVehicleId(vehicleId: number): Promise<VehicleInstallmentResponse> {
        return this.get(`/vehicle/${vehicleId}`)
    }

    async deleteInstallment(id: number): Promise<void> {
        return this.remove(`/${id}`)
    }

    async recordPayment(installmentId: number, paymentId: number): Promise<InstallmentPaymentResponse> {
        return this.post(`/${installmentId}/payments/${paymentId}/record`)
    }

    async getDashboard(): Promise<PaymentDashboardResponse> {
        return this.get('/dashboard')
    }

    async getVehicleDetails(vehicleId: number): Promise<VehiclePaymentDetailsResponse> {
        return this.get(`/vehicles/${vehicleId}/details`)
    }
}

export const installmentsApi = new InstallmentsApiService()
