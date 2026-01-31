// API Response Types
export interface ApiResponse<T> {
    success: boolean
    message?: string
    data: T
    timestamp: string
}

export interface PaginatedResponse<T> {
    content: T[]
    page: number
    size: number
    totalElements: number
    totalPages: number
    first: boolean
    last: boolean
}

export interface PaginationParams {
    page?: number
    size?: number
    sort?: string
    direction?: 'asc' | 'desc'
}

export interface ApiError {
    success: false
    message: string
    data?: {
        errors?: Array<{
            field: string
            message: string
        }>
    }
    timestamp: string
}

// Backend Error Response Format (AOP Global Exception Handler)
export interface ErrorResponse {
    code: string
    message: string
    timestamp: string
    path: string
    traceId: string
    details?: Record<string, string>
}

// Error Code kategorileri
export type ErrorCode = 
    // Genel Hatalar (E)
    | 'E001' // ENTITY_NOT_FOUND
    | 'E002' // DUPLICATE_ENTITY
    | 'E003' // INVALID_OPERATION
    | 'E004' // VALIDATION_ERROR
    | 'E005' // INVALID_PARAMETER
    // Araç Hataları (V)
    | 'V001' // VEHICLE_NOT_FOUND
    | 'V002' // VEHICLE_NOT_AVAILABLE
    | 'V003' // VEHICLE_ALREADY_RENTED
    | 'V004' // VEHICLE_INVALID_STATE
    // Müşteri Hataları (C)
    | 'C001' // CUSTOMER_NOT_FOUND
    | 'C002' // CUSTOMER_BLACKLISTED
    | 'C003' // CUSTOMER_INVALID_LICENSE
    // Kiralama Hataları (R)
    | 'R001' // RENTAL_NOT_FOUND
    | 'R002' // RENTAL_OVERLAP
    | 'R003' // RENTAL_INVALID_STATE
    | 'R004' // RENTAL_ALREADY_COMPLETED
    | 'R005' // RENTAL_ALREADY_CANCELLED
    // Şube Hataları (B)
    | 'B001' // BRANCH_NOT_FOUND
    | 'B002' // BRANCH_INACTIVE
    // Fiyatlandırma Hataları (P)
    | 'P001' // PRICING_NOT_FOUND
    | 'P002' // PRICING_INVALID
    // Fatura Hataları (I)
    | 'I001' // INVOICE_NOT_FOUND
    | 'I002' // INVOICE_ALREADY_FINALIZED
    | 'I003' // INVOICE_ALREADY_PAID
    // Dosya Hataları (F)
    | 'F001' // FILE_NOT_FOUND
    | 'F002' // FILE_UPLOAD_FAILED
    | 'F003' // FILE_TYPE_NOT_ALLOWED
    // Yetkilendirme Hataları (A)
    | 'A001' // UNAUTHORIZED
    | 'A002' // ACCESS_DENIED
    | 'A003' // TOKEN_EXPIRED
    | 'A004' // WEAK_PASSWORD
    // Sistem Hataları (S)
    | 'S001' // INTERNAL_ERROR
    | 'S002' // DATABASE_ERROR
    | 'S003' // EXTERNAL_SERVICE_ERROR
    | 'S004' // JSON_PARSE_ERROR
    | 'S005' // MISSING_PARAMETER
    | 'S006' // METHOD_NOT_ALLOWED
    | 'S007' // CONSTRAINT_VIOLATION

export enum ErrorCategory {
    GENERAL = 'E',
    VEHICLE = 'V',
    CUSTOMER = 'C',
    RENTAL = 'R',
    BRANCH = 'B',
    PRICING = 'P',
    INVOICE = 'I',
    FILE = 'F',
    AUTH = 'A',
    SYSTEM = 'S'
}
