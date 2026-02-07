
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


export interface ErrorResponse {
    code: string
    message: string
    timestamp: string
    path: string
    traceId: string
    details?: Record<string, string>
}


export type ErrorCode =

    | 'E001'
    | 'E002'
    | 'E003'
    | 'E004'
    | 'E005'

    | 'V001'
    | 'V002'
    | 'V003'
    | 'V004'

    | 'C001'
    | 'C002'
    | 'C003'

    | 'R001'
    | 'R002'
    | 'R003'
    | 'R004'
    | 'R005'

    | 'B001'
    | 'B002'

    | 'P001'
    | 'P002'

    | 'I001'
    | 'I002'
    | 'I003'

    | 'F001'
    | 'F002'
    | 'F003'

    | 'A001'
    | 'A002'
    | 'A003'
    | 'A004'

    | 'S001'
    | 'S002'
    | 'S003'
    | 'S004'
    | 'S005'
    | 'S006'
    | 'S007'

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
