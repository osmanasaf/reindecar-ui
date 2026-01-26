export function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
}

export function formatDateTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function toLocalDate(utcDateString: string): string {
    const date = new Date(utcDateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function isExpired(dateString: string): boolean {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
}

export function daysUntil(dateString: string): number {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)

    const diffTime = date.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function isExpiringSoon(dateString: string, days = 30): boolean {
    const daysLeft = daysUntil(dateString)
    return daysLeft >= 0 && daysLeft <= days
}

export function formatDateRange(startDate: string, endDate: string): string {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
}
