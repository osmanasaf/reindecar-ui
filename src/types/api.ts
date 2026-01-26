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
