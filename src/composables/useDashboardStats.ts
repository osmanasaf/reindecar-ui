import { ref, readonly } from 'vue'
import { dashboardApi, rentalsApi } from '@/api'
import type { AccountingStats, DashboardStats, RevenueData, UpcomingReturn, VehicleStatusData } from '@/api'
import type { Rental } from '@/types'

export function useDashboardStats() {
    const stats = ref<DashboardStats | null>(null)
    const revenue = ref<RevenueData | null>(null)
    const vehicleStatus = ref<VehicleStatusData | null>(null)
    const upcomingReturns = ref<UpcomingReturn[]>([])
    const accounting = ref<AccountingStats | null>(null)
    const activeRentals = ref<Rental[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchAll(revenueMonths = 6, upcomingDays = 7): Promise<void> {
        loading.value = true
        error.value = null

        try {
            const [response, activePage] = await Promise.all([
                dashboardApi.getAll(revenueMonths, upcomingDays),
                rentalsApi.getActive({ size: 500 }).catch(() => ({ content: [] as Rental[], totalElements: 0 }))
            ])

            stats.value = response.stats
            revenue.value = response.revenue
            vehicleStatus.value = response.vehicleStatus
            upcomingReturns.value = response.upcomingReturns
            accounting.value = response.accounting
            activeRentals.value = activePage.content ?? []
        } catch {
            error.value = 'Dashboard verileri yüklenemedi'
        } finally {
            loading.value = false
        }
    }

    async function fetchRevenue(months = 6): Promise<void> {
        try {
            revenue.value = await dashboardApi.getRevenue(months)
        } catch {
            revenue.value = null
        }
    }

    async function fetchUpcomingReturns(days = 7): Promise<void> {
        try {
            upcomingReturns.value = await dashboardApi.getUpcomingReturns(days)
        } catch {
            upcomingReturns.value = []
        }
    }

    function refresh(): Promise<void> {
        return fetchAll()
    }

    return {
        stats: readonly(stats),
        revenue: readonly(revenue),
        vehicleStatus: readonly(vehicleStatus),
        upcomingReturns: readonly(upcomingReturns),
        accounting: readonly(accounting),
        activeRentals: readonly(activeRentals),
        loading: readonly(loading),
        error: readonly(error),
        fetchAll,
        fetchRevenue,
        fetchUpcomingReturns,
        refresh
    }
}

export default useDashboardStats
