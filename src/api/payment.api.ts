import { BaseApi } from './client'
import type { Payment, PaymentMethod } from '@/types'

export interface RecordPaymentRequest {
    amount: number
    method: PaymentMethod
    transactionRef?: string
    invoiceRef?: string
    notes?: string
    discountAmount?: number
    discountReason?: string
}

class PaymentApiService extends BaseApi {
    protected readonly basePath = '/payments'

    async getByRentalId(rentalId: number): Promise<Payment[]> {
        return this.get(`/rental/${rentalId}`)
    }

    async recordPayment(rentalId: number, request: RecordPaymentRequest): Promise<Payment> {
        return this.post(`/rental/${rentalId}`, request)
    }
}

export const paymentApi = new PaymentApiService()
