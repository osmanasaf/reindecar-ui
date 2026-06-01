import { BaseApi } from './client'
import type { PaginatedResponse, PaginationParams } from '@/types'
import type { NotificationCountResponse, NotificationResponse } from '@/types/notification'

class NotificationsApiService extends BaseApi {
    protected readonly basePath = '/notifications'

    async getCount(): Promise<NotificationCountResponse> {
        return this.get('/count')
    }

    async getPage(params?: PaginationParams): Promise<PaginatedResponse<NotificationResponse>> {
        return this.getList('', params)
    }

    async getUnread(): Promise<NotificationResponse[]> {
        return this.get('/unread')
    }

    async markAsRead(id: number): Promise<void> {
        await this.patch(`/${id}/read`)
    }

    async dismiss(id: number): Promise<void> {
        await this.patch(`/${id}/dismiss`)
    }

    async markAllAsRead(): Promise<number> {
        return this.post('/mark-all-read')
    }
}

export const notificationsApi = new NotificationsApiService()
