export interface ValidationRule {
    validate: (value: any) => boolean
    message: string
}

export interface ValidationResult {
    valid: boolean
    errors: string[]
}

export const validators = {
    required: (message = 'Bu alan zorunludur'): ValidationRule => ({
        validate: (value: any) => {
            if (typeof value === 'string') return value.trim().length > 0
            if (typeof value === 'number') return !isNaN(value)
            return value != null
        },
        message
    }),

    email: (message = 'Geçerli bir e-posta adresi giriniz'): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            return emailRegex.test(value)
        },
        message
    }),

    phone: (message = 'Geçerli bir telefon numarası giriniz'): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            const phoneRegex = /^[0-9]{10,11}$/
            return phoneRegex.test(value.replace(/[\s()-]/g, ''))
        },
        message
    }),

    minLength: (min: number, message?: string): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            return value.length >= min
        },
        message: message || `En az ${min} karakter olmalıdır`
    }),

    maxLength: (max: number, message?: string): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            return value.length <= max
        },
        message: message || `En fazla ${max} karakter olmalıdır`
    }),

    min: (min: number, message?: string): ValidationRule => ({
        validate: (value: number) => {
            if (value == null) return true
            return value >= min
        },
        message: message || `En az ${min} olmalıdır`
    }),

    max: (max: number, message?: string): ValidationRule => ({
        validate: (value: number) => {
            if (value == null) return true
            return value <= max
        },
        message: message || `En fazla ${max} olmalıdır`
    }),

    pattern: (regex: RegExp, message = 'Geçersiz format'): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            return regex.test(value)
        },
        message
    }),

    numeric: (message = 'Sadece rakam giriniz'): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            return /^[0-9]+$/.test(value)
        },
        message
    }),

    alphanumeric: (message = 'Sadece harf ve rakam giriniz'): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            return /^[a-zA-Z0-9]+$/.test(value)
        },
        message
    }),

    url: (message = 'Geçerli bir URL giriniz'): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            try {
                new URL(value)
                return true
            } catch {
                return false
            }
        },
        message
    }),

    tcKimlik: (message = 'Geçerli bir TC Kimlik No giriniz'): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            if (value.length !== 11) return false
            if (!/^[0-9]{11}$/.test(value)) return false
            if (value[0] === '0') return false

            const digits = value.split('').map(Number)
            if (digits.length !== 11) return false

            const sum1 = ((digits[0] ?? 0) + (digits[2] ?? 0) + (digits[4] ?? 0) + (digits[6] ?? 0) + (digits[8] ?? 0)) * 7
            const sum2 = (digits[1] ?? 0) + (digits[3] ?? 0) + (digits[5] ?? 0) + (digits[7] ?? 0)
            const check10 = (sum1 - sum2) % 10

            if (check10 !== (digits[9] ?? -1)) return false

            const sum3 = digits.slice(0, 10).reduce((a, b) => a + b, 0)
            const check11 = sum3 % 10

            return check11 === (digits[10] ?? -1)
        },
        message
    }),

    iban: (message = 'Geçerli bir IBAN giriniz'): ValidationRule => ({
        validate: (value: string) => {
            if (!value) return true
            const iban = value.replace(/\s/g, '').toUpperCase()
            if (!/^TR[0-9]{24}$/.test(iban)) return false
            return true
        },
        message
    })
}

export function validate(value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = []

    for (const rule of rules) {
        if (!rule.validate(value)) {
            errors.push(rule.message)
        }
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

export function formatPhoneInput(value: string): string {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 10) {
        return digits.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '($1) $2 $3 $4')
    }
    return digits.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '($1) $2 $3 $4')
}

export function formatIbanInput(value: string): string {
    const cleaned = value.replace(/\s/g, '').toUpperCase()
    return cleaned.replace(/(.{4})/g, '$1 ').trim()
}
