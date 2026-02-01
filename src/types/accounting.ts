import { PaymentMethod } from './enums'

// ==================== Enums ====================

// Alacak Türleri
export enum ReceivableType {
  RENTAL_FEE = 'RENTAL_FEE',
  EXTRA_KM_FEE = 'EXTRA_KM_FEE',
  LATE_RETURN_FEE = 'LATE_RETURN_FEE',
  DAMAGE_FEE = 'DAMAGE_FEE',
  INSURANCE_CLAIM = 'INSURANCE_CLAIM',
  OTHER = 'OTHER'
}

// Alacak Durumları
export enum ReceivableStatus {
  PENDING = 'PENDING',
  PARTIAL_PAID = 'PARTIAL_PAID',
  FULLY_PAID = 'FULLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  WRITTEN_OFF = 'WRITTEN_OFF'
}

// Verecek Türleri
export enum PayableType {
  REPAIR_COST = 'REPAIR_COST',
  MAINTENANCE_COST = 'MAINTENANCE_COST',
  PARTS_COST = 'PARTS_COST',
  SUPPLIER_COST = 'SUPPLIER_COST',
  OTHER = 'OTHER'
}

// Verecek Durumları
export enum PayableStatus {
  PENDING = 'PENDING',
  PARTIAL_PAID = 'PARTIAL_PAID',
  FULLY_PAID = 'FULLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

// Sigorta Başvuru Türleri
export enum ClaimType {
  ACCIDENT = 'ACCIDENT',
  THEFT = 'THEFT',
  NATURAL_DISASTER = 'NATURAL_DISASTER',
  VANDALISM = 'VANDALISM',
  GLASS_DAMAGE = 'GLASS_DAMAGE',
  OTHER = 'OTHER'
}

// Sigorta Başvuru Durumları
export enum ClaimStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PARTIAL_PAID = 'PARTIAL_PAID',
  FULLY_PAID = 'FULLY_PAID'
}

// Servis Türleri
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

// ==================== Interfaces ====================

// Alacak Response
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

// Verecek Response
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

// Sigorta Tazminat Başvurusu Response
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

// Servis Sağlayıcı Response
export interface ServiceProviderResponse {
  id: number
  code: string
  name: string
  taxNumber?: string
  taxOffice?: string
  address?: string
  phone?: string
  email?: string
  contactPerson?: string
  serviceTypes: ServiceType[]
  active: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

// ==================== Form Types ====================

// Ödeme Kaydetme Request
export interface RecordPaymentRequest {
  amount: number
  paymentMethod: PaymentMethod
  transactionRef?: string
  notes?: string
}

// Verecek Oluşturma Request
export interface CreatePayableRequest {
  type: PayableType
  serviceProviderId: number
  description: string
  amount: number
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
}

// Verecek Güncelleme Request
export interface UpdatePayableRequest {
  description?: string
  amount?: number
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
}

// Sigorta Başvurusu Oluşturma Request
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

// Sigorta Başvurusu Onaylama Request
export interface ApproveClaimRequest {
  approvedAmount: number
}

// Sigorta Başvurusu Reddetme Request
export interface RejectClaimRequest {
  reason: string
}

// Servis Sağlayıcı Oluşturma Request
export interface CreateServiceProviderRequest {
  code: string
  name: string
  taxNumber?: string
  taxOffice?: string
  address?: string
  phone?: string
  email?: string
  contactPerson?: string
  serviceTypes: ServiceType[]
  notes?: string
}

// Servis Sağlayıcı Güncelleme Request
export interface UpdateServiceProviderRequest {
  name?: string
  taxNumber?: string
  taxOffice?: string
  address?: string
  phone?: string
  email?: string
  contactPerson?: string
  serviceTypes?: ServiceType[]
  notes?: string
  active?: boolean
}

// ==================== Filter Types ====================

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
