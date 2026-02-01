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

export function formatPlateInput(value: string): string {
    const raw = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (!raw) return ''
    let city = ''
    let letters = ''
    let digits = ''
    let phase: 'city' | 'letters' | 'digits' = 'city'
    for (const c of raw) {
        if (phase === 'city') {
            if (/[0-9]/.test(c) && city.length < 2) city += c
            if (city.length === 2) phase = 'letters'
        } else if (phase === 'letters') {
            if (/[A-Z]/.test(c) && letters.length < 3) letters += c
            else if (/[0-9]/.test(c)) { phase = 'digits'; digits += c }
        } else if (phase === 'digits' && /[0-9]/.test(c) && digits.length < 4) {
            digits += c
        }
    }
    let result = city
    if (letters) result += ' ' + letters
    if (digits) result += ' ' + digits
    return result
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

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('tr-TR', options || {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

export function formatDateTime(date: string | Date): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}
