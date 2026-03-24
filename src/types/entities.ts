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
    CalculationType,
    DamageType,
    DamageLocation,
    DamageSeverity,
    MaintenanceType,
    TollType,
    TollStatus,
    TollSource
} from './enums'
import type { PenaltyResponse } from './penalties'


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


export interface Branch {
    id: number
    code: string
    branchCode?: string
    name: string
    address: string
    city: string
    district: string
    phone: string
    email: string
    latitude?: number
    longitude?: number
    active: boolean
    vehicleCount?: number
    createdAt: string
}


export interface VehicleCategory {
    id: number
    code: string
    name: string
    description?: string
    defaultDailyPrice?: number
    sortOrder: number
    active: boolean
}


export interface Vehicle {
    id: number
    plateNumber: string
    vinNumber: string
    brand: string
    model: string
    year: number
    color: string | null
    fuelType: FuelType
    transmission: Transmission
    engineCapacity: number
    seatCount: number
    categoryId: number
    categoryName: string | null
    category?: VehicleCategory
    branchId: number
    branchName: string | null
    branch?: Branch
    status: VehicleStatus
    currentKm: number
    insuranceExpiryDate: string | null
    inspectionExpiryDate: string | null
    registrationDate: string | null
    dailyPrice: number | null
    weeklyPrice: number | null
    monthlyPrice: number | null
    isInsuranceExpiringSoon: boolean
    isInspectionExpiringSoon: boolean
    notes: string | null
    imageUrl?: string | null
    createdAt: string
}

export type VehicleResponse = Vehicle


export interface PersonalInfo {
    nationalId: string
    firstName: string
    lastName: string
    birthDate: string
    licenseNumber: string
    licenseClass?: string
    licenseClassName?: string
    licenseClassId?: number
    licenseExpiryDate: string
}


export interface CompanyInfo {
    taxNumber: string
    companyName: string
    tradeRegisterNo?: string
    tradeRegistryNumber?: string
    taxOffice?: string
    invoiceAddress?: string
    sector?: string
    employeeCount?: number
    authorizedPerson?: string
    authorizedPersonPhone?: string
    authorizedPersonName?: string
}

export interface CompanyAuthorizedPerson {
    id: number
    customerId: number
    firstName: string
    lastName: string
    nationalId: string
    phone: string
    email: string | null
    title: string | null
    primary?: boolean
    isPrimary?: boolean
    active: boolean
    createdAt: string
    updatedAt: string
}


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
    nationalId?: string
    birthDate?: string
    licenseNumber?: string
    licenseClass?: string
    licenseExpiryDate?: string
    taxNumber?: string
    taxOffice?: string
    invoiceAddress?: string
    tradeRegisterNo?: string
    tradeRegistryNumber?: string
    sector?: string
    employeeCount?: number
    authorizedPerson?: string
    authorizedPersonName?: string
    authorizedPersonPhone?: string
    totalRentals?: number
    activeRentals?: number
    createdAt: string
}

export interface CustomerStats {
    totalCompletedRentals: number
    totalSpending: number
    hasActiveRental: boolean
}

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
    customIncludedKm?: number
    customExtraKmPrice?: number
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


export interface Contract {
    id: number
    rentalId: number
    contractNumber: string
    signedAt?: string
    signedBy?: string
    status: string
    createdAt: string
}


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


export interface Season {
    id: number
    name: string
    startDate: string
    endDate: string
    priceMultiplier: number
    active: boolean
}


export interface LeasingKmRecord {
    id: number
    rentalId: number
    currentKm: number
    recordDate: string
    source: KmRecordSource
    notes?: string
    createdAt: string
}


export interface LeasingKmSummary {
    rentalId: number
    totalKmLimit: number
    usedKm: number
    remainingKm: number
    averageDailyKm: number
    projectedEndKm: number
}


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


export interface AuthTokens {
    accessToken: string
    refreshToken: string
    tokenType: string
    expiresIn: number
}


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


export interface Driver {
    id: number
    nationalId: string
    firstName: string
    lastName: string
    fullName: string
    licenseNumber: string
    licenseExpiryDate: string
    licenseClass?: string
    licenseClassId?: number
    licenseClassName?: string
    phone?: string
    customerId?: number
    primary?: boolean
    active: boolean
    linkedToCustomer?: boolean
    createdAt: string
}


export interface DamageReport {
    id: number
    vehicleId: number
    vehiclePlate: string
    rentalId: number | null
    reportDate: string
    damageType: DamageType
    damageTypeDisplayName: string
    location: DamageLocation
    locationDisplayName: string
    zoneId: number
    severity: DamageSeverity
    severityDisplayName: string
    severityColorCode: string
    description: string
    estimatedCostAmount: number | null
    estimatedCostCurrency: string | null
    reportedBy: string | null
    repaired: boolean
    repairedDate: string | null
    repairCostAmount: number | null
    repairCostCurrency: string | null
    serviceProviderId: number | null
    serviceProviderName: string | null
    customerId: number | null
    customerName: string | null
    customerResponsible?: boolean
    attachments?: { id: number; fileName: string; viewUrl: string; downloadUrl: string; extension?: string; uploadType: string }[]
    createdAt: string
    updatedAt: string
}

export interface MaintenanceRecord {
    id: number
    vehicleId: number
    vehiclePlate: string
    maintenanceType: MaintenanceType
    maintenanceTypeDisplayName: string
    maintenanceTypeColorCode: string
    maintenanceDate: string
    currentKm: number
    costAmount: number | null
    costCurrency: string | null
    serviceProvider?: string | null
    serviceProviderName?: string | null
    description: string | null
    affectedZones?: number[]
    partsReplaced: string[]
    paintColor: string | null
    attachments?: { id: number; fileName: string; viewUrl: string; downloadUrl: string; extension?: string; uploadType: string }[]
    createdAt: string
    updatedAt: string
}

export interface ZoneDamageInfo {
    zoneId: number
    damageCount: number
    maxSeverity: DamageSeverity | null
    colorCode: string
    damageIds: number[]
}

export interface ZoneMaintenanceInfo {
    zoneId: number
    maintenanceCount: number
    lastMaintenanceType: MaintenanceType | null
    lastMaintenanceDate: string | null
    colorCode: string
    maintenanceIds: number[]
}

export interface VehicleDamageMap {
    vehicleId: number
    vehiclePlate: string
    totalActiveDamages: number
    totalDamages: number
    zones: Record<number, ZoneDamageInfo>
    damages: DamageReport[]
}

export interface VehicleMaintenanceMap {
    vehicleId: number
    vehiclePlate: string
    totalMaintenanceCount: number
    zones: Record<number, ZoneMaintenanceInfo>
    maintenances: MaintenanceRecord[]
}


export interface RentalHistoryItem {
    id: number
    rentalNumber: string
    rentalType: string
    rentalTypeDisplayName: string
    customerId: number
    customerName: string
    customerType: 'PERSONAL' | 'COMPANY'
    branchId: number
    branchName: string
    returnBranchId: number | null
    returnBranchName: string | null
    startDate: string
    endDate: string
    actualReturnDate: string | null
    status: string
    statusDisplayName: string
    plannedDays: number
    actualDays: number | null
    startKm: number | null
    endKm: number | null
    totalKm: number | null
    dailyPriceAmount: number
    totalPriceAmount: number
    discountAmount: number
    extraKmChargeAmount: number
    grandTotalAmount: number
    currency: string
    overdue: boolean
    overdueDays: number
    notes: string | null
    createdAt: string
}

export interface DamageHistoryItem {
    id: number
    reportDate: string
    damageType: string
    damageTypeDisplayName?: string
    location: string
    locationDisplayName?: string
    zoneId?: number
    severity: string
    severityDisplayName?: string
    description?: string
    estimatedCostAmount?: number | null
    estimatedCostCurrency?: string | null
    repaired: boolean
    repairedDate: string | null
    repairCostAmount?: number | null
    repairCostCurrency?: string | null
    attachmentCount?: number
    createdAt?: string
}

export interface MaintenanceHistoryItem {
    id: number
    maintenanceDate: string
    maintenanceType: string
    maintenanceTypeDisplayName?: string
    currentKm: number
    costAmount: number | null
    costCurrency?: string | null
    serviceProvider: string | null
    description?: string | null
    affectedZones?: number[]
    attachmentCount?: number
    createdAt?: string
}

export interface StatusChangeItem {
    id: number
    changedAt: string
    oldStatus: string
    newStatus: string
    changedBy: string | null
    reason: string | null
}

export interface VehicleHistory {
    vehicleId: number
    vehiclePlate: string
    vehicleName: string
    rentals: RentalHistoryItem[]
    maintenances: MaintenanceHistoryItem[]
    damages: DamageHistoryItem[]
    statusChanges: StatusChangeItem[]
}

export interface MoneyLike {
    amount: number
    currency: string
}

export interface PenaltySummaryItem {
    penaltyNumber: string
    violationType: string
    amount: MoneyLike
    status: string
    paid?: boolean
}

export interface DamageSummaryItem {
    description: string
    severity: string
    estimatedCost: MoneyLike
    repaired: boolean
}

export interface TollSummaryItem {
    tollNumber: string
    tollType: string
    passageLocation: string
    amount: MoneyLike
    status: string
}

export interface ReturnPreviewResponse {
    kmUsed: number
    kmOverage: number
    kmPenalty: MoneyLike
    lateDays: number
    lateFee: MoneyLike
    totalExtra: MoneyLike
    penalties: PenaltySummaryItem[]
    damages: DamageSummaryItem[]
    tolls?: TollSummaryItem[]
    penaltyTotal: MoneyLike
    damageTotal: MoneyLike
    tollTotal?: MoneyLike
    grandTotal: MoneyLike
}

export interface RentalPaymentSummaryResponse {
    totalPaid: number
    currency: string
}

/** Kiralama detay sayfası için tek istekte dönen toplu yanıt (backend GET /rentals/:id/detail) */
export interface RentalDetailResponse {
    rental: Rental
    vehicle: Vehicle | null
    customer: Customer | null
    branch: Branch | null
    returnBranch: Branch | null
    kmPackage: KmPackage | null
    drivers: RentalDriver[]
    paymentSummary: RentalPaymentSummaryResponse
    payments: Payment[]
    extraItems: RentalExtraItem[]
    penalties: PenaltyResponse[]
    damages: DamageReport[]
    tolls: TollRecord[]
}

export interface TollRecord {
    id: number
    tollNumber: string
    rentalId: number
    vehicleId: number
    customerId: number
    tollType: TollType
    tollTypeDisplayName: string
    passageDate: string
    passageLocation: string | null
    plateNumber: string
    tollAmount: number
    currency: string
    status: TollStatus
    source: TollSource
    externalReferenceId: string | null
    receivableId: number | null
    hgsTagNumber: string | null
    description: string | null
    createdBy: string
    createdAt: string
    updatedAt: string
}
