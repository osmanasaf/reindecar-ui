export type CalendarBlockType = 'RENTAL' | 'OUT_OF_SERVICE'

export interface CalendarBlock {
    blockType: CalendarBlockType
    rentalId: number | null
    rentalNumber: string | null
    rentalStatus: string | null
    vehicleStatus: string | null
    startDate: string
    endDate: string | null
    openEnded: boolean
}

export interface VehicleCalendarRow {
    vehicleId: number
    plateNumber: string
    brand: string
    model: string
    categoryId: number | null
    categoryName: string | null
    branchId: number | null
    branchName: string | null
    currentStatus: string | null
    blocks: CalendarBlock[]
}

export const RENTAL_STATUS_COLORS: Record<string, string> = {
    DRAFT: '#c4c9d1',
    RESERVED: '#e8b339',
    ACTIVE: '#3fb374',
    OVERDUE: '#e05656',
    RETURN_PENDING: '#e08a3f',
    PENDING_PAYMENT: '#9b6fe0',
}
