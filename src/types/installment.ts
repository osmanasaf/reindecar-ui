import type { InstallmentPaymentStatus } from './enums'

export interface CreateVehicleInstallmentRequest {
    totalAmount: number
    monthlyPayment: number
    numberOfInstallments: number
    startDate: string
    notes?: string
}

export interface InstallmentPaymentResponse {
    id: number
    installmentId: number
    installmentNumber: number
    dueDate: string
    amount: number
    currency: string
    status: InstallmentPaymentStatus
    paidDate: string | null
    isOverdue: boolean
}

export interface VehicleInstallmentResponse {
    id: number
    vehicleId: number
    totalAmount: number
    totalCurrency: string
    monthlyPayment: number
    monthlyPaymentCurrency: string
    numberOfInstallments: number
    startDate: string
    endDate: string
    notes: string | null
    payments: InstallmentPaymentResponse[]
    remainingInstallments: number
    outstandingBalance: number
    outstandingCurrency: string
    nextPaymentDueDate: string
}

export interface PaymentDashboardResponse {
    totalMonthlyObligations: number
    currency: string
    upcomingPayments: InstallmentPaymentResponse[]
    overduePaymentsCount: number
    totalOutstandingBalance: number
    outstandingCurrency: string
    vehiclesWithInstallments: number
}

export interface VehiclePaymentDetailsResponse {
    vehicleId: number
    installment: VehicleInstallmentResponse | null
    payments: InstallmentPaymentResponse[] | null
    remainingInstallments: number
    outstandingBalance: number | null
    outstandingCurrency: string | null
    nextPaymentDueDate: string | null
    hasInstallment: boolean
}
