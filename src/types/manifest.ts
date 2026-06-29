import type { FileRecord } from '@/api/files.api'

export type UetdsManifestSource = 'MANUAL' | 'UPLOAD'

export interface UetdsManifest {
    id: number
    rentalId: number
    rentalNumber: string
    vehicleId: number
    vehiclePlate: string
    uetdsTripNumber: string
    tripStartAt: string
    tripEndAt?: string
    documentNumber?: string
    driverName?: string
    driverSrc?: string
    carrierCompanyName?: string
    groupName?: string
    groupRoute?: string
    groupDescription?: string
    groupFeeAmount?: number
    passengerCount?: number
    source: UetdsManifestSource
    pdfFile?: FileRecord
    createdBy?: string
    createdAt: string
}

export interface UetdsPassenger {
    id: number
    manifestId: number
    seatNumber?: number
    fullName: string
    nationality?: string
    idNumber?: string
}

export interface CreateUetdsManifestRequest {
    rentalId: number
    uetdsTripNumber: string
    vehiclePlate: string
    tripStartAt: string
    tripEndAt?: string
    documentNumber?: string
    driverName?: string
    driverSrc?: string
    carrierCompanyName?: string
    groupName?: string
    groupRoute?: string
    groupDescription?: string
    groupFeeAmount?: number
    passengerCount?: number
}

export interface UpdateUetdsManifestRequest {
    uetdsTripNumber?: string
    tripStartAt?: string
    tripEndAt?: string
    documentNumber?: string
    driverName?: string
    driverSrc?: string
    carrierCompanyName?: string
    groupName?: string
    groupRoute?: string
    groupDescription?: string
    groupFeeAmount?: number
    passengerCount?: number
}

export interface CreateUetdsPassengerRequest {
    seatNumber?: number
    fullName: string
    nationality?: string
    idNumber?: string
}

export interface ParsedUetdsManifestData {
    uetdsTripNumber?: string
    vehiclePlate?: string
    tripStartAt?: string
    tripEndAt?: string
    documentNumber?: string
    driverName?: string
    driverSrc?: string
    carrierCompanyName?: string
    groupName?: string
    groupRoute?: string
    groupDescription?: string
    groupFeeAmount?: number
    passengerCount?: number
}

export interface UetdsManifestPreviewResponse {
    parsed: ParsedUetdsManifestData
    plateMatches: boolean
    rentalVehiclePlate: string
    parsedVehiclePlate: string
}
