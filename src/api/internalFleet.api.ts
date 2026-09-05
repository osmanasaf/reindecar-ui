import { BaseApi } from './client'

export type ScheduleStatus = 'SCHEDULED' | 'DUE' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'

export interface AssignmentRow {
    rentalId: number
    rentalNumber: string
    status: string
    driverId: number | null
    driverName: string | null
    driverPhone: string | null
    driverLicenseExpiryDate: string | null
    vehicleId: number
    plateNumber: string | null
    vehicleName: string | null
    vehicleCurrentKm: number | null
    branchId: number | null
    branchName: string | null
    assignedSince: string
    assignedDays: number
    openEnded: boolean
    maintenanceStatus: ScheduleStatus | null
    nextMaintenanceDate: string | null
    nextMaintenanceKm: number | null
    inspectionExpiryDate: string | null
    insuranceExpiryDate: string | null
    lastKmReadingDate: string | null
    openPenaltyCount: number
}

class InternalFleetApiService extends BaseApi {
    protected readonly basePath = '/internal-fleet'

    async listAssignments(): Promise<AssignmentRow[]> {
        return this.get<AssignmentRow[]>('/assignments')
    }
}

export const internalFleetApi = new InternalFleetApiService()
