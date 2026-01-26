import { BaseApi } from './client'
import type {
    PaginatedResponse,
    PaginationParams,
    Rental,
    CreateRentalForm,
    VehicleDeliveryForm,
    VehicleReturnForm,
    LeasingKmRecord,
    LeasingKmSummary,
    RecordKmForm
} from '@/types'

class RentalsApiService extends BaseApi {
    protected readonly basePath = '/rentals'

    async getAll(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<Rental>> {
        return this.getList<Rental>('', params)
    }

    async getActive(): Promise<Rental[]> {
        return this.get('/active')
    }

    async getOverdue(): Promise<Rental[]> {
        return this.get('/overdue')
    }

    async getById(id: number): Promise<Rental> {
        return this.get(`/${id}`)
    }

    async create(rental: CreateRentalForm): Promise<Rental> {
        return this.post('', rental)
    }

    async reserve(id: number): Promise<Rental> {
        return this.post(`/${id}/reserve`)
    }

    async activate(id: number, delivery: VehicleDeliveryForm): Promise<Rental> {
        return this.post(`/${id}/activate`, delivery)
    }

    async startReturn(id: number): Promise<Rental> {
        return this.post(`/${id}/start-return`)
    }

    async complete(id: number, returnForm: VehicleReturnForm): Promise<Rental> {
        return this.post(`/${id}/complete`, returnForm)
    }

    async cancel(id: number): Promise<Rental> {
        return this.post(`/${id}/cancel`)
    }
}

class LeasingKmApiService extends BaseApi {
    protected readonly basePath = '/leasing'

    async recordKm(rentalId: number, form: RecordKmForm): Promise<LeasingKmRecord> {
        return this.post(`/${rentalId}/km-records`, form)
    }

    async getKmRecords(rentalId: number): Promise<LeasingKmRecord[]> {
        return this.get(`/${rentalId}/km-records`)
    }

    async getKmSummary(rentalId: number): Promise<LeasingKmSummary> {
        return this.get(`/${rentalId}/km-summary`)
    }
}

export const rentalsApi = new RentalsApiService()
export const leasingKmApi = new LeasingKmApiService()
