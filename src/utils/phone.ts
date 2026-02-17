const LOCAL_PHONE_LENGTH = 10
const COUNTRY_CODE_DIGITS = '90'
const TRUNK_PREFIX = '0'

function formatPhoneGroups(localDigits: string): string {
    const p1 = localDigits.slice(0, 3)
    const p2 = localDigits.slice(3, 6)
    const p3 = localDigits.slice(6, 8)
    const p4 = localDigits.slice(8, 10)
    return [p1, p2, p3, p4].filter(Boolean).join(' ')
}

export function normalizePhoneDigits(value: string): string {
    const rawDigits = value.replace(/\D/g, '')
    if (!rawDigits) return ''

    let digits = rawDigits

    if (digits.startsWith(COUNTRY_CODE_DIGITS) && digits.length >= 12) {
        digits = digits.slice(COUNTRY_CODE_DIGITS.length)
    }

    if (digits.startsWith(TRUNK_PREFIX) && digits.length === 11) {
        digits = digits.slice(1)
    }

    return digits.slice(0, LOCAL_PHONE_LENGTH)
}

export function formatPhoneInput(value: string): string {
    return formatPhoneGroups(normalizePhoneDigits(value))
}

export function formatPhoneWithCountryCode(value: string): string {
    const localDigits = normalizePhoneDigits(value)
    if (!localDigits) return ''
    return `+90 ${formatPhoneGroups(localDigits)}`
}

export function isValidPhoneNumber(value: string): boolean {
    return normalizePhoneDigits(value).length === LOCAL_PHONE_LENGTH
}

export function toE164Phone(value: string): string {
    const localDigits = normalizePhoneDigits(value)
    return localDigits ? `+90${localDigits}` : ''
}

export const PHONE_INPUT_MAX_LENGTH = 13
