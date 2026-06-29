import { BaseApi } from './client'
import type { FeatureKey, TenantFeature } from '@/types/feature'

export interface UpdateTenantFeaturePayload {
    enabled: boolean
}

class FeaturesApiService extends BaseApi {
    protected readonly basePath = '/features'

    async listFeatures(): Promise<TenantFeature[]> {
        return this.get<TenantFeature[]>('')
    }

    async updateFeature(key: FeatureKey, payload: UpdateTenantFeaturePayload): Promise<TenantFeature> {
        return this.put<TenantFeature>(`/${key}`, payload)
    }
}

export const featuresApi = new FeaturesApiService()

class AdminTenantFeaturesApiService extends BaseApi {
    protected readonly basePath = '/admin/tenants'

    async listTenantFeatures(tenantId: number): Promise<TenantFeature[]> {
        return this.get<TenantFeature[]>(`/${tenantId}/features`)
    }

    async updateTenantFeature(
        tenantId: number,
        key: FeatureKey,
        payload: UpdateTenantFeaturePayload,
    ): Promise<TenantFeature> {
        return this.put<TenantFeature>(`/${tenantId}/features/${key}`, payload)
    }
}

export const adminTenantFeaturesApi = new AdminTenantFeaturesApiService()
