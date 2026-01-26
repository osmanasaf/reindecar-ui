import { BaseApi } from './client'
import type {
    PaginatedResponse,
    PaginationParams,
    Vehicle,
    CreateVehicleForm,
    UpdateVehicleForm,
    UpdateVehicleStatusForm,
    VehicleCategory,
    VehicleHistory
} from '@/types'

class VehiclesApiService extends BaseApi {
    protected readonly basePath = '/vehicles'

    async getAll(params?: PaginationParams): Promise<PaginatedResponse<Vehicle>> {
        return this.getList<Vehicle>('', params)
    }

    async getAvailable(): Promise<Vehicle[]> {
        return this.get('/available')
    }

    async getAvailableForPeriod(startDate: string, endDate: string): Promise<Vehicle[]> {
        const response = await this.getList<Vehicle>('/available-for-period', { startDate, endDate })
        return response.content
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

    async update(id: number, vehicle: UpdateVehicleForm): Promise<Vehicle> {
        return this.put(`/${id}`, vehicle)
    }

    async updateStatus(id: number, form: UpdateVehicleStatusForm): Promise<Vehicle> {
        return this.patch(`/${id}/status`, form)
    }

    async updateKm(id: number, km: number): Promise<Vehicle> {
        return this.patch(`/${id}/km`, { currentKm: km })
    }

    async deleteById(id: number): Promise<void> {
        return this.remove(`/${id}`)
    }

    async getHistory(id: number): Promise<VehicleHistory> {
        return this.get(`/${id}/full-history`)
    }
}

class VehicleCategoriesApiService extends BaseApi {
    protected readonly basePath = '/vehicle-categories'

    async getAll(): Promise<VehicleCategory[]> {
        return this.get()
    }

    async getById(id: number): Promise<VehicleCategory> {
        return this.get(`/${id}`)
    }

    async create(category: Partial<VehicleCategory>): Promise<VehicleCategory> {
        return this.post('', category)
    }

    async deleteById(id: number): Promise<void> {
        return this.remove(`/${id}`)
    }
}

export const vehiclesApi = new VehiclesApiService()
export const vehicleCategoriesApi = new VehicleCategoriesApiService()
