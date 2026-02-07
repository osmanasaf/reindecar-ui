import type { RentalType, PaymentMethod, KmRecordSource, DiscountType, CalculationType, CustomerType, DamageType, DamageLocation, DamageSeverity, MaintenanceType } from './enums'


export interface LoginForm {
    username: string
    password: string
    remember?: boolean
}


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

export interface AuthorizedPerson {
    firstName: string
    lastName: string
    nationalId: string
    phone: string
    email?: string
    title?: string
}

export interface CreateCompanyCustomerForm {
    taxNumber: string
    companyName: string
    taxOffice: string
    tradeRegistryNumber: string
    phone: string
    email: string
    address: string
    city: string
    invoiceAddress: string
    authorizedPersons: AuthorizedPerson[]
}


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
    weeklyPrice?: number
    monthlyPrice?: number
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
    weeklyPrice?: number
    monthlyPrice?: number
    notes?: string
}


export interface CreateRentalForm {
    vehicleId: number
    customerId: number
    customerType: CustomerType
    branchId: number
    returnBranchId: number
    rentalType: RentalType
    startDate: string
    endDate: string
    termMonths?: number
    kmPackageId?: number
    customIncludedKm?: number
    customExtraKmPrice?: number
    driverIds?: number[]
    primaryDriverId?: number
    contractSignerId?: number
    contractSignerName?: string
    extraItems?: any[]
    notes?: string
}

export interface AddRentalDriverForm {
    driverId: number
    primary: boolean
}

export interface CreateDriverForm {
    nationalId: string
    firstName: string
    lastName: string
    licenseNumber: string
    licenseExpiryDate: string
    licenseClass?: string
    phone?: string
    customerId?: number
    primary?: boolean
}


export interface CreateDamageReportForm {
    vehicleId: number
    rentalId?: number
    reportDate: string
    damageType: DamageType
    location: DamageLocation
    severity: DamageSeverity
    description: string
    estimatedCostAmount?: number
    estimatedCostCurrency?: string
    reportedBy?: string
}

export interface MarkDamageRepairedForm {
    repairedDate: string
    repairCostAmount?: number
    repairCostCurrency?: string
}

export interface CreateMaintenanceRecordForm {
    vehicleId: number
    maintenanceType: MaintenanceType
    maintenanceDate: string
    currentKm: number
    costAmount?: number
    costCurrency?: string
    serviceProvider?: string
    description?: string
    affectedZones?: number[]
    partsReplaced?: string[]
    paintColor?: string
}

export interface CreateKmPackageForm {
    name: string
    includedKm: number
    extraKmPrice: number
    applicableTypes: RentalType[]
    unlimited?: boolean
    categoryId?: number
}

export interface VehicleDeliveryForm {
    startKm: number
}

export interface VehicleReturnForm {
    actualReturnDate: string
    endKm: number
    notes?: string
}


export interface RecordPaymentForm {
    amount: number
    currency: string
    method: PaymentMethod
    transactionRef?: string
    invoiceRef?: string
}


export interface CreateBranchForm {
    code: string
    branchCode?: string
    name: string
    address: string
    city: string
    district?: string
    phone: string
    email?: string
    latitude?: number
    longitude?: number
    active?: boolean
}


export interface CreateCampaignForm {
    name: string
    description?: string
    discountType: string
    discountValue: number
    startDate: string
    endDate: string
    categoryIds: number[]
}


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


export interface RecordKmForm {
    currentKm: number
    recordDate: string
    source: KmRecordSource
    notes?: string
}


export interface CalculatePriceForm {
    vehicleId: number
    rentalType: RentalType
    startDate: string
    endDate: string
    kmPackageId?: number
    campaignCode?: string
}


export interface CategoryPricingForm {
    categoryId: number | null
    dailyPrice: number | null
    weeklyPrice: number | null
    monthlyPrice: number | null
    yearlyPrice: number | null
    currency: string
    validFrom: string
    validTo: string
}

export interface TermDiscountForm {
    categoryId: number | null
    termMonths: number | null
    discountType: DiscountType
    discountValue: number | null
}

export interface ExtraItemTypeForm {
    code: string
    name: string
    description: string
    defaultAmount: number | null
    currency: string
    calculationType: CalculationType
    sortOrder: number
}

export interface RentalExtraItemForm {
    itemTypeId: number | null
    customName: string
    description: string
    amount: number | null
    currency: string
    calculationType: CalculationType
}
