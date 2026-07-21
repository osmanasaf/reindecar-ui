import { BaseApi } from './client'
import type {
    PaginatedResponse,
    PaginationParams,
    Rental,
    RentalDriver,
    RentalDetailResponse,
    KmPackage,
    CreateRentalForm,
    UpdateRentalForm,
    VehicleDeliveryForm,
    VehicleReturnForm,
    ExtendRentalForm,
    AddRentalDriverForm,
    CreateKmPackageForm,
    LeasingKmRecord,
    LeasingKmSummary,
    RecordKmForm,
    RentalType,
    ReturnPreviewResponse
} from '@/types'

class RentalsApiService extends BaseApi {
    protected readonly basePath = '/rentals'

    async getAll(params?: PaginationParams & { status?: string; search?: string; rentalType?: string }): Promise<PaginatedResponse<Rental>> {
        return this.getList<Rental>('', params)
    }

    async getActive(params?: PaginationParams & { search?: string; rentalType?: string }): Promise<PaginatedResponse<Rental>> {
        return this.getList<Rental>('/active', params)
    }

    async getOverdue(params?: PaginationParams & { search?: string; rentalType?: string }): Promise<PaginatedResponse<Rental>> {
        return this.getList<Rental>('/overdue', params)
    }

    async getByCustomer(customerId: number, params?: PaginationParams): Promise<PaginatedResponse<Rental>> {
        return this.getList<Rental>(`/customer/${customerId}`, params)
    }

    async getActiveByCustomer(customerId: number): Promise<Rental[]> {
        return this.get(`/customer/${customerId}/active`)
    }

    async getById(id: number): Promise<Rental> {
        return this.get(`/${id}`)
    }

    /** Tek istekte kiralama + araç, müşteri, şubeler, sürücüler, ödemeler, ek kalemler, cezalar, hasar, geçiş */
    async getDetail(id: number): Promise<RentalDetailResponse> {
        return this.get(`/${id}/detail`)
    }

    async getPaymentSummary(id: number): Promise<import('@/types').RentalPaymentSummaryResponse> {
        return this.get(`/${id}/payment-summary`)
    }

    async create(rental: CreateRentalForm): Promise<Rental> {
        return this.post('', rental)
    }

    async update(id: number, form: UpdateRentalForm): Promise<Rental> {
        return this.put(`/${id}`, form)
    }

    async reserve(id: number): Promise<Rental> {
        return this.post(`/${id}/reserve`)
    }

    async activate(id: number, form: VehicleDeliveryForm): Promise<Rental> {
        return this.post(`/${id}/activate`, form)
    }

    async extend(id: number, form: ExtendRentalForm): Promise<Rental> {
        return this.post(`/${id}/extend`, form)
    }

    async startReturn(id: number): Promise<Rental> {
        return this.post(`/${id}/start-return`)
    }

    async previewReturn(
        id: number,
        endKm: number,
        actualReturnDate: string,
        endFuelPercent?: number,
    ): Promise<ReturnPreviewResponse> {
        const params: Record<string, unknown> = { endKm, actualReturnDate }
        if (endFuelPercent != null) {
            params.endFuelPercent = endFuelPercent
        }
        return this.get(`/${id}/return-preview`, params)
    }

    async complete(id: number, form: VehicleReturnForm): Promise<Rental> {
        return this.post(`/${id}/complete`, form)
    }

    async cancel(id: number, body?: { reason?: string; notes?: string }): Promise<Rental> {
        return this.post(`/${id}/cancel`, body ?? {})
    }

    async closeRental(id: number): Promise<Rental> {
        return this.post(`/${id}/close`, {})
    }

    async downloadHandoverPdf(id: number): Promise<Blob> {
        return this.getBlob(`/${id}/handover-pdf`)
    }

    async downloadCompletionPdf(id: number): Promise<Blob> {
        return this.getBlob(`/${id}/completion-pdf`)
    }

    async downloadOfferPdf(id: number): Promise<Blob> {
        return this.getBlob(`/${id}/offer-pdf`)
    }

    async getDrivers(rentalId: number): Promise<RentalDriver[]> {
        return this.get(`/${rentalId}/drivers`)
    }

    async addDriver(rentalId: number, form: AddRentalDriverForm): Promise<RentalDriver> {
        return this.post(`/${rentalId}/drivers`, form)
    }

    async removeDriver(rentalId: number, driverId: number): Promise<void> {
        return this.deleteByPath(`/${rentalId}/drivers/${driverId}`)
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
        return this.get(`/category/${categoryId}`)
    }

    async getGlobal(): Promise<KmPackage[]> {
        return this.get('/global')
    }

    async getAvailableForCategory(categoryId: number): Promise<KmPackage[]> {
        return this.get(`/available/${categoryId}`)
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
