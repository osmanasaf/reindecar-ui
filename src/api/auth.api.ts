import { BaseApi, tokenStorage } from './client'
import type { AuthTokens, User, LoginForm } from '@/types'

class AuthApiService extends BaseApi {
    protected readonly basePath = '/auth'

    async login(credentials: LoginForm): Promise<AuthTokens> {
        return this.post('/login', credentials)
    }

    async refresh(refreshToken: string): Promise<AuthTokens> {
        return this.post('/refresh', { refreshToken })
    }

    async logout(): Promise<void> {
        try {
            await this.post('/logout')
        } finally {
            tokenStorage.clearTokens()
        }
    }

    async me(): Promise<User> {
        return this.get('/me')
    }
}

export const authApi = new AuthApiService()
