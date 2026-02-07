import { PaymentMethod } from './enums'

export enum ReceivableType {
  RENTAL_FEE = 'RENTAL_FEE',
  EXTRA_KM_FEE = 'EXTRA_KM_FEE',
  LATE_RETURN_FEE = 'LATE_RETURN_FEE',
  DAMAGE_FEE = 'DAMAGE_FEE',
  INSURANCE_CLAIM = 'INSURANCE_CLAIM',
  TRAFFIC_PENALTY = 'TRAFFIC_PENALTY',
  OTHER = 'OTHER'
}

export enum ReceivableStatus {
  PENDING = 'PENDING',
  PARTIAL_PAID = 'PARTIAL_PAID',
  FULLY_PAID = 'FULLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  WRITTEN_OFF = 'WRITTEN_OFF'
}

export enum PayableType {
  REPAIR_COST = 'REPAIR_COST',
  MAINTENANCE_COST = 'MAINTENANCE_COST',
  PARTS_COST = 'PARTS_COST',
  SUPPLIER_COST = 'SUPPLIER_COST',
  OTHER = 'OTHER'
}

export enum PayableStatus {
  PENDING = 'PENDING',
  PARTIAL_PAID = 'PARTIAL_PAID',
  FULLY_PAID = 'FULLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export enum InsuranceType {
  KASKO = 'KASKO',
  TRAFFIC = 'TRAFFIC',
  THIRD_PARTY = 'THIRD_PARTY',
  OCCUPANT = 'OCCUPANT',
  OTHER = 'OTHER'
}

export enum ClaimType {
  ACCIDENT = 'ACCIDENT',
  THEFT = 'THEFT',
  NATURAL_DISASTER = 'NATURAL_DISASTER',
  VANDALISM = 'VANDALISM',
  GLASS_DAMAGE = 'GLASS_DAMAGE',
  OTHER = 'OTHER'
}

export enum ClaimStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PARTIAL_PAID = 'PARTIAL_PAID',
  FULLY_PAID = 'FULLY_PAID'
}

export enum ServiceType {
  REPAIR = 'REPAIR',
  PAINT = 'PAINT',
  BODY_WORK = 'BODY_WORK',
  TIRE = 'TIRE',
  OIL_CHANGE = 'OIL_CHANGE',
  ELECTRICAL = 'ELECTRICAL',
  GLASS = 'GLASS',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER'
}

export enum ProviderType {
  REPAIR_SHOP = 'REPAIR_SHOP',
  MAINTENANCE_CENTER = 'MAINTENANCE_CENTER',
  PARTS_SUPPLIER = 'PARTS_SUPPLIER',
  INSURANCE_COMPANY = 'INSURANCE_COMPANY',
  TOWING_SERVICE = 'TOWING_SERVICE',
  CLEANING_SERVICE = 'CLEANING_SERVICE',
  INSPECTION_CENTER = 'INSPECTION_CENTER',
  OTHER = 'OTHER'
}

export enum ClaimDocumentType {
  DAMAGE_PHOTO = 'DAMAGE_PHOTO',
  ACCIDENT_REPORT = 'ACCIDENT_REPORT',
  POLICE_REPORT = 'POLICE_REPORT',
  REPAIR_ESTIMATE = 'REPAIR_ESTIMATE',
  INVOICE = 'INVOICE',
  OTHER = 'OTHER'
}

export interface ReceivableResponse {
  id: number
  receivableNumber: string
  type: ReceivableType
  sourceType: string
  sourceId: number
  customerId: number
  customerName?: string
  description: string
  amount: number
  currency: string
  paidAmount: number
  remainingAmount: number
  dueDate: string
  status: ReceivableStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PayableResponse {
  id: number
  payableNumber: string
  type: PayableType
  sourceType: string
  sourceId: number
  serviceProviderId: number
  serviceProviderName?: string
  description: string
  amount: number
  currency: string
  paidAmount: number
  remainingAmount: number
  dueDate: string
  status: PayableStatus
  invoiceNumber?: string
  invoiceDate?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface InsuranceClaimResponse {
  id: number
  claimNumber: string
  vehicleInsuranceId: number
  damageReportId: number
  vehicleId: number
  vehiclePlate?: string
  claimType: ClaimType
  incidentDate: string
  description?: string
  claimedAmount: number
  approvedAmount: number
  paidAmount: number
  currency: string
  status: ClaimStatus
  submittedDate?: string
  approvedDate?: string
  rejectionReason?: string
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface VehicleInsuranceResponse {
  id: number
  vehicleId: number
  insuranceType: InsuranceType
  policyNumber: string | null
  company: string | null
  startDate: string
  endDate: string
  premium: number | null
  premiumCurrency: string | null
  coverage: number | null
  coverageCurrency: string | null
  contactPhone: string | null
  notes: string | null
  active: boolean
  isExpired: boolean
  isExpiringSoon: boolean
  isValid: boolean
  createdAt: string
}

export interface ClaimDocumentResponse {
  id: number
  claimId: number
  documentType: ClaimDocumentType
  fileName: string
  filePath: string
  uploadedAt: string
  uploadedBy: string
}

export interface ServiceProviderResponse {
  id: number
  code: string
  name: string
  type: ProviderType
  taxNumber?: string
  taxOffice?: string
  address?: string
  city?: string
  district?: string
  phone?: string
  email?: string
  contactPerson?: string
  contactPhone?: string
  serviceTypes: ServiceType[]
  active: boolean
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RecordPaymentRequest {
  amount: number
  paymentMethod: PaymentMethod
  transactionRef?: string
  notes?: string
}

export interface CreatePayableRequest {
  type: PayableType
  serviceProviderId: number
  description: string
  amount: number
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
}

export interface UpdatePayableRequest {
  description?: string
  amount?: number
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
}

export interface CreateClaimRequest {
  vehicleInsuranceId: number
  damageReportId: number
  vehicleId: number
  claimType: ClaimType
  incidentDate: string
  description?: string
  claimedAmount: number
  notes?: string
}

export interface CreateVehicleInsuranceRequest {
  vehicleId: number
  insuranceType: InsuranceType
  policyNumber?: string
  company?: string
  startDate: string
  endDate: string
  premium?: number
  coverage?: number
  contactPhone?: string
  notes?: string
}

export interface ApproveClaimRequest {
  approvedAmount: number
}

export interface RejectClaimRequest {
  reason: string
}

export interface CreateServiceProviderRequest {
  name: string
  type: ProviderType
  taxNumber?: string
  taxOffice?: string
  address?: string
  city?: string
  district?: string
  phone?: string
  email?: string
  contactPerson?: string
  contactPhone?: string
  serviceTypes?: ServiceType[]
  notes?: string
}

export interface UpdateServiceProviderRequest {
  name?: string
  type?: ProviderType
  taxNumber?: string
  taxOffice?: string
  address?: string
  city?: string
  district?: string
  phone?: string
  email?: string
  contactPerson?: string
  contactPhone?: string
  serviceTypes?: ServiceType[]
  notes?: string
}

export interface ReceivableFilters {
  customerId?: number
  status?: ReceivableStatus
  type?: ReceivableType
  overdue?: boolean
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
}

export interface PayableFilters {
  serviceProviderId?: number
  status?: PayableStatus
  type?: PayableType
  overdue?: boolean
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
}

export interface ClaimFilters {
  vehicleId?: number
  status?: ClaimStatus
  type?: ClaimType
  startDate?: string
  endDate?: string
}
