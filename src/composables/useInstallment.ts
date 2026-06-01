import { computed } from 'vue'
import { useInstallmentStore } from '@/stores/installment.store'
import type {
    VehicleInstallmentResponse,
    VehiclePaymentDetailsResponse,
    CreateVehicleInstallmentRequest,
    InstallmentPaymentResponse
} from '@/types'

export function useInstallment(_vehicleId?: number) {
    const installmentStore = useInstallmentStore()

    const loading = computed(() => installmentStore.loading)
    const error = computed(() => installmentStore.error)
    const dashboard = computed(() => installmentStore.dashboard)

    async function createInstallment(
        vId: number,
        data: CreateVehicleInstallmentRequest
    ): Promise<VehicleInstallmentResponse | null> {
        return await installmentStore.createInstallment(vId, data)
    }

    async function recordPayment(
        installmentId: number,
        paymentId: number,
        vId?: number
    ): Promise<InstallmentPaymentResponse | null> {
        return await installmentStore.recordPayment(installmentId, paymentId, vId)
    }

    async function deleteInstallment(id: number, vId?: number): Promise<boolean> {
        return await installmentStore.deleteInstallment(id, vId)
    }

    async function fetchDashboard(): Promise<void> {
        await installmentStore.fetchDashboard()
    }

    async function fetchVehicleDetails(
        vId: number,
        forceRefresh = false
    ): Promise<VehiclePaymentDetailsResponse | null> {
        return await installmentStore.fetchVehicleDetails(vId, forceRefresh)
    }

    return {
        loading,
        error,
        dashboard,
        createInstallment,
        recordPayment,
        deleteInstallment,
        fetchDashboard,
        fetchVehicleDetails
    }
}
