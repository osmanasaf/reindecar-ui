import { BaseApi } from './client'
import type {
    MaintenanceRecord,
    VehicleMaintenanceMap,
    CreateMaintenanceRecordForm,
    CompleteMaintenanceForm
} from '@/types'

class MaintenancesApiService extends BaseApi {
    protected readonly basePath = '/maintenances'

    async create(form: CreateMaintenanceRecordForm): Promise<MaintenanceRecord> {
        return this.post('', form)
    }

    async getById(id: number): Promise<MaintenanceRecord> {
        return this.get(`/${id}`)
    }

    async update(id: number, form: CreateMaintenanceRecordForm): Promise<MaintenanceRecord> {
        return this.put(`/${id}`, form)
    }

    async markAsCompleted(id: number, form: CompleteMaintenanceForm): Promise<MaintenanceRecord> {
        return this.patch(`/${id}/complete`, form)
    }

    async getVehicleMaintenances(vehicleId: number): Promise<MaintenanceRecord[]> {
        return this.get(`/vehicle/${vehicleId}`)
    }

    async getVehicleMaintenanceMap(vehicleId: number): Promise<VehicleMaintenanceMap> {
        return this.get(`/vehicle/${vehicleId}/map`)
    }
}

export const maintenancesApi = new MaintenancesApiService()
