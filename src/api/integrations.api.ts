import { BaseApi } from './client'
import type {
    IntegrationCredential,
    IntegrationKey,
    UpsertIntegrationCredentialPayload,
} from '@/types/integration'

class IntegrationsApiService extends BaseApi {
    protected readonly basePath = '/tenant/integrations'

    async list(): Promise<IntegrationCredential[]> {
        return this.get<IntegrationCredential[]>('')
    }

    async upsert(key: IntegrationKey, payload: UpsertIntegrationCredentialPayload): Promise<IntegrationCredential> {
        return this.put<IntegrationCredential>(`/${key}`, payload)
    }

    async remove(key: IntegrationKey): Promise<void> {
        return this.deleteByPath(`/${key}`)
    }
}

export const integrationsApi = new IntegrationsApiService()
