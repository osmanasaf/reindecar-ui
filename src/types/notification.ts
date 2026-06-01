export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  READ = 'READ',
  DISMISSED = 'DISMISSED',
  FAILED = 'FAILED',
}

export enum NotificationType {
  KM_LIMIT_EXCEEDED = 'KM_LIMIT_EXCEEDED',
  KM_LIMIT_APPROACHING = 'KM_LIMIT_APPROACHING',
  HGS_BALANCE_LOW = 'HGS_BALANCE_LOW',
  INSPECTION_DUE = 'INSPECTION_DUE',
  INSURANCE_EXPIRING = 'INSURANCE_EXPIRING',
  SERVICE_DUE = 'SERVICE_DUE',
  TIRE_CHANGE_DUE = 'TIRE_CHANGE_DUE',
  MTV_DUE = 'MTV_DUE',
  RENTAL_ENDING_SOON = 'RENTAL_ENDING_SOON',
  RENTAL_OVERDUE = 'RENTAL_OVERDUE',
  CONTRACT_EXPIRING = 'CONTRACT_EXPIRING',
  PAYMENT_DUE = 'PAYMENT_DUE',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}

export interface NotificationResponse {
  id: number
  type: NotificationType | string
  priority: string
  status: NotificationStatus | string
  title: string
  message: string
  referenceType: string | null
  referenceId: number | null
  readAt: string | null
  createdAt: string
  isRead: boolean
  isUrgent: boolean
}

export interface NotificationCountResponse {
  total: number
  unread: number
  urgent: number
}
