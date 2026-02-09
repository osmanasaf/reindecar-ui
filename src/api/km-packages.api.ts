import { BaseApi } from './client'
import type { KmPackage, RentalType, CreateKmPackageForm, UpdateKmPackageForm } from '@/types'

class KmPackagesApiService extends BaseApi {
    protected readonly basePath = '/km-packages'

    async getAll(): Promise<KmPackage[]> {
        return this.get('')
    }

    async getActive(): Promise<KmPackage[]> {
        return this.get('/active')
    }

    async getByRentalType(rentalType: RentalType): Promise<KmPackage[]> {
        return this.get(`/by-rental-type/${rentalType}`)
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

    async update(id: number, form: UpdateKmPackageForm): Promise<KmPackage> {
        return this.put(`/${id}`, form)
    }

    async activate(id: number): Promise<void> {
        return this.post(`/${id}/activate`)
    }

    async deactivate(id: number): Promise<void> {
        return this.post(`/${id}/deactivate`)
    }
}

export const kmPackagesApi = new KmPackagesApiService()
