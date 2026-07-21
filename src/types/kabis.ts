export type KabisNotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'ACKED'

export type KabisNotificationType = 'DELIVERY' | 'RETURN' | 'UPDATE' | 'CANCEL'

export const KABIS_TYPE_LABELS: Record<KabisNotificationType, string> = {
    DELIVERY: 'Teslim',
    RETURN: 'İade',
    UPDATE: 'Güncelleme',
    CANCEL: 'İptal',
}

export function kabisTypeLabel(type: string): string {
    return KABIS_TYPE_LABELS[type as KabisNotificationType] ?? type
}

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

export interface KabisNotificationStats {
    total: number
    pending: number
    sent: number
    acked: number
    failed: number
}

export interface KabisBulkRetryResponse {
    requested: number
    retried: number
    skipped: number
}
