import { BaseApi } from './client'
import type { CarBrand, CarModel, City, District, VehicleColor } from '@/types/reference'

class ReferenceDataApiService extends BaseApi {
    protected readonly basePath = '/reference-data'

    async getBrands(): Promise<CarBrand[]> {
        return this.get<CarBrand[]>('/brands')
    }

    async getModelsByBrand(brandId: number): Promise<CarModel[]> {
        return this.get<CarModel[]>(`/brands/${brandId}/models`)
    }

    async getCities(): Promise<City[]> {
        return this.get<City[]>('/cities')
    }

    async getDistrictsByCity(cityId: number): Promise<District[]> {
        return this.get<District[]>(`/cities/${cityId}/districts`)
    }

    async getColors(): Promise<VehicleColor[]> {
        return this.get<VehicleColor[]>('/colors')
    }
}

export const referenceDataApi = new ReferenceDataApiService()
