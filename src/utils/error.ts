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

/** Sunucunun İngilizce döndürdüğü bilinen metinler (yedek; backend Türkçeleştikçe daraltılabilir) */
export const backendEnglishToTurkish: Record<string, string> = {
    'Vehicle deleted successfully': 'Araç listesinden kaldırıldı',
    'Customer deleted successfully': 'Müşteri listesinden kaldırıldı',
    'Rental created successfully': 'Kiralama oluşturuldu',
    'Rental reserved successfully': 'Kiralama rezerve edildi',
    'Rental activated successfully': 'Kiralama etkinleştirildi',
    'Return process started': 'İade süreci başlatıldı',
    'Rental completed successfully': 'Kiralama tamamlandı',
    'Rental closed successfully': 'Kiralama kapatıldı',
    'Rental cancelled successfully': 'Kiralama iptal edildi',
    'Vehicle created successfully': 'Araç oluşturuldu',
    'Vehicle updated successfully': 'Araç güncellendi',
    'Vehicle status changed successfully': 'Araç durumu güncellendi',
    'Vehicle branch changed successfully': 'Araç şubesi değiştirildi',
    'Vehicle kilometers updated successfully': 'Kilometre güncellendi',
    'Vehicle image uploaded successfully': 'Araç görseli yüklendi',
    'Vehicle image deleted successfully': 'Araç görseli kaldırıldı',
    'Vehicle details updated successfully': 'Araç detayları güncellendi',
    'Personal customer created successfully': 'Bireysel müşteri oluşturuldu',
    'Company customer created successfully': 'Kurumsal müşteri oluşturuldu',
    'Customer updated successfully': 'Müşteri güncellendi',
    'Customer blacklisted successfully': 'Müşteri kara listeye eklendi',
    'Customer removed from blacklist successfully': 'Müşteri kara listeden çıkarıldı',
    'Driver created successfully': 'Sürücü oluşturuldu',
    'Driver updated successfully': 'Sürücü güncellendi',
    'Driver deleted successfully': 'Sürücü silindi',
    'File deleted successfully': 'Dosya silindi',
    'File uploaded successfully': 'Dosya yüklendi',
    'Branch deleted successfully': 'Şube listesinden kaldırıldı',
    'Branch created successfully': 'Şube oluşturuldu',
    'Branch updated successfully': 'Şube güncellendi',
    'Cannot delete rented vehicle': 'Kiradaki araç listeden kaldırılamaz',
    'User created successfully': 'Kullanıcı oluşturuldu',
    'User updated successfully': 'Kullanıcı güncellendi',
    'User status updated successfully': 'Kullanıcı durumu güncellendi',
    'Password changed successfully': 'Şifre değiştirildi',
    'Profile updated successfully': 'Profil güncellendi',
    'Settings updated successfully': 'Ayarlar güncellendi',
    'User deleted successfully': 'Kullanıcı silindi',
    'Login successful': 'Giriş başarılı',
    'Token refreshed successfully': 'Oturum yenilendi',
    'Logout successful': 'Çıkış yapıldı',
    'Color deleted successfully': 'Renk silindi',
    'Reference data import completed': 'Referans veriler içe aktarıldı',
    'License class deleted successfully': 'Ehliyet sınıfı silindi',
    'District deleted successfully': 'İlçe silindi',
    'City deleted successfully': 'İl silindi',
    'Car model deleted successfully': 'Araç modeli silindi',
    'Brand deleted successfully': 'Marka silindi',
    'Item activated successfully': 'Kayıt aktif yapıldı',
    'Item deactivated successfully': 'Kayıt pasif yapıldı',
    'Created': 'Oluşturuldu',
    'Category created successfully': 'Kategori oluşturuldu',
    'Category updated successfully': 'Kategori güncellendi',
    'Category deleted successfully': 'Kategori silindi',
    'Insurance created successfully': 'Sigorta poliçesi oluşturuldu',
    'Insurance activated successfully': 'Sigorta poliçesi aktif edildi',
    'Insurance deactivated successfully': 'Sigorta poliçesi pasif edildi',
    'Presigned URL generated': 'İndirme bağlantısı oluşturuldu',
    'Payment recorded successfully': 'Ödeme kaydedildi',
    'Branch status updated successfully': 'Şube durumu güncellendi',
    'Authorized person created successfully': 'Yetkili kişi oluşturuldu',
    'Authorized person updated successfully': 'Yetkili kişi güncellendi',
    'Primary contact updated successfully': 'Birincil yetkili güncellendi',
    'Authorized person deactivated successfully': 'Yetkili kişi pasif yapıldı',
    'Authorized person activated successfully': 'Yetkili kişi aktif edildi',
    'Authorized person deleted successfully': 'Yetkili kişi silindi',
    'KM package created successfully': 'Kilometre paketi oluşturuldu',
    'KM package updated successfully': 'Kilometre paketi güncellendi',
    'KM package activated successfully': 'Kilometre paketi aktif edildi',
    'KM package deactivated successfully': 'Kilometre paketi pasif edildi',
    'Driver added successfully': 'Sürücü eklendi',
    'Driver removed successfully': 'Sürücü kaldırıldı',
    'Primary driver updated': 'Ana sürücü güncellendi',
    'Pricing created successfully': 'Fiyat kuralı oluşturuldu',
    'Pricing deactivated': 'Fiyat kuralı pasif edildi',
    'Notification marked as read': 'Bildirim okundu işaretlendi',
    'Notification dismissed': 'Bildirim kapatıldı',
    'Contract created successfully': 'Sözleşme oluşturuldu',
    'Contract signed successfully': 'Sözleşme imzalandı',
    'Contract cancelled successfully': 'Sözleşme iptal edildi',
    'No pricing found for this combination': 'Bu kombinasyon için fiyat kuralı bulunamadı'
}

function translateBackendString(message: string): string {
    const trimmed = message.trim()
    if (backendEnglishToTurkish[trimmed]) {
        return backendEnglishToTurkish[trimmed]
    }
    if (trimmed.startsWith('Geçersiz işlem: ')) {
        const rest = trimmed.slice('Geçersiz işlem: '.length)
        if (backendEnglishToTurkish[rest]) {
            return `Geçersiz işlem: ${backendEnglishToTurkish[rest]}`
        }
    }
    return message
}

export function getUserFriendlyMessage(code: string, originalMessage: string): string {
    if (errorMessageMap[code]) {
        return errorMessageMap[code]
    }
    return translateBackendString(originalMessage)
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
            return translateBackendString(error.message)
        }

        return translateBackendString(errorMessageMap[error.code] || fallback)
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

