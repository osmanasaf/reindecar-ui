import { BaseApi } from './client'

export interface TenantSettings {
    name: string
    contactEmail: string
    contactPhone: string
    taxNumber: string
    logoUrl: string | null
    defaultCurrency: string
}

class TenantSettingsApiService extends BaseApi {
    protected readonly basePath = '/tenant/settings'

    async getSettings(): Promise<TenantSettings> {
        return this.get('')
    }

    async updateSettings(settings: Partial<TenantSettings>): Promise<TenantSettings> {
        return this.put('', settings)
    }

    async uploadLogo(file: File): Promise<string> {
        const formData = new FormData()
        formData.append('logo', file)
        return this.postFormData(formData, '/logo')
    }

    async deleteLogo(): Promise<void> {
        return this.deleteByPath('/logo')
    }
}

export const tenantSettingsApi = new TenantSettingsApiService()
