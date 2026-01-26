import type {
    CustomerType,
    CustomerStatus,
    CreditRating,
    VehicleStatus,
    FuelType,
    Transmission,
    RentalStatus,
    RentalType,
    PaymentMethod,
    PaymentStatus,
    Role,
    NotificationPriority,
    FuelLevel,
    InvoiceStatus,
    KmRecordSource
} from './enums'

// User
export interface User {
    id: number
    username: string
    email: string
    fullName: string
    role: Role
    branchId: number
    branchName: string
    active: boolean
    createdAt: string
}

// Branch
export interface Branch {
    id: number
    code: string
    name: string
    address: string
    city: string
    district: string
    phone: string
    email: string
    latitude?: number
    longitude?: number
    active: boolean
    vehicleCount: number
    createdAt: string
}

// Vehicle Category
export interface VehicleCategory {
    id: number
    name: string
    description?: string
    dailyPrice: number
    active: boolean
}

// Vehicle
export interface Vehicle {
    id: number
    plateNumber: string
    vinNumber: string
    brand: string
    model: string
    year: number
    color: string
    fuelType: FuelType
    transmission: Transmission
    engineCapacity: number
    seatCount: number
    categoryId: number
    categoryName: string
    branchId: number
    branchName: string
    status: VehicleStatus
    currentKm: number
    insuranceExpiryDate: string
    inspectionExpiryDate: string
    registrationDate: string
    dailyPrice: number
    isInsuranceExpiringSoon: boolean
    isInspectionExpiringSoon: boolean
    notes?: string
    createdAt: string
}

// Customer - Personal Info
export interface PersonalInfo {
    nationalId: string
    firstName: string
    lastName: string
    birthDate: string
    licenseNumber: string
    licenseClass: string
    licenseExpiryDate: string
}

// Customer - Company Info
export interface CompanyInfo {
    taxNumber: string
    companyName: string
    tradeRegistryNumber: string
    authorizedPersonName: string
    authorizedPersonPhone: string
}

// Customer
export interface Customer {
    id: number
    publicId: string
    customerType: CustomerType
    status: CustomerStatus
    displayName: string
    phone: string
    email: string
    address: string
    city: string
    blacklisted: boolean
    blacklistReason?: string
    creditScore: number
    creditRating: CreditRating
    personalInfo?: PersonalInfo
    companyInfo?: CompanyInfo
    createdAt: string
}

// Rental
export interface Rental {
    id: number
    rentalNumber: string
    rentalType: RentalType
    status: RentalStatus
    vehicleId: number
    vehiclePlate?: string
    vehicleName?: string
    customerId: number
    customerName?: string
    driverId?: number
    branchId: number
    branchName?: string
    returnBranchId: number
    returnBranchName?: string
    startDate: string
    endDate: string
    actualReturnDate?: string
    totalDays: number
    startKm?: number
    endKm?: number
    totalKm: number
    kmPackageId?: number
    dailyPrice: number
    totalPrice: number
    discountAmount: number
    extraKmCharge: number
    grandTotal: number
    currency: string
    isOverdue: boolean
    overdueDays: number
    notes?: string
    createdAt: string
}

// Payment
export interface Payment {
    id: number
    rentalId: number
    amount: number
    currency: string
    method: PaymentMethod
    status: PaymentStatus
    transactionRef?: string
    invoiceRef?: string
    paidAt?: string
    createdBy: string
    createdAt: string
}

// Contract
export interface Contract {
    id: number
    rentalId: number
    contractNumber: string
    signedAt?: string
    signedBy?: string
    status: string
    createdAt: string
}

// Notification
export interface Notification {
    id: number
    userId: number
    title: string
    message: string
    type: string
    priority: NotificationPriority
    read: boolean
    dismissed: boolean
    createdAt: string
}

// Campaign
export interface Campaign {
    id: number
    name: string
    description?: string
    discountType: string
    discountValue: number
    startDate: string
    endDate: string
    active: boolean
    categoryIds: number[]
    createdAt: string
}

// Season
export interface Season {
    id: number
    name: string
    startDate: string
    endDate: string
    priceMultiplier: number
    active: boolean
}

// Leasing KM Record
export interface LeasingKmRecord {
    id: number
    rentalId: number
    currentKm: number
    recordDate: string
    source: KmRecordSource
    notes?: string
    createdAt: string
}

// Leasing KM Summary
export interface LeasingKmSummary {
    rentalId: number
    totalKmLimit: number
    usedKm: number
    remainingKm: number
    averageDailyKm: number
    projectedEndKm: number
}

// Leasing Invoice
export interface LeasingInvoice {
    id: number
    invoiceNumber: string
    rentalId: number
    customerId: number
    periodStart: string
    periodEnd: string
    baseAmount: number
    extraKmAmount: number
    totalAmount: number
    status: InvoiceStatus
    dueDate: string
    paidAt?: string
    createdAt: string
}

// Auth
export interface AuthTokens {
    accessToken: string
    refreshToken: string
    tokenType: string
    expiresIn: number
}
