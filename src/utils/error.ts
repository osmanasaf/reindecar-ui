import { type ErrorResponse, ErrorCategory } from '@/types'

export function isErrorResponse(obj: unknown): obj is ErrorResponse {
    return (
        obj !== null &&
        typeof obj === 'object' &&
        'code' in obj &&
        'message' in obj &&
        'timestamp' in obj &&
        'path' in obj &&
        'traceId' in obj &&
        typeof (obj as ErrorResponse).code === 'string' &&
        typeof (obj as ErrorResponse).message === 'string' &&
        typeof (obj as ErrorResponse).timestamp === 'string' &&
        typeof (obj as ErrorResponse).path === 'string' &&
        typeof (obj as ErrorResponse).traceId === 'string'
    )
}

export function isValidationError(error: ErrorResponse): boolean {
    return error.code === 'E004' && error.details !== null && error.details !== undefined
}

export function isAuthError(error: ErrorResponse): boolean {
    return (
        error.code === 'A001' ||
        error.code === 'A002' ||
        error.code === 'A003' ||
        error.code === 'A004'
    )
}

export function isRetryableError(error: ErrorResponse): boolean {
    return error.code === 'S001' || error.code === 'S003'
}

export function getErrorCategory(code: string): ErrorCategory {
    const prefix = code.charAt(0)
    switch (prefix) {
        case 'E': return ErrorCategory.GENERAL
        case 'V': return ErrorCategory.VEHICLE
        case 'C': return ErrorCategory.CUSTOMER
        case 'R': return ErrorCategory.RENTAL
        case 'B': return ErrorCategory.BRANCH
        case 'P': return ErrorCategory.PRICING
        case 'I': return ErrorCategory.INVOICE
        case 'F': return ErrorCategory.FILE
        case 'A': return ErrorCategory.AUTH
        case 'S': return ErrorCategory.SYSTEM
        default: return ErrorCategory.SYSTEM
    }
}

export const errorMessageMap: Record<string, string> = {
    E001: 'Aradığınız kayıt bulunamadı',
    E002: 'Bu kayıt zaten mevcut',
    E003: 'Bu işlem şu anda gerçekleştirilemiyor',
    E004: 'Lütfen form alanlarını kontrol edin',
    E005: 'Geçersiz parametre gönderildi',
    V001: 'Araç bulunamadı',
    V002: 'Bu araç şu anda müsait değil',
    V003: 'Bu araç zaten kiralanmış durumda',
    V004: 'Araç durumu bu işleme uygun değil',
    C001: 'Müşteri bilgisi bulunamadı',
    C002: 'Bu müşteri işlem yapamaz durumda',
    C003: 'Ehliyet bilgileri geçersiz',
    R001: 'Kiralama kaydı bulunamadı',
    R002: 'Seçilen tarihler için çakışma var',
    R003: 'Kiralama durumu bu işleme uygun değil',
    R004: 'Bu kiralama zaten tamamlanmış',
    R005: 'Bu kiralama iptal edilmiş',
    B001: 'Şube bulunamadı',
    B002: 'Şube aktif değil',
    P001: 'Fiyat kuralı bulunamadı',
    P002: 'Geçersiz fiyat bilgisi',
    I001: 'Fatura bulunamadı',
    I002: 'Fatura onaylanmış',
    I003: 'Fatura ödenmiş',
    F001: 'Dosya bulunamadı',
    F002: 'Dosya yükleme başarısız',
    F003: 'Dosya tipi desteklenmiyor',
    F004: 'Dosya boyutu çok büyük. Maksimum 50MB yükleyebilirsiniz',
    A001: 'Giriş yapmanız gerekiyor',
    A002: 'Bu işlem için yetkiniz bulunmuyor',
    A003: 'Oturumunuzun süresi doldu, lütfen tekrar giriş yapın',
    A004: 'Şifreniz yeterince güçlü değil',
    S001: 'Bir hata oluştu, lütfen tekrar deneyin',
    S002: 'Veritabanı hatası oluştu',
    S003: 'Servis şu anda erişilebilir değil',
    S004: 'Gönderilen veri formatı hatalı',
    S005: 'Zorunlu alan eksik',
    S006: 'HTTP metodu desteklenmiyor',
    S007: 'Veri bütünlük hatası'
}

export function getUserFriendlyMessage(code: string, originalMessage: string): string {
    return errorMessageMap[code] || originalMessage
}

export function generateTraceId(): string {
    return Math.random().toString(36).substring(2, 10)
}

export function getErrorIcon(code: string): string {
    const category = getErrorCategory(code)
    switch (category) {
        case ErrorCategory.AUTH: return '🔒'
        case ErrorCategory.VEHICLE:
        case ErrorCategory.RENTAL: return '🚗'
        case ErrorCategory.SYSTEM: return '⚠️'
        case ErrorCategory.FILE: return '📁'
        case ErrorCategory.CUSTOMER: return '👤'
        default: return '❌'
    }
}

export function getErrorSeverity(code: string): 'error' | 'warning' | 'info' {
    const category = getErrorCategory(code)
    if (category === ErrorCategory.SYSTEM || category === ErrorCategory.AUTH) {
        return 'error'
    }
    if (category === ErrorCategory.GENERAL || category === ErrorCategory.CUSTOMER) {
        return 'warning'
    }
    return 'info'
}

export function getApiErrorMessage(err: unknown, fallback = 'Bir hata oluştu'): string {
    const resolveBackendMessage = (error: ErrorResponse): string => {
        if (error.code === 'E004' && error.details) {
            const details = Object.values(error.details)
            if (details.length > 0) {
                return details.slice(0, 3).join(', ') + (details.length > 3 ? '...' : '')
            }
        }

        if (typeof error.message === 'string' && error.message.trim().length > 0) {
            return error.message
        }

        return errorMessageMap[error.code] || fallback
    }

    if (!err) return fallback
    if (typeof err === 'string') return err
    if (typeof err === 'object') {
        if (isErrorResponse(err)) {
            return resolveBackendMessage(err)
        }

        const e = err as { message?: string; status?: number; response?: { status?: number; data?: unknown } }

        const httpStatus = e.status || e.response?.status
        if (httpStatus === 413) {
            return 'Dosya boyutu çok büyük. Maksimum 50MB yükleyebilirsiniz'
        }

        if (e.response?.data && isErrorResponse(e.response.data)) {
            return resolveBackendMessage(e.response.data)
        }

        if (e.message) return e.message
    }

    return fallback
}

