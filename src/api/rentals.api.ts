import { BaseApi } from './client'
import type {
    PaginatedResponse,
    PaginationParams,
    Rental,
    RentalDriver,
    KmPackage,
    CreateRentalForm,
    VehicleDeliveryForm,
    VehicleReturnForm,
    AddRentalDriverForm,
    CreateKmPackageForm,
    LeasingKmRecord,
    LeasingKmSummary,
    RecordKmForm,
    RentalType
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

    async activate(id: number, form: VehicleDeliveryForm): Promise<Rental> {
        return this.post(`/${id}/activate`, form)
    }

    async startReturn(id: number): Promise<Rental> {
        return this.post(`/${id}/start-return`)
    }

    async complete(id: number, form: VehicleReturnForm): Promise<Rental> {
        return this.post(`/${id}/complete`, form)
    }

    async cancel(id: number): Promise<Rental> {
        return this.post(`/${id}/cancel`)
    }

    async getDrivers(rentalId: number): Promise<RentalDriver[]> {
        return this.get(`/${rentalId}/drivers`)
    }

    async addDriver(rentalId: number, form: AddRentalDriverForm): Promise<RentalDriver> {
        return this.post(`/${rentalId}/drivers`, form)
    }

    async removeDriver(rentalId: number, driverId: number): Promise<void> {
        return this.delete(`/${rentalId}/drivers/${driverId}`)
    }

    async setPrimaryDriver(rentalId: number, driverId: number): Promise<RentalDriver> {
        return this.put(`/${rentalId}/drivers/${driverId}/primary`)
    }
}

class KmPackagesApiService extends BaseApi {
    protected readonly basePath = '/km-packages'

    async getAll(): Promise<KmPackage[]> {
        return this.get('')
    }

    async getActive(): Promise<KmPackage[]> {
        return this.get('/active')
    }

    async getByRentalType(type: RentalType): Promise<KmPackage[]> {
        return this.get(`/by-rental-type/${type}`)
    }

    async getByCategory(categoryId: number): Promise<KmPackage[]> {
        return this.get(`/by-category/${categoryId}`)
    }

    async getGlobal(): Promise<KmPackage[]> {
        return this.get('/global')
    }

    async getById(id: number): Promise<KmPackage> {
        return this.get(`/${id}`)
    }

    async create(form: CreateKmPackageForm): Promise<KmPackage> {
        return this.post('', form)
    }

    async update(id: number, form: CreateKmPackageForm): Promise<KmPackage> {
        return this.put(`/${id}`, form)
    }

    async activate(id: number): Promise<KmPackage> {
        return this.post(`/${id}/activate`)
    }

    async deactivate(id: number): Promise<KmPackage> {
        return this.post(`/${id}/deactivate`)
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
export const kmPackagesApi = new KmPackagesApiService()
export const leasingKmApi = new LeasingKmApiService()
