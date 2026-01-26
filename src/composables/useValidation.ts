import { ref, computed, type Ref } from 'vue'

export interface ValidationRule {
    validate: (value: unknown) => boolean
    message: string
}

export interface FieldValidation {
    value: Ref<unknown>
    rules: ValidationRule[]
}

export interface ValidationResult {
    isValid: boolean
    errors: string[]
}

const TCKN_PATTERN = /^[1-9]\d{10}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^(5\d{9}|0?5\d{9}|\+90\s?5\d{9})$/
const PLATE_PATTERN = /^(0[1-9]|[1-7]\d|8[01])\s?[A-Z]{1,3}\s?\d{2,4}$/i
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i
const TAX_NUMBER_PATTERN = /^\d{10,11}$/

export const rules = {
    required: (message = 'Bu alan zorunludur'): ValidationRule => ({
        validate: (value) => {
            if (value === null || value === undefined) return false
            if (typeof value === 'string') return value.trim().length > 0
            if (Array.isArray(value)) return value.length > 0
            return true
        },
        message
    }),

    minLength: (min: number, message?: string): ValidationRule => ({
        validate: (value) => typeof value === 'string' && value.length >= min,
        message: message || `En az ${min} karakter olmalıdır`
    }),

    maxLength: (max: number, message?: string): ValidationRule => ({
        validate: (value) => typeof value === 'string' && value.length <= max,
        message: message || `En fazla ${max} karakter olabilir`
    }),

    email: (message = 'Geçerli bir e-posta adresi giriniz'): ValidationRule => ({
        validate: (value) => typeof value === 'string' && EMAIL_PATTERN.test(value),
        message
    }),

    phone: (message = 'Geçerli bir telefon numarası giriniz'): ValidationRule => ({
        validate: (value) => {
            if (typeof value !== 'string') return false
            const cleaned = value.replace(/[\s\-\(\)]/g, '')
            return PHONE_PATTERN.test(cleaned)
        },
        message
    }),

    tckn: (message = 'Geçerli bir TC Kimlik No giriniz'): ValidationRule => ({
        validate: (value) => {
            if (typeof value !== 'string') return false
            if (!TCKN_PATTERN.test(value)) return false
            if (value.length !== 11) return false

            const d0 = parseInt(value[0]!, 10)
            const d1 = parseInt(value[1]!, 10)
            const d2 = parseInt(value[2]!, 10)
            const d3 = parseInt(value[3]!, 10)
            const d4 = parseInt(value[4]!, 10)
            const d5 = parseInt(value[5]!, 10)
            const d6 = parseInt(value[6]!, 10)
            const d7 = parseInt(value[7]!, 10)
            const d8 = parseInt(value[8]!, 10)
            const d9 = parseInt(value[9]!, 10)
            const d10 = parseInt(value[10]!, 10)

            const oddSum = d0 + d2 + d4 + d6 + d8
            const evenSum = d1 + d3 + d5 + d7
            const check10 = (oddSum * 7 - evenSum) % 10
            const check11 = (oddSum + evenSum + d9) % 10

            return d9 === check10 && d10 === check11
        },
        message
    }),

    plate: (message = 'Geçerli bir plaka giriniz (örn: 34 ABC 123)'): ValidationRule => ({
        validate: (value) => typeof value === 'string' && PLATE_PATTERN.test(value.trim()),
        message
    }),

    vin: (message = 'Geçerli bir VIN numarası giriniz (17 karakter)'): ValidationRule => ({
        validate: (value) => typeof value === 'string' && VIN_PATTERN.test(value),
        message
    }),

    taxNumber: (message = 'Geçerli bir vergi numarası giriniz'): ValidationRule => ({
        validate: (value) => typeof value === 'string' && TAX_NUMBER_PATTERN.test(value),
        message
    }),

    minValue: (min: number, message?: string): ValidationRule => ({
        validate: (value) => typeof value === 'number' && value >= min,
        message: message || `Değer en az ${min} olmalıdır`
    }),

    maxValue: (max: number, message?: string): ValidationRule => ({
        validate: (value) => typeof value === 'number' && value <= max,
        message: message || `Değer en fazla ${max} olabilir`
    }),

    positive: (message = 'Pozitif bir değer giriniz'): ValidationRule => ({
        validate: (value) => typeof value === 'number' && value > 0,
        message
    }),

    futureDate: (message = 'Gelecek bir tarih seçiniz'): ValidationRule => ({
        validate: (value) => {
            if (!value) return false
            const date = new Date(value as string)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return date >= today
        },
        message
    }),

    dateAfter: (otherDate: Ref<string>, message = 'Başlangıç tarihinden sonra olmalıdır'): ValidationRule => ({
        validate: (value) => {
            if (!value || !otherDate.value) return true
            return new Date(value as string) > new Date(otherDate.value)
        },
        message
    }),

    yearRange: (min: number, max: number, message?: string): ValidationRule => ({
        validate: (value) => typeof value === 'number' && value >= min && value <= max,
        message: message || `Yıl ${min} ile ${max} arasında olmalıdır`
    }),

    minAge: (minYears: number, message?: string): ValidationRule => ({
        validate: (value) => {
            if (!value) return false
            const birthDate = new Date(value as string)
            const today = new Date()
            let age = today.getFullYear() - birthDate.getFullYear()
            const monthDiff = today.getMonth() - birthDate.getMonth()
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--
            }
            return age >= minYears
        },
        message: message || `En az ${minYears} yaşında olmalısınız`
    }),

    licenseValidFor: (rentalEndDate: Ref<string>, extraMonths = 3, message?: string): ValidationRule => ({
        validate: (value) => {
            if (!value || !rentalEndDate.value) return true
            const licenseExpiry = new Date(value as string)
            const rentalEnd = new Date(rentalEndDate.value)
            rentalEnd.setMonth(rentalEnd.getMonth() + extraMonths)
            return licenseExpiry > rentalEnd
        },
        message: message || `Ehliyet, kiralama bitiş tarihinden en az ${extraMonths} ay sonrasına kadar geçerli olmalıdır`
    }),

    greaterThan: (otherValue: Ref<number>, message?: string): ValidationRule => ({
        validate: (value) => {
            if (typeof value !== 'number' || !otherValue.value) return true
            return value > otherValue.value
        },
        message: message || 'Değer belirtilen değerden büyük olmalıdır'
    })
}

export function useValidation() {
    const errors = ref<Record<string, string[]>>({})
    const touched = ref<Record<string, boolean>>({})

    function validateField(name: string, value: unknown, fieldRules: ValidationRule[]): string[] {
        const fieldErrors: string[] = []

        for (const rule of fieldRules) {
            if (!rule.validate(value)) {
                fieldErrors.push(rule.message)
            }
        }

        errors.value[name] = fieldErrors
        return fieldErrors
    }

    function validateForm(fields: Record<string, { value: unknown; rules: ValidationRule[] }>): boolean {
        let isValid = true

        for (const [name, field] of Object.entries(fields)) {
            touched.value[name] = true
            const fieldErrors = validateField(name, field.value, field.rules)
            if (fieldErrors.length > 0) {
                isValid = false
            }
        }

        return isValid
    }

    function touch(name: string) {
        touched.value[name] = true
    }

    function reset() {
        errors.value = {}
        touched.value = {}
    }

    function getError(name: string): string | undefined {
        return touched.value[name] === true ? errors.value[name]?.[0] : undefined
    }

    function hasError(name: string): boolean {
        return touched.value[name] === true && (errors.value[name]?.length ?? 0) > 0
    }

    const isValid = computed(() => {
        return Object.values(errors.value).every(errs => errs.length === 0)
    })

    return {
        errors,
        touched,
        validateField,
        validateForm,
        touch,
        reset,
        getError,
        hasError,
        isValid
    }
}

export { useValidation as default }
