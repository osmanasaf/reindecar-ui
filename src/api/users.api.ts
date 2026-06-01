import { BaseApi } from './client'
import type { PaginatedResponse, PaginationParams } from '@/types'

export interface UpdateProfileRequest {
    email: string
    firstName: string
    lastName: string
}

export interface ChangePasswordRequest {
    currentPassword: string
    newPassword: string
}

export interface UserSettings {
    emailNotifications: boolean
    smsNotifications: boolean
    pushNotifications: boolean
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR'

export interface UserResponse {
    id: number
    username: string
    email: string
    firstName?: string
    lastName?: string
    fullName: string
    role: UserRole | string
    tenantId?: number
    branchId?: number | null
    branchName?: string | null
    active: boolean
    lastLoginAt?: string | null
    createdAt?: string
}

export interface CreateUserRequest {
    username: string
    email: string
    password: string
    firstName: string
    lastName: string
    role: UserRole
    branchId?: number | null
}

export interface UpdateUserRequest {
    email: string
    firstName: string
    lastName: string
    branchId?: number | null
}

class UsersApiService extends BaseApi {
    protected readonly basePath = '/users'

    async getAll(params?: PaginationParams): Promise<PaginatedResponse<UserResponse>> {
        return this.getList<UserResponse>('', params)
    }

    async getById(id: number): Promise<UserResponse> {
        return this.get<UserResponse>(`/${id}`)
    }

    async create(data: CreateUserRequest): Promise<UserResponse> {
        return this.post<UserResponse>('', data)
    }

    async update(id: number, data: UpdateUserRequest): Promise<UserResponse> {
        return this.put<UserResponse>(`/${id}`, data)
    }

    async toggleStatus(id: number): Promise<void> {
        return this.patch<void>(`/${id}/status`)
    }

    async updateProfile(data: UpdateProfileRequest): Promise<UserResponse> {
        return this.put('/profile', data)
    }

    async changePassword(data: ChangePasswordRequest): Promise<void> {
        return this.put('/password', data)
    }

    async getSettings(): Promise<UserSettings> {
        return this.get('/settings')
    }

    async updateSettings(data: UserSettings): Promise<UserSettings> {
        return this.put('/settings', data)
    }
}

export const usersApi = new UsersApiService()
