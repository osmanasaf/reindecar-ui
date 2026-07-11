export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED'

export interface Tenant {
    id: number
    code: string
    name: string
    status: TenantStatus
    contactEmail?: string
    contactPhone?: string
    taxNumber?: string
    subscriptionPlan?: string
    defaultCurrency?: string
}

export interface CreateTenantPayload {
    name: string
}

export interface UpdateTenantPayload {
    name?: string
    status?: TenantStatus
    defaultCurrency?: string
}
