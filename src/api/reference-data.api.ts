import { BaseApi } from './client'
import type {
    CarBrand,
    CarModel,
    City,
    District,
    VehicleColor,
    CreateBrandRequest,
    UpdateBrandRequest,
    CreateModelRequest,
    UpdateModelRequest,
    CreateCityRequest,
    UpdateCityRequest,
    CreateDistrictRequest,
    UpdateDistrictRequest,
    CreateColorRequest,
    UpdateColorRequest
} from '@/types/reference'

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

    async createBrand(data: CreateBrandRequest): Promise<CarBrand> {
        return this.post<CarBrand>('/brands', data)
    }

    async updateBrand(id: number, data: UpdateBrandRequest): Promise<CarBrand> {
        return this.put<CarBrand>(`/brands/${id}`, data)
    }

    async deactivateBrand(id: number): Promise<void> {
        await this.remove(`/brands/${id}`)
    }

    async createModel(data: CreateModelRequest): Promise<CarModel> {
        return this.post<CarModel>('/models', data)
    }

    async updateModel(id: number, data: UpdateModelRequest): Promise<CarModel> {
        return this.put<CarModel>(`/models/${id}`, data)
    }

    async deactivateModel(id: number): Promise<void> {
        await this.remove(`/models/${id}`)
    }

    async createCity(data: CreateCityRequest): Promise<City> {
        return this.post<City>('/cities', data)
    }

    async updateCity(id: number, data: UpdateCityRequest): Promise<City> {
        return this.put<City>(`/cities/${id}`, data)
    }

    async deactivateCity(id: number): Promise<void> {
        await this.remove(`/cities/${id}`)
    }

    async createDistrict(data: CreateDistrictRequest): Promise<District> {
        return this.post<District>('/districts', data)
    }

    async updateDistrict(id: number, data: UpdateDistrictRequest): Promise<District> {
        return this.put<District>(`/districts/${id}`, data)
    }

    async deactivateDistrict(id: number): Promise<void> {
        await this.remove(`/districts/${id}`)
    }

    async createColor(data: CreateColorRequest): Promise<VehicleColor> {
        return this.post<VehicleColor>('/colors', data)
    }

    async updateColor(id: number, data: UpdateColorRequest): Promise<VehicleColor> {
        return this.put<VehicleColor>(`/colors/${id}`, data)
    }

    async deactivateColor(id: number): Promise<void> {
        await this.remove(`/colors/${id}`)
    }
}

export const referenceDataApi = new ReferenceDataApiService()
