import { BaseApi } from './client'
import type { Payment, PaymentMethod } from '@/types'

class PaymentApiService extends BaseApi {
    protected readonly basePath = '/payments'

    async getByRentalId(rentalId: number): Promise<Payment[]> {
        return this.get(`/rental/${rentalId}`)
    }

    async recordPayment(
        rentalId: number,
        amount: number,
        method: PaymentMethod,
        transactionRef?: string,
        invoiceRef?: string,
        notes?: string
    ): Promise<Payment> {
        return this.post(`/rental/${rentalId}`, {
            amount,
            method,
            transactionRef,
            invoiceRef,
            notes
        })
    }
}

export const paymentApi = new PaymentApiService()
