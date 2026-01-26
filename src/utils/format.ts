export function safeNumber(value: unknown, defaultValue = 0): number {
    if (value === null || value === undefined) return defaultValue
    const num = Number(value)
    return isNaN(num) ? defaultValue : num
}

export function formatCurrency(amount: unknown, currency = 'TRY'): string {
    const num = safeNumber(amount)
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
    }).format(num)
}

export function formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')

    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
    }

    return phone
}

export function maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 10) {
        return `(${digits.slice(0, 3)}) *** ** ${digits.slice(-2)}`
    }
    return '***'
}

export function formatPlate(plate: string): string {
    return plate.toUpperCase().replace(/[^A-Z0-9]/g, ' ').trim()
}

export function maskNationalId(id: string): string {
    if (id.length >= 11) {
        return `${id.slice(0, 3)}****${id.slice(-2)}`
    }
    return '***'
}

export function formatKm(km: unknown): string {
    const num = safeNumber(km)
    return `${new Intl.NumberFormat('tr-TR').format(num)} km`
}

export function formatPercent(value: unknown): string {
    const num = safeNumber(value)
    return `%${num.toFixed(1)}`
}

export function safeString(value: unknown, defaultValue = '-'): string {
    if (value === null || value === undefined || value === '') return defaultValue
    return String(value)
}
