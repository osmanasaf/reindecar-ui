import { BaseApi, tokenStorage } from './client'
import type { AuthTokens, User, LoginForm } from '@/types'

export interface RegisterTenantRequest {
    companyName: string
    username: string
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
}

export interface RegisterInvitedUserRequest {
    token: string
    username: string
    password: string
    firstName: string
    lastName: string
}

export interface UserInvitationPreviewResponse {
    email: string
    tenantName: string
    role: 'ADMIN' | 'OPERATOR'
}

class AuthApiService extends BaseApi {
    protected readonly basePath = '/auth'

    async login(credentials: LoginForm): Promise<AuthTokens> {
        return this.post('/login', credentials)
    }

    async registerTenant(request: RegisterTenantRequest): Promise<AuthTokens> {
        return this.post('/register', request)
    }

    async registerInvitedUser(request: RegisterInvitedUserRequest): Promise<AuthTokens> {
        return this.post('/register-invited-user', request)
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

class PublicUserInvitationsApiService extends BaseApi {
    protected readonly basePath = '/public/user-invitations'

    async preview(token: string): Promise<UserInvitationPreviewResponse> {
        return this.get('/preview', { token })
    }
}

export const publicUserInvitationsApi = new PublicUserInvitationsApiService()
