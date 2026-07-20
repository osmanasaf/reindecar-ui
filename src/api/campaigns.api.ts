import { BaseApi } from './client'
import type { CampaignResponse, CreateCampaignRequest } from '@/types/campaign'

class CampaignsApiService extends BaseApi {
    protected readonly basePath = '/campaigns'

    async findAll(): Promise<CampaignResponse[]> {
        return this.get('')
    }

    async findActive(): Promise<CampaignResponse[]> {
        return this.get('/active')
    }

    async findActiveToday(): Promise<CampaignResponse[]> {
        return this.get('/active/today')
    }

    async findById(id: number): Promise<CampaignResponse> {
        return this.get(`/${id}`)
    }

    async create(request: CreateCampaignRequest): Promise<CampaignResponse> {
        return this.post('', request)
    }

    async activate(id: number): Promise<void> {
        return this.post(`/${id}/activate`)
    }

    async deactivate(id: number): Promise<void> {
        return this.post(`/${id}/deactivate`)
    }

    async remove(id: number): Promise<void> {
        return this.deleteByPath(`/${id}`)
    }
}

export const campaignsApi = new CampaignsApiService()
