import { BaseApi } from './client'

export interface TenantSettings {
    name: string
    contactEmail: string | null
    contactPhone: string | null
    taxNumber: string | null
    logoUrl: string | null
    defaultCurrency: string
}

export interface UpdateTenantSettingsPayload {
    name?: string
    contactEmail?: string
    contactPhone?: string
    taxNumber?: string
    defaultCurrency: string
}

class TenantSettingsApiService extends BaseApi {
    protected readonly basePath = '/tenant/settings'

    async getSettings(): Promise<TenantSettings> {
        return this.get('')
    }

    async updateSettings(settings: UpdateTenantSettingsPayload): Promise<TenantSettings> {
        return this.put('', settings)
    }

    async uploadLogo(file: File): Promise<string> {
        const formData = new FormData()
        formData.append('logo', file)
        return this.postFormData<string>(formData, '/logo')
    }

    async deleteLogo(): Promise<void> {
        await this.deleteByPath('/logo')
    }
}

export const tenantSettingsApi = new TenantSettingsApiService()
