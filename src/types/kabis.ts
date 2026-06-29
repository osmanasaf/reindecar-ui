export type KabisNotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'ACKED'

export type KabisNotificationType = 'DELIVERY' | 'RETURN' | 'UPDATE' | 'CANCEL'

export interface KabisNotification {
    id: number
    rentalId: number
    notificationType: KabisNotificationType
    status: KabisNotificationStatus
    egmReferenceNumber?: string
    attemptCount: number
    lastAttemptAt?: string
    sentAt?: string
    lastError?: string
    createdAt: string
}
