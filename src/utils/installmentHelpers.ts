import type { InstallmentPaymentStatus } from '@/types'

export function formatDate(dateString: string | null): string {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('tr-TR')
}

export function formatCurrency(amount: number | null, currency: string = 'TRY'): string {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: currency
    }).format(amount)
}

export function isOverdue(dueDate: string, status: InstallmentPaymentStatus): boolean {
    if (status !== 'PENDING') return false
    return new Date(dueDate) < new Date()
}

export function getStatusBadgeColor(status: InstallmentPaymentStatus): string {
    switch (status) {
        case 'PAID':
            return 'success'
        case 'PENDING':
            return 'info'
        case 'OVERDUE':
            return 'danger'
        default:
            return 'secondary'
    }
}

export function getStatusLabel(status: InstallmentPaymentStatus): string {
    switch (status) {
        case 'PAID':
            return 'Ödendi'
        case 'PENDING':
            return 'Bekliyor'
        case 'OVERDUE':
            return 'Gecikmiş'
        default:
            return status
    }
}

export function calculateProgress(paid: number, total: number): number {
    if (total === 0) return 0
    return Math.round((paid / total) * 100)
}

export function validateStartDate(dateString: string): boolean {
    const selectedDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return selectedDate >= today
}

export function validatePositiveNumber(value: number): boolean {
    return value > 0
}

export function validateInstallmentCount(count: number): boolean {
    return Number.isInteger(count) && count >= 1
}
