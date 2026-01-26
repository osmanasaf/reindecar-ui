import { BaseApi } from './client'

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

export interface UserResponse {
    id: number
    username: string
    email: string
    fullName: string
    role: string
    active: boolean
}

class UsersApiService extends BaseApi {
    protected readonly basePath = '/users'

    /**
     * Mevcut kullanıcının profilini güncelle
     */
    async updateProfile(data: UpdateProfileRequest): Promise<UserResponse> {
        return this.put('/profile', data)
    }

    /**
     * Mevcut kullanıcının şifresini değiştir
     */
    async changePassword(data: ChangePasswordRequest): Promise<void> {
        return this.put('/password', data)
    }

    /**
     * Mevcut kullanıcının bildirim ayarlarını getir
     */
    async getSettings(): Promise<UserSettings> {
        return this.get('/settings')
    }

    /**
     * Mevcut kullanıcının bildirim ayarlarını güncelle
     */
    async updateSettings(data: UserSettings): Promise<UserSettings> {
        return this.put('/settings', data)
    }
}

export const usersApi = new UsersApiService()
