import { BaseApi } from './client'
import type { PaginatedResponse, PaginationParams } from '@/types'
import type {
    KabisBulkRetryResponse,
    KabisNotification,
    KabisNotificationStats,
    KabisNotificationStatus,
} from '@/types/kabis'

class KabisApiService extends BaseApi {
    protected readonly basePath = '/kabis/notifications'

    async list(
        params?: PaginationParams & { status?: KabisNotificationStatus; rentalId?: number },
    ): Promise<PaginatedResponse<KabisNotification>> {
        return this.getList('', params)
    }

    async stats(): Promise<KabisNotificationStats> {
        return this.get('/stats')
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

    async retryMany(ids: number[]): Promise<KabisBulkRetryResponse> {
        return this.post('/retry', { ids })
    }
}

export const kabisApi = new KabisApiService()
