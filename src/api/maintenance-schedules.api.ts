import { BaseApi } from './client'
import type {
    MaintenanceSchedule,
    UpcomingMaintenance,
    CreateMaintenanceScheduleForm,
    UpdateMaintenanceScheduleForm,
    MaintenanceType,
} from '@/types'

const SCHEDULES_PATH = '/maintenance-schedules'
const VEHICLES_PATH = '/vehicles'

export interface UpcomingMaintenanceParams {
    days?: number
    types?: MaintenanceType[]
}

class MaintenanceSchedulesApiService extends BaseApi {
    protected readonly basePath = ''

    async getUpcoming(params?: UpcomingMaintenanceParams): Promise<UpcomingMaintenance[]> {
        const query = new URLSearchParams()
        if (params?.days != null) query.set('days', String(params.days))
        for (const type of params?.types ?? []) query.append('types', type)
        const suffix = query.toString()
        return this.get(suffix ? `${SCHEDULES_PATH}/upcoming?${suffix}` : `${SCHEDULES_PATH}/upcoming`)
    }

    async getByVehicle(vehicleId: number): Promise<MaintenanceSchedule[]> {
        return this.get(`${VEHICLES_PATH}/${vehicleId}${SCHEDULES_PATH}`)
    }

    async createForVehicle(vehicleId: number, form: CreateMaintenanceScheduleForm): Promise<MaintenanceSchedule> {
        return this.post(`${VEHICLES_PATH}/${vehicleId}${SCHEDULES_PATH}`, form)
    }

    async update(id: number, form: UpdateMaintenanceScheduleForm): Promise<MaintenanceSchedule> {
        return this.put(`${SCHEDULES_PATH}/${id}`, form)
    }

    async complete(id: number, completedAtKm: number): Promise<void> {
        await this.post(`${SCHEDULES_PATH}/${id}/complete?completedAtKm=${completedAtKm}`)
    }

    async cancel(id: number): Promise<void> {
        return this.deleteByPath(`${SCHEDULES_PATH}/${id}`)
    }
}

export const maintenanceSchedulesApi = new MaintenanceSchedulesApiService()
