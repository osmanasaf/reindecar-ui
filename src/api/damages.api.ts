import { BaseApi } from './client'
import type { 
    DamageReport, 
    VehicleDamageMap,
    CreateDamageReportForm, 
    MarkDamageRepairedForm 
} from '@/types'

class DamagesApiService extends BaseApi {
    protected readonly basePath = '/damages'

    async create(form: CreateDamageReportForm): Promise<DamageReport> {
        return this.post('', form)
    }

    async getById(id: number): Promise<DamageReport> {
        return this.get(`/${id}`)
    }

    async update(id: number, form: CreateDamageReportForm): Promise<DamageReport> {
        return this.put(`/${id}`, form)
    }

    async markRepaired(id: number, form: MarkDamageRepairedForm): Promise<DamageReport> {
        return this.patch(`/${id}/repair`, form)
    }

    async getVehicleDamages(vehicleId: number): Promise<DamageReport[]> {
        return this.get(`/vehicle/${vehicleId}`)
    }

    async getVehicleDamageMap(vehicleId: number): Promise<VehicleDamageMap> {
        return this.get(`/vehicle/${vehicleId}/map`)
    }

    async getRentalDamages(rentalId: number): Promise<DamageReport[]> {
        return this.get(`/rental/${rentalId}`)
    }
}

export const damagesApi = new DamagesApiService()
