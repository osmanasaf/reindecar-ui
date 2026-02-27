export interface CarBrand {
    id: number
    name: string
    logoUrl: string | null
}

export interface CarModel {
    id: number
    brandId: number
    brandName: string
    name: string
}

export interface City {
    id: number
    name: string
    plateCode: string | null
}

export interface District {
    id: number
    cityId: number
    cityName: string
    name: string
}

export interface VehicleColor {
    id: number
    name: string
    hexCode: string | null
}

export interface CreateBrandRequest {
    name: string
    logoUrl?: string
    sortOrder?: number
}

export interface UpdateBrandRequest {
    name?: string
    logoUrl?: string
    sortOrder?: number
}

export interface CreateModelRequest {
    brandId: number
    name: string
    sortOrder?: number
}

export interface UpdateModelRequest {
    name?: string
    sortOrder?: number
}

export interface CreateCityRequest {
    name: string
    plateCode?: string
    sortOrder?: number
}

export interface UpdateCityRequest {
    name?: string
    plateCode?: string
    sortOrder?: number
}

export interface CreateDistrictRequest {
    cityId: number
    name: string
    sortOrder?: number
}

export interface UpdateDistrictRequest {
    name?: string
    sortOrder?: number
}

export interface CreateColorRequest {
    name: string
    hexCode?: string
    sortOrder?: number
}

export interface UpdateColorRequest {
    name?: string
    hexCode?: string
    sortOrder?: number
}
