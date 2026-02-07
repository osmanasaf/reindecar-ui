import type { ViolationType, PenaltyStatus, PenaltySource } from './enums'

export interface PenaltyResponse {
  id: number
  penaltyNumber: string
  rentalId: number
  vehicleId: number
  customerId: number
  driverId: number | null
  plateNumber: string | null
  violationType: ViolationType
  violationDate: string
  notificationDate: string | null
  dueDate: string | null
  violationLocation: string | null
  penaltyAmount: number
  currency: string
  status: PenaltyStatus
  ticketNumber: string | null
  source: PenaltySource
  externalReferenceId: string | null
  receivableId: number | null
  description: string | null
  notes: string | null
  isOverdue: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreatePenaltyRequest {
  rentalId: number
  vehicleId: number
  customerId: number
  driverId?: number
  violationType: ViolationType
  violationDate: string
  violationLocation?: string
  penaltyAmount: number
  dueDate?: string
  ticketNumber?: string
  description?: string
  notes?: string
}

export interface UpdatePenaltyRequest {
  violationType?: ViolationType
  violationDate?: string
  violationLocation?: string
  penaltyAmount?: number
  dueDate?: string
  ticketNumber?: string
  description?: string
  notes?: string
}

export interface PenaltySearchCriteria {
  rentalId?: number
  vehicleId?: number
  customerId?: number
  status?: PenaltyStatus
  violationType?: ViolationType
  startDate?: string
  endDate?: string
}

export interface PenaltyImportItem {
  rentalId: number
  vehicleId: number
  customerId: number
  driverId?: number
  violationType: ViolationType
  violationDate: string
  violationLocation?: string
  penaltyAmount: number
  dueDate?: string
  ticketNumber?: string
  externalReferenceId?: string
  description?: string
  notes?: string
}

export interface ImportPenaltyRequest {
  penalties: PenaltyImportItem[]
}
