import { ref, readonly } from 'vue'
import { dashboardApi } from '@/api'
import type { DashboardStats, RevenueData, VehicleStatusData, UpcomingReturn } from '@/api'

export function useDashboardStats() {
    const stats = ref<DashboardStats | null>(null)
    const revenue = ref<RevenueData | null>(null)
    const vehicleStatus = ref<VehicleStatusData | null>(null)
    const upcomingReturns = ref<UpcomingReturn[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchAll() {
        loading.value = true
        error.value = null

        try {
            const response = await dashboardApi.getAll()
            stats.value = response.stats
            revenue.value = response.revenue
            vehicleStatus.value = response.vehicleStatus
            upcomingReturns.value = response.upcomingReturns
        } catch {
            error.value = 'Dashboard verileri yüklenemedi'
        } finally {
            loading.value = false
        }
    }

    async function fetchStats() {
        try {
            stats.value = await dashboardApi.getStats()
        } catch {
            stats.value = null
        }
    }

    async function fetchRevenue(months = 6) {
        try {
            revenue.value = await dashboardApi.getRevenue(months)
        } catch {
            revenue.value = null
        }
    }

    async function fetchVehicleStatus() {
        try {
            vehicleStatus.value = await dashboardApi.getVehicleStatus()
        } catch {
            vehicleStatus.value = null
        }
    }

    async function fetchUpcomingReturns(days = 2) {
        try {
            upcomingReturns.value = await dashboardApi.getUpcomingReturns(days)
        } catch {
            upcomingReturns.value = []
        }
    }

    function refresh() {
        return fetchAll()
    }

    return {
        stats: readonly(stats),
        revenue: readonly(revenue),
        vehicleStatus: readonly(vehicleStatus),
        upcomingReturns: readonly(upcomingReturns),
        loading: readonly(loading),
        error: readonly(error),
        fetchAll,
        fetchStats,
        fetchRevenue,
        fetchVehicleStatus,
        fetchUpcomingReturns,
        refresh
    }
}

export default useDashboardStats
