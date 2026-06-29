import { BaseApi } from './client'
import type { PaginatedResponse, PaginationParams } from '@/types'
import type { KabisNotification, KabisNotificationStatus } from '@/types/kabis'

class KabisApiService extends BaseApi {
    protected readonly basePath = '/kabis/notifications'

    async list(params?: PaginationParams & { status?: KabisNotificationStatus }): Promise<PaginatedResponse<KabisNotification>> {
        return this.getList('', params)
    }

    async getById(id: number): Promise<KabisNotification> {
        return this.get(`/${id}`)
    }

    async listByRental(rentalId: number): Promise<KabisNotification[]> {
        return this.get(`/rental/${rentalId}`)
    }

    async retry(id: number): Promise<KabisNotification> {
        return this.post(`/${id}/retry`)
    }
}

export const kabisApi = new KabisApiService()
