import { BaseApi } from './client'

export interface TenantSettings {
    defaultCurrency: string
}

class TenantSettingsApiService extends BaseApi {
    protected readonly basePath = '/tenant/settings'

    async getSettings(): Promise<TenantSettings> {
        return this.get('')
    }

    async updateSettings(settings: TenantSettings): Promise<TenantSettings> {
        return this.put('', settings)
    }
}

export const tenantSettingsApi = new TenantSettingsApiService()
