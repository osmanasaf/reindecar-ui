import { BaseApi } from './client'

export interface RentalStats {
    draft: number
    reserved: number
    active: number
    returning: number
    completed: number
    cancelled: number
    overdue: number
}

export interface VehicleStats {
    available: number
    rented: number
    maintenance: number
    reserved: number
    damaged: number
}

export interface CustomerStats {
    active: number
    inactive: number
    blacklisted: number
}

export interface PaymentStats {
    pending: number
    completed: number
    failed: number
    refunded: number
    revenueByCurrency: Record<string, number>
}

export interface DashboardApiResponse {
    totalRentals: number
    totalVehicles: number
    totalCustomers: number
    totalPayments: number
    rentals: RentalStats & { active: number }
    vehicles: VehicleStats
    customers: CustomerStats
    payments: PaymentStats
}

export interface DashboardStats {
    activeRentals: number
    availableVehicles: number
    totalVehicles: number
    overdueRentals: number
    pendingPayments: number
    pendingPaymentAmount: number
    totalCustomers: number
    totalRentals: number
    todayReturns: number
    tomorrowReturns: number
}

export interface VehicleStatusData {
    available: number
    rented: number
    maintenance: number
    reserved: number
    damaged: number
}

export interface UpcomingReturnApiResponse {
    rentalId: number
    rentalNumber: string
    vehicleId: number
    customerId: number
    endDate: string
    status: string
    daysUntilReturn: number
}

export interface UpcomingReturn {
    rentalId: number
    rentalNumber: string
    vehicleId: number
    vehiclePlate: string
    vehicleName: string
    customerId: number
    customerName: string
    expectedDate: string
    expectedTime?: string
    daysUntilReturn: number
    isOverdue: boolean
    overdueDays?: number
    status: string
}

export interface RevenueByMonthApiResponse {
    month: string
    total: number
    totalsByCurrency: Record<string, number>
}

export interface RevenueData {
    labels: string[]
    values: number[]
    total: number
    currency: string
    byCurrency: Record<string, { labels: string[]; values: number[]; total: number }>
}

export interface DashboardResponse {
    stats: DashboardStats
    revenue: RevenueData
    vehicleStatus: VehicleStatusData
    upcomingReturns: UpcomingReturn[]
}

class DashboardApiService extends BaseApi {
    protected readonly basePath = '/reports'

    async getRawStats(): Promise<DashboardApiResponse> {
        const response = await this.get<{ data: DashboardApiResponse }>('/dashboard')
        return (response as unknown as { data: DashboardApiResponse }).data || response as unknown as DashboardApiResponse
    }

    async getUpcomingReturnsRaw(days: number): Promise<UpcomingReturnApiResponse[]> {
        const response = await this.get<{ data: UpcomingReturnApiResponse[] }>('/upcoming-returns', { days })
        return (response as unknown as { data: UpcomingReturnApiResponse[] }).data || response as unknown as UpcomingReturnApiResponse[]
    }

    async getRevenueRaw(months: number): Promise<RevenueByMonthApiResponse[]> {
        const response = await this.get<{ data: RevenueByMonthApiResponse[] }>('/revenue', { months })
        return (response as unknown as { data: RevenueByMonthApiResponse[] }).data || response as unknown as RevenueByMonthApiResponse[]
    }

    async getStats(): Promise<DashboardStats> {
        try {
            const raw = await this.getRawStats()
            return {
                activeRentals: raw.rentals?.active ?? 0,
                availableVehicles: raw.vehicles?.available ?? 0,
                totalVehicles: raw.totalVehicles ?? 0,
                overdueRentals: raw.rentals?.overdue ?? 0,
                pendingPayments: raw.payments?.pending ?? 0,
                pendingPaymentAmount: raw.payments?.revenueByCurrency?.TRY ?? 0,
                totalCustomers: raw.totalCustomers ?? 0,
                totalRentals: raw.totalRentals ?? 0,
                todayReturns: 0,
                tomorrowReturns: 0
            }
        } catch {
            return this.getDefaultStats()
        }
    }

    async getVehicleStatus(): Promise<VehicleStatusData> {
        try {
            const raw = await this.getRawStats()
            return {
                available: raw.vehicles?.available ?? 0,
                rented: raw.vehicles?.rented ?? 0,
                maintenance: raw.vehicles?.maintenance ?? 0,
                reserved: raw.vehicles?.reserved ?? 0,
                damaged: raw.vehicles?.damaged ?? 0
            }
        } catch {
            return this.getDefaultVehicleStatus()
        }
    }

    async getUpcomingReturns(days = 7): Promise<UpcomingReturn[]> {
        try {
            const raw = await this.getUpcomingReturnsRaw(days)
            return raw.map(item => ({
                rentalId: item.rentalId,
                rentalNumber: item.rentalNumber,
                vehicleId: item.vehicleId,
                vehiclePlate: '-',
                vehicleName: '-',
                customerId: item.customerId,
                customerName: '-',
                expectedDate: item.endDate,
                daysUntilReturn: item.daysUntilReturn,
                isOverdue: item.daysUntilReturn < 0,
                overdueDays: item.daysUntilReturn < 0 ? Math.abs(item.daysUntilReturn) : undefined,
                status: item.status
            }))
        } catch {
            return []
        }
    }

    async getRevenue(months = 6): Promise<RevenueData> {
        try {
            const raw = await this.getRevenueRaw(months)
            
            const labels: string[] = []
            const values: number[] = []
            let total = 0
            const byCurrency: Record<string, { labels: string[]; values: number[]; total: number }> = {}

            for (const item of raw) {
                const monthLabel = this.formatMonthLabel(item.month)
                labels.push(monthLabel)
                values.push(item.total)
                total += item.total

                for (const [currency, amount] of Object.entries(item.totalsByCurrency || {})) {
                    byCurrency[currency] ??= { labels: [], values: [], total: 0 }
                    byCurrency[currency].labels.push(monthLabel)
                    byCurrency[currency].values.push(amount)
                    byCurrency[currency].total += amount
                }
            }

            return { labels, values, total, currency: 'TRY', byCurrency }
        } catch {
            return this.getDefaultRevenue()
        }
    }

    private formatMonthLabel(monthStr: string): string {
        const [year, month] = monthStr.split('-')
        const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
        const monthIndex = Number.parseInt(month, 10) - 1
        return `${monthNames[monthIndex]} ${year.slice(2)}`
    }

    async getAll(revenueMonths = 6, upcomingDays = 7): Promise<DashboardResponse> {
        try {
            const [raw, revenueData, upcomingReturns] = await Promise.all([
                this.getRawStats(),
                this.getRevenue(revenueMonths),
                this.getUpcomingReturns(upcomingDays)
            ])

            const todayReturns = upcomingReturns.filter(r => r.daysUntilReturn === 0).length
            const tomorrowReturns = upcomingReturns.filter(r => r.daysUntilReturn === 1).length
            
            const stats: DashboardStats = {
                activeRentals: raw.rentals?.active ?? 0,
                availableVehicles: raw.vehicles?.available ?? 0,
                totalVehicles: raw.totalVehicles ?? 0,
                overdueRentals: raw.rentals?.overdue ?? 0,
                pendingPayments: raw.payments?.pending ?? 0,
                pendingPaymentAmount: raw.payments?.revenueByCurrency?.TRY ?? 0,
                totalCustomers: raw.totalCustomers ?? 0,
                totalRentals: raw.totalRentals ?? 0,
                todayReturns,
                tomorrowReturns
            }

            const vehicleStatus: VehicleStatusData = {
                available: raw.vehicles?.available ?? 0,
                rented: raw.vehicles?.rented ?? 0,
                maintenance: raw.vehicles?.maintenance ?? 0,
                reserved: raw.vehicles?.reserved ?? 0,
                damaged: raw.vehicles?.damaged ?? 0
            }
            
            return { 
                stats, 
                revenue: revenueData, 
                vehicleStatus, 
                upcomingReturns 
            }
        } catch {
            return {
                stats: this.getDefaultStats(),
                revenue: this.getDefaultRevenue(),
                vehicleStatus: this.getDefaultVehicleStatus(),
                upcomingReturns: []
            }
        }
    }

    private getDefaultStats(): DashboardStats {
        return {
            activeRentals: 0,
            availableVehicles: 0,
            totalVehicles: 0,
            overdueRentals: 0,
            pendingPayments: 0,
            pendingPaymentAmount: 0,
            totalCustomers: 0,
            totalRentals: 0,
            todayReturns: 0,
            tomorrowReturns: 0
        }
    }

    private getDefaultRevenue(): RevenueData {
        return {
            labels: [],
            values: [],
            total: 0,
            currency: 'TRY',
            byCurrency: {}
        }
    }

    private getDefaultVehicleStatus(): VehicleStatusData {
        return {
            available: 0,
            rented: 0,
            maintenance: 0,
            reserved: 0,
            damaged: 0
        }
    }
}

export const dashboardApi = new DashboardApiService()
