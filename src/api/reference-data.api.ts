import { BaseApi } from './client'
import type {
    CarBrand,
    CarModel,
    City,
    District,
    VehicleColor,
    LicenseClass,
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

    async getBrandsAll(): Promise<CarBrand[]> {
        return this.get<CarBrand[]>('/brands/all')
    }

    async getModelsByBrand(brandId: number): Promise<CarModel[]> {
        return this.get<CarModel[]>(`/brands/${brandId}/models`)
    }

    async getModelsByBrandAll(brandId: number): Promise<CarModel[]> {
        return this.get<CarModel[]>(`/brands/${brandId}/models/all`)
    }

    async getCities(): Promise<City[]> {
        return this.get<City[]>('/cities')
    }

    async getCitiesAll(): Promise<City[]> {
        return this.get<City[]>('/cities/all')
    }

    async getDistrictsByCity(cityId: number): Promise<District[]> {
        return this.get<District[]>(`/cities/${cityId}/districts`)
    }

    async getDistrictsByCityAll(cityId: number): Promise<District[]> {
        return this.get<District[]>(`/cities/${cityId}/districts/all`)
    }

    async getColors(): Promise<VehicleColor[]> {
        return this.get<VehicleColor[]>('/colors')
    }

    async getColorsAll(): Promise<VehicleColor[]> {
        return this.get<VehicleColor[]>('/colors/all')
    }

    async activateCity(id: number): Promise<void> {
        await this.patch(`/cities/${id}/activate`)
    }

    async activateDistrict(id: number): Promise<void> {
        await this.patch(`/districts/${id}/activate`)
    }

    async activateColor(id: number): Promise<void> {
        await this.patch(`/colors/${id}/activate`)
    }

    async createBrand(data: CreateBrandRequest): Promise<CarBrand> {
        return this.post<CarBrand>('/brands', data)
    }

    async updateBrand(id: number, data: UpdateBrandRequest): Promise<CarBrand> {
        return this.put<CarBrand>(`/brands/${id}`, data)
    }

    async deactivateBrand(id: number): Promise<void> {
        await this.patch(`/brands/${id}/deactivate`)
    }

    async activateBrand(id: number): Promise<void> {
        await this.patch(`/brands/${id}/activate`)
    }

    async createModel(data: CreateModelRequest): Promise<CarModel> {
        return this.post<CarModel>('/models', data)
    }

    async updateModel(id: number, data: UpdateModelRequest): Promise<CarModel> {
        return this.put<CarModel>(`/models/${id}`, data)
    }

    async deactivateModel(id: number): Promise<void> {
        await this.patch(`/models/${id}/deactivate`)
    }

    async activateModel(id: number): Promise<void> {
        await this.patch(`/models/${id}/activate`)
    }

    async createCity(data: CreateCityRequest): Promise<City> {
        return this.post<City>('/cities', data)
    }

    async updateCity(id: number, data: UpdateCityRequest): Promise<City> {
        return this.put<City>(`/cities/${id}`, data)
    }

    async deactivateCity(id: number): Promise<void> {
        await this.patch(`/cities/${id}/deactivate`)
    }

    async createDistrict(data: CreateDistrictRequest): Promise<District> {
        return this.post<District>('/districts', data)
    }

    async updateDistrict(id: number, data: UpdateDistrictRequest): Promise<District> {
        return this.put<District>(`/districts/${id}`, data)
    }

    async deactivateDistrict(id: number): Promise<void> {
        await this.patch(`/districts/${id}/deactivate`)
    }

    async createColor(data: CreateColorRequest): Promise<VehicleColor> {
        return this.post<VehicleColor>('/colors', data)
    }

    async updateColor(id: number, data: UpdateColorRequest): Promise<VehicleColor> {
        return this.put<VehicleColor>(`/colors/${id}`, data)
    }

    async deactivateColor(id: number): Promise<void> {
        await this.patch(`/colors/${id}/deactivate`)
    }

    async getLicenseClasses(): Promise<LicenseClass[]> {
        return this.get<LicenseClass[]>('/license-classes')
    }

    async getLicenseClassesAll(): Promise<LicenseClass[]> {
        return this.get<LicenseClass[]>('/license-classes/all')
    }

    async activateLicenseClass(id: number): Promise<void> {
        await this.patch(`/license-classes/${id}/activate`)
    }

    async deactivateLicenseClass(id: number): Promise<void> {
        await this.patch(`/license-classes/${id}/deactivate`)
    }
}

export const referenceDataApi = new ReferenceDataApiService()
