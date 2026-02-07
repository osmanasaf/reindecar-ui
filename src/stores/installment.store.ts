import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { installmentsApi } from '@/api'
import { useToast } from '@/composables'
import type {
    VehicleInstallmentResponse,
    PaymentDashboardResponse,
    VehiclePaymentDetailsResponse,
    CreateVehicleInstallmentRequest,
    InstallmentPaymentResponse
} from '@/types'

export const useInstallmentStore = defineStore('installment', () => {
    const dashboard = ref<PaymentDashboardResponse | null>(null)
    const vehicleDetailsCache = ref<Map<number, VehiclePaymentDetailsResponse>>(new Map())
    const loading = ref(false)
    const error = ref<string | null>(null)

    const toast = useToast()

    const totalMonthlyObligations = computed(() => dashboard.value?.totalMonthlyObligations ?? 0)
    const overduePaymentsCount = computed(() => dashboard.value?.overduePaymentsCount ?? 0)
    const totalOutstandingBalance = computed(() => dashboard.value?.totalOutstandingBalance ?? 0)
    const vehiclesWithInstallments = computed(() => dashboard.value?.vehiclesWithInstallments ?? 0)
    const upcomingPayments = computed(() => dashboard.value?.upcomingPayments ?? [])

    async function fetchDashboard(): Promise<void> {
        loading.value = true
        error.value = null
        try {
            dashboard.value = await installmentsApi.getDashboard()
        } catch (err: any) {
            error.value = err.message || 'Dashboard yüklenemedi'
            toast.apiError(err, 'Dashboard yüklenemedi')
        } finally {
            loading.value = false
        }
    }

    async function fetchVehicleDetails(vehicleId: number, forceRefresh = false): Promise<VehiclePaymentDetailsResponse | null> {
        if (!forceRefresh && vehicleDetailsCache.value.has(vehicleId)) {
            return vehicleDetailsCache.value.get(vehicleId) ?? null
        }

        loading.value = true
        error.value = null
        try {
            const details = await installmentsApi.getVehicleDetails(vehicleId)
            vehicleDetailsCache.value.set(vehicleId, details)
            return details
        } catch (err: any) {
            error.value = err.message || 'Araç detayları yüklenemedi'
            toast.apiError(err, 'Araç detayları yüklenemedi')
            return null
        } finally {
            loading.value = false
        }
    }

    async function createInstallment(
        vehicleId: number,
        data: CreateVehicleInstallmentRequest
    ): Promise<VehicleInstallmentResponse | null> {
        loading.value = true
        error.value = null
        try {
            const installment = await installmentsApi.createInstallment(vehicleId, data)
            toast.success('Taksit planı başarıyla oluşturuldu')

            vehicleDetailsCache.delete(vehicleId)
            await fetchDashboard()

            return installment
        } catch (err: any) {
            error.value = err.message || 'Taksit planı oluşturulamadı'
            toast.apiError(err, 'Taksit planı oluşturulamadı')
            return null
        } finally {
            loading.value = false
        }
    }

    async function recordPayment(
        installmentId: number,
        paymentId: number,
        vehicleId?: number
    ): Promise<InstallmentPaymentResponse | null> {
        loading.value = true
        error.value = null
        try {
            const payment = await installmentsApi.recordPayment(installmentId, paymentId)
            toast.success('Ödeme başarıyla kaydedildi')

            if (vehicleId) {
                vehicleDetailsCache.delete(vehicleId)
            }
            await fetchDashboard()

            return payment
        } catch (err: any) {
            error.value = err.message || 'Ödeme kaydedilemedi'
            toast.apiError(err, 'Ödeme kaydedilemedi')
            return null
        } finally {
            loading.value = false
        }
    }

    async function deleteInstallment(id: number, vehicleId?: number): Promise<boolean> {
        loading.value = true
        error.value = null
        try {
            await installmentsApi.deleteInstallment(id)
            toast.success('Taksit planı başarıyla silindi')

            if (vehicleId) {
                vehicleDetailsCache.delete(vehicleId)
            }
            await fetchDashboard()

            return true
        } catch (err: any) {
            error.value = err.message || 'Taksit planı silinemedi'
            toast.apiError(err, 'Taksit planı silinemedi')
            return false
        } finally {
            loading.value = false
        }
    }

    function clearCache(): void {
        vehicleDetailsCache.value.clear()
        dashboard.value = null
    }

    return {
        dashboard,
        loading,
        error,
        totalMonthlyObligations,
        overduePaymentsCount,
        totalOutstandingBalance,
        vehiclesWithInstallments,
        upcomingPayments,
        fetchDashboard,
        fetchVehicleDetails,
        createInstallment,
        recordPayment,
        deleteInstallment,
        clearCache
    }
})
