import type { RentalType, FuelLevel, PaymentMethod, KmRecordSource } from './enums'

// Auth Forms
export interface LoginForm {
    username: string
    password: string
    remember?: boolean
}

// Customer Forms
export interface CreatePersonalCustomerForm {
    nationalId: string
    firstName: string
    lastName: string
    birthDate: string
    phone: string
    email: string
    address: string
    city: string
    licenseNumber: string
    licenseClass: string
    licenseExpiryDate: string
    creditScore?: number
}

export interface CreateCompanyCustomerForm {
    taxNumber: string
    companyName: string
    tradeRegistryNumber: string
    phone: string
    email: string
    address: string
    city: string
    authorizedPersonName: string
    authorizedPersonPhone: string
}

// Vehicle Forms
export interface CreateVehicleForm {
    plateNumber: string
    vinNumber: string
    brand: string
    model: string
    year: number
    color: string
    fuelType: string
    transmission: string
    engineCapacity: number
    seatCount: number
    categoryId: number
    branchId: number
    currentKm: number
    insuranceExpiryDate: string
    inspectionExpiryDate: string
    registrationDate: string
    dailyPrice: number
    notes?: string
}

export interface UpdateVehicleStatusForm {
    status: string
    notes?: string
}

export interface UpdateVehicleForm {
    plateNumber: string
    vinNumber: string
    brand: string
    model: string
    year: number
    color: string
    fuelType: string
    transmission: string
    engineCapacity: number
    seatCount: number
    categoryId: number
    branchId: number
    currentKm: number
    insuranceExpiryDate: string
    inspectionExpiryDate: string
    dailyPrice: number
    notes?: string
}

// Rental Forms
export interface CreateRentalForm {
    rentalType: RentalType
    vehicleId: number
    customerId: number
    customerType: string
    contractSignerId?: number
    contractSignerName?: string
    driverIds: number[]
    primaryDriverId: number
    branchId: number
    returnBranchId: number
    startDate: string
    endDate: string
    kmPackageId?: number
    discountAmount?: number
    notes?: string
}

export interface VehicleDeliveryForm {
    startKm: number
    fuelLevel: FuelLevel
    notes?: string
}

export interface VehicleReturnForm {
    endKm: number
    fuelLevel: FuelLevel
    damageNotes?: string
    extraCharges?: number
}

// Payment Forms
export interface RecordPaymentForm {
    amount: number
    currency: string
    method: PaymentMethod
    transactionRef?: string
    invoiceRef?: string
}

// Branch Forms
export interface CreateBranchForm {
    code: string
    name: string
    address: string
    city: string
    district: string
    phone: string
    email: string
    latitude?: number
    longitude?: number
}

// Campaign Forms
export interface CreateCampaignForm {
    name: string
    description?: string
    discountType: string
    discountValue: number
    startDate: string
    endDate: string
    categoryIds: number[]
}

// User Forms
export interface CreateUserForm {
    username: string
    email: string
    fullName: string
    password: string
    role: string
    branchId: number
}

export interface ChangePasswordForm {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

// Leasing Forms
export interface RecordKmForm {
    currentKm: number
    recordDate: string
    source: KmRecordSource
    notes?: string
}

// Price Calculation
export interface CalculatePriceForm {
    vehicleId: number
    rentalType: RentalType
    startDate: string
    endDate: string
    kmPackageId?: number
    campaignCode?: string
}
