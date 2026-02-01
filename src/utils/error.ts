import type { ErrorResponse, ErrorCategory } from '@/types'

/**
 * Type guard: Objenin ErrorResponse formatında olup olmadığını kontrol eder
 */
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

/**
 * Validasyon hatası kontrolü (E004 kodu ve details alanı)
 */
export function isValidationError(error: ErrorResponse): boolean {
    return error.code === 'E004' && error.details !== null && error.details !== undefined
}

/**
 * Auth hatası kontrolü (A001, A002, A003, A004)
 */
export function isAuthError(error: ErrorResponse): boolean {
    return (
        error.code === 'A001' ||
        error.code === 'A002' ||
        error.code === 'A003' ||
        error.code === 'A004'
    )
}

/**
 * Retry edilebilir hata kontrolü (S001, S003)
 */
export function isRetryableError(error: ErrorResponse): boolean {
    return error.code === 'S001' || error.code === 'S003'
}

/**
 * Error kodundan kategori çıkarma
 */
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

/**
 * Kullanıcı dostu hata mesajları haritası
 */
export const errorMessageMap: Record<string, string> = {
    // Genel Hatalar (E)
    E001: 'Aradığınız kayıt bulunamadı',
    E002: 'Bu kayıt zaten mevcut',
    E003: 'Bu işlem şu anda gerçekleştirilemiyor',
    E004: 'Lütfen form alanlarını kontrol edin',
    E005: 'Geçersiz parametre gönderildi',

    // Araç Hataları (V)
    V001: 'Araç bulunamadı',
    V002: 'Bu araç şu anda müsait değil',
    V003: 'Bu araç zaten kiralanmış durumda',
    V004: 'Araç durumu bu işleme uygun değil',

    // Müşteri Hataları (C)
    C001: 'Müşteri bilgisi bulunamadı',
    C002: 'Bu müşteri işlem yapamaz durumda',
    C003: 'Ehliyet bilgileri geçersiz',

    // Kiralama Hataları (R)
    R001: 'Kiralama kaydı bulunamadı',
    R002: 'Seçilen tarihler için çakışma var',
    R003: 'Kiralama durumu bu işleme uygun değil',
    R004: 'Bu kiralama zaten tamamlanmış',
    R005: 'Bu kiralama iptal edilmiş',

    // Şube Hataları (B)
    B001: 'Şube bulunamadı',
    B002: 'Şube aktif değil',

    // Fiyatlandırma Hataları (P)
    P001: 'Fiyat kuralı bulunamadı',
    P002: 'Geçersiz fiyat bilgisi',

    // Fatura Hataları (I)
    I001: 'Fatura bulunamadı',
    I002: 'Fatura onaylanmış',
    I003: 'Fatura ödenmiş',

    // Dosya Hataları (F)
    F001: 'Dosya bulunamadı',
    F002: 'Dosya yükleme başarısız',
    F003: 'Dosya tipi desteklenmiyor',

    // Yetkilendirme Hataları (A)
    A001: 'Giriş yapmanız gerekiyor',
    A002: 'Bu işlem için yetkiniz bulunmuyor',
    A003: 'Oturumunuzun süresi doldu, lütfen tekrar giriş yapın',
    A004: 'Şifreniz yeterince güçlü değil',

    // Sistem Hataları (S)
    S001: 'Bir hata oluştu, lütfen tekrar deneyin',
    S002: 'Veritabanı hatası oluştu',
    S003: 'Servis şu anda erişilebilir değil',
    S004: 'Gönderilen veri formatı hatalı',
    S005: 'Zorunlu alan eksik',
    S006: 'HTTP metodu desteklenmiyor',
    S007: 'Veri bütünlük hatası'
}

/**
 * Error kodu için kullanıcı dostu mesaj döner
 */
export function getUserFriendlyMessage(code: string, originalMessage: string): string {
    return errorMessageMap[code] || originalMessage
}

/**
 * TraceId oluşturma (8 karakterlik random string)
 */
export function generateTraceId(): string {
    return Math.random().toString(36).substring(2, 10)
}

/**
 * Hata kategorisine göre ikon döner (UI için opsiyonel)
 */
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

/**
 * Hata şiddeti seviyesi (UI için opsiyonel)
 */
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
    if (!err) return fallback
    if (typeof err === 'string') return err
    if (typeof err === 'object') {
        // Backend ErrorResponse formatı (apiClient doğrudan bu objeyi fırlatır)
        if (isErrorResponse(err)) {
            // Validasyon hatası ise detayları göster
            if (err.code === 'E004' && err.details) {
                const details = Object.values(err.details)
                if (details.length > 0) {
                    return details.slice(0, 3).join(', ') + (details.length > 3 ? '...' : '')
                }
            }
            // Kullanıcı dostu mesaj varsa kullan
            return errorMessageMap[err.code] || err.message
        }
        // Axios wrapper formatı (err.response.data)
        const e = err as { message?: string; response?: { data?: unknown } }
        if (e.response?.data && isErrorResponse(e.response.data)) {
            const errData = e.response.data
            if (errData.code === 'E004' && errData.details) {
                const details = Object.values(errData.details)
                if (details.length > 0) {
                    return details.slice(0, 3).join(', ') + (details.length > 3 ? '...' : '')
                }
            }
            return errorMessageMap[errData.code] || errData.message
        }
        if (e.message) return e.message
    }
    return fallback
}
