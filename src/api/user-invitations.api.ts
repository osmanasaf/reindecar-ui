import { BaseApi } from './client'

export type UserInvitationRole = 'ADMIN' | 'OPERATOR'
export type UserInvitationStatus = 'PENDING' | 'USED' | 'CANCELLED' | 'EXPIRED'

export interface CreateUserInvitationRequest {
    email: string
    role: UserInvitationRole
    branchId?: number | null
}

export interface UserInvitationResponse {
    id: number
    email: string
    role: UserInvitationRole
    branchId: number | null
    status: UserInvitationStatus
    expiresAt: string
    usedAt: string | null
    createdAt: string
    token: string | null
    invitePath: string | null
}

class UserInvitationsApiService extends BaseApi {
    protected readonly basePath = '/user-invitations'

    async list(): Promise<UserInvitationResponse[]> {
        return this.get()
    }

    async create(request: CreateUserInvitationRequest): Promise<UserInvitationResponse> {
        return this.post('', request)
    }

    async cancel(id: number): Promise<void> {
        return this.remove(`/${id}`)
    }
}

export const userInvitationsApi = new UserInvitationsApiService()
