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
    InvoiceStatus,
    KmRecordSource,
    DiscountType,
    CalculationType
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
    weeklyPrice: number | null
    monthlyPrice: number | null
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
    vehicle?: Vehicle
    vehiclePlate?: string
    vehicleName?: string
    customerId: number
    customer?: Customer
    customerName?: string
    driverId?: number
    driver?: Customer
    branchId: number
    branch?: Branch
    branchName?: string
    returnBranchId: number
    returnBranch?: Branch
    returnBranchName?: string
    startDate: string
    endDate: string
    actualReturnDate?: string
    totalDays: number
    startKm: number
    endKm: number
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

// Pricing Entities
export interface CategoryPricing {
    id: number
    categoryId: number
    categoryName: string
    dailyPrice: number
    weeklyPrice: number
    monthlyPrice: number
    yearlyPrice: number
    currency: string
    validFrom: string | null
    validTo: string | null
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface VehiclePricing {
    id: number
    vehicleId: number
    vehicleName: string
    categoryId: number
    categoryName: string
    dailyPrice: number | null
    weeklyPrice: number | null
    monthlyPrice: number | null
    yearlyPrice: number | null
    currency: string
    validFrom: string | null
    validTo: string | null
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface TermDiscount {
    id: number
    categoryId: number | null
    categoryName: string | null
    termMonths: number
    discountType: DiscountType
    discountValue: number
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface ExtraItemType {
    id: number
    code: string
    name: string
    description: string | null
    defaultAmount: number | null
    currency: string
    calculationType: CalculationType
    sortOrder: number
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface RentalExtraItem {
    id: number
    rentalId: number
    itemTypeId: number | null
    name: string
    description: string | null
    amount: number
    currency: string
    calculationType: CalculationType
    calculatedTotal: number | null
    createdAt: string
}

export interface PriceBreakdownItem {
    description: string
    amount: number
}

export interface KmPackageResponse {
    id: number
    name: string
    includedKm: number
    extraKmPrice: number
    unlimited: boolean
}

export interface KmPackage {
    id: number
    name: string
    includedKm: number
    extraKmPrice: number
    currency: string
    applicableTypes: RentalType[]
    unlimited: boolean
    active: boolean
    categoryId: number | null
    categoryName: string | null
    global: boolean
}

export interface RentalDriver {
    id: number
    rentalId: number
    driverId: number
    driverName: string
    licenseNumber: string
    primary: boolean
    addedAt: string
}
