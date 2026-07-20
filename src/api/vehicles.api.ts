import { BaseApi } from './client'
import type {
    PaginatedResponse,
    PaginationParams,
    Vehicle,
    VehicleOverview,
    CreateVehicleForm,
    UpdateVehicleForm,
    UpdateVehicleStatusForm,
    VehicleCategory,
    VehicleHistory,
    VehicleDetails,
    VehicleLocation,
    UpdateVehicleDetailsForm,
    RecordVehicleLocationForm,
} from '@/types'
import { VehicleStatus } from '@/types/enums'
import type { VehicleCalendarRow } from '@/types/calendar'

export interface VehicleRecognitionResult {
    brand: string | null
    model: string | null
    year: number | null
    color: string | null
    bodyType: string | null
    plateNumber: string | null
    vinNumber?: string | null
    engineCapacity?: number | null
    confidence: number
    recognized: boolean
}

class VehiclesApiService extends BaseApi {
    protected readonly basePath = '/vehicles'

    async getOverview(): Promise<VehicleOverview> {
        return this.get('/overview')
    }

    async getAll(params?: PaginationParams & {
        categoryId?: number
        status?: VehicleStatus
        branchId?: number
    }): Promise<PaginatedResponse<Vehicle>> {
        return this.getList<Vehicle>('', params)
    }

    async getByStatus(
        status: VehicleStatus,
        params?: PaginationParams & { categoryId?: number; branchId?: number }
    ): Promise<PaginatedResponse<Vehicle>> {
        return this.getList<Vehicle>(`/status/${status}`, params)
    }

    async search(query: string, params?: PaginationParams): Promise<PaginatedResponse<Vehicle>> {
        const searchParams = { q: query, ...params } as PaginationParams
        return this.getList<Vehicle>('/search', searchParams)
    }

    async getAvailable(): Promise<Vehicle[]> {
        return this.get('/available')
    }

    async getAvailableForPeriod(
        startDate: string,
        endDate: string,
        params?: PaginationParams & { categoryId?: number; branchId?: number }
    ): Promise<PaginatedResponse<Vehicle>> {
        return this.getList<Vehicle>('/available-for-period', { startDate, endDate, ...params } as PaginationParams)
    }

    async getAvailableForPeriodList(startDate: string, endDate: string): Promise<Vehicle[]> {
        const response = await this.getAvailableForPeriod(startDate, endDate)
        return response.content
    }

    async getFleetCalendar(params: {
        from: string
        to: string
        branchId?: number | null
        categoryId?: number | null
        search?: string
        page?: number
        size?: number
    }): Promise<PaginatedResponse<VehicleCalendarRow>> {
        return this.getList<VehicleCalendarRow>('/calendar', {
            from: params.from,
            to: params.to,
            ...(params.branchId ? { branchId: params.branchId } : {}),
            ...(params.categoryId ? { categoryId: params.categoryId } : {}),
            ...(params.search ? { search: params.search } : {}),
            page: params.page ?? 0,
            size: params.size ?? 50,
        } as PaginationParams)
    }

    async getByBranch(branchId: number): Promise<Vehicle[]> {
        return this.get(`/branch/${branchId}`)
    }

    async getById(id: number): Promise<Vehicle> {
        return this.get(`/${id}`)
    }

    async create(vehicle: CreateVehicleForm): Promise<Vehicle> {
        return this.post('', vehicle)
    }

    async patchById(id: number, vehicle: UpdateVehicleForm): Promise<Vehicle> {
        return this.patch(`/${id}`, vehicle)
    }

    async putById(id: number, vehicle: UpdateVehicleForm): Promise<Vehicle> {
        return this.put(`/${id}`, vehicle)
    }

    async update(id: number, vehicle: UpdateVehicleForm): Promise<Vehicle> {
        return this.putById(id, vehicle)
    }

    async updateStatus(id: number, form: UpdateVehicleStatusForm): Promise<Vehicle> {
        return this.patch(`/${id}/status`, form)
    }

    async updateKm(id: number, km: number): Promise<Vehicle> {
        return this.patch(`/${id}/km`, { currentKm: km })
    }

    async deleteById(id: number): Promise<void> {
        return this.deleteByPath(`/${id}`)
    }

    async getHistory(id: number): Promise<VehicleHistory> {
        return this.get(`/${id}/full-history`)
    }

    async getDetails(id: number): Promise<VehicleDetails> {
        return this.get(`/${id}/details`)
    }

    async patchDetails(id: number, payload: UpdateVehicleDetailsForm): Promise<VehicleDetails> {
        return this.patch(`/${id}/details`, payload)
    }

    async getCurrentLocation(id: number, date?: string): Promise<VehicleLocation> {
        return this.get(`/${id}/locations/current`, date ? { date } : undefined)
    }

    async getLocationHistory(
        id: number,
        params?: PaginationParams,
    ): Promise<PaginatedResponse<VehicleLocation>> {
        return this.getList<VehicleLocation>(`/${id}/locations`, {
            sort: 'locationDate',
            direction: 'desc',
            ...params,
        })
    }

    async recordLocation(id: number, payload: RecordVehicleLocationForm): Promise<VehicleLocation> {
        return this.post(`/${id}/locations`, payload)
    }

    async getVehiclesAtBranchOnDate(branchId: number, date: string): Promise<VehicleLocation[]> {
        return this.get('/locations', { branchId, date })
    }

    async recognizeFromPhoto(file: File): Promise<VehicleRecognitionResult> {
        const formData = new FormData()
        formData.append('file', file)
        return this.postFormData(formData, '/recognize')
    }

    async recognizeRegistration(file: File): Promise<VehicleRecognitionResult> {
        const formData = new FormData()
        formData.append('file', file)
        return this.postFormData(formData, '/recognize-registration')
    }

    async uploadImage(vehicleId: number, file: File): Promise<string> {
        const formData = new FormData()
        formData.append('image', file)
        return this.postFormData(formData, `/${vehicleId}/image`)
    }

    async deleteImage(vehicleId: number): Promise<void> {
        return this.deleteByPath(`/${vehicleId}/image`)
    }
}

class VehicleCategoriesApiService extends BaseApi {
    protected readonly basePath = '/vehicle-categories'

    async getAll(): Promise<VehicleCategory[]> {
        return this.get()
    }

    async getAllAll(): Promise<VehicleCategory[]> {
        return this.get('/all')
    }

    async getById(id: number): Promise<VehicleCategory> {
        return this.get(`/${id}`)
    }

    async create(category: Partial<VehicleCategory>): Promise<VehicleCategory> {
        return this.post('', category)
    }

    async update(id: number, category: Partial<VehicleCategory>): Promise<VehicleCategory> {
        return this.put(`/${id}`, category)
    }

    async deactivate(id: number): Promise<void> {
        return this.patch(`/${id}/deactivate`)
    }

    async activate(id: number): Promise<void> {
        return this.patch(`/${id}/activate`)
    }

    async deleteById(id: number): Promise<void> {
        return this.deleteByPath(`/${id}`)
    }
}

export const vehiclesApi = new VehiclesApiService()
export const vehicleCategoriesApi = new VehicleCategoriesApiService()
