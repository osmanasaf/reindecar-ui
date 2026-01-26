const TCKN_LENGTH = 11

export function validateTCKN(id: string): boolean {
    if (!/^\d{11}$/.test(id)) return false
    if (id[0] === '0') return false

    const digits = id.split('').map(Number)

    const oddSum = (digits[0] ?? 0) + (digits[2] ?? 0) + (digits[4] ?? 0) + (digits[6] ?? 0) + (digits[8] ?? 0)
    const evenSum = (digits[1] ?? 0) + (digits[3] ?? 0) + (digits[5] ?? 0) + (digits[7] ?? 0)
    const digit10 = (oddSum * 7 - evenSum) % 10
    if (digit10 !== digits[9]) return false

    const sum = digits.slice(0, 10).reduce((a, b) => a + b, 0)
    const digit11 = sum % 10
    if (digit11 !== digits[10]) return false

    return true
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): boolean {
    return EMAIL_PATTERN.test(email)
}

const PHONE_PATTERN = /^5\d{9}$/

export function validatePhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '')
    return PHONE_PATTERN.test(digits)
}

const TAX_NUMBER_PATTERN = /^\d{10}$/

export function validateTaxNumber(taxNo: string): boolean {
    return TAX_NUMBER_PATTERN.test(taxNo)
}

const PLATE_PATTERN = /^(0[1-9]|[1-7]\d|8[01])[A-Z]{1,3}\d{2,4}$/

export function validatePlate(plate: string): boolean {
    const cleaned = plate.replace(/\s/g, '').toUpperCase()
    return PLATE_PATTERN.test(cleaned)
}

export function required(value: unknown): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return true
}

export function minLength(value: string, min: number): boolean {
    return value.length >= min
}

export function maxLength(value: string, max: number): boolean {
    return value.length <= max
}

export function isPositive(value: number): boolean {
    return value > 0
}
