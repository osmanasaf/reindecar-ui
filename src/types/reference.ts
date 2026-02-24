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
