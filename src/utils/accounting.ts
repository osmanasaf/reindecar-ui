import type { 
  ReceivableType,
  ReceivableStatus,
  PayableType,
  PayableStatus,
  ClaimType,
  ClaimStatus,
  ServiceType
} from '@/types'

export const getReceivableStatusColor = (status: ReceivableStatus): string => {
  const colors: Record<ReceivableStatus, string> = {
    PENDING: 'orange',
    PARTIAL_PAID: 'blue',
    FULLY_PAID: 'green',
    OVERDUE: 'red',
    CANCELLED: 'gray',
    WRITTEN_OFF: 'darkred'
  }
  return colors[status] || 'gray'
}

export const getPayableStatusColor = (status: PayableStatus): string => {
  const colors: Record<PayableStatus, string> = {
    PENDING: 'orange',
    PARTIAL_PAID: 'blue',
    FULLY_PAID: 'green',
    OVERDUE: 'red',
    CANCELLED: 'gray'
  }
  return colors[status] || 'gray'
}

export const getClaimStatusColor = (status: ClaimStatus): string => {
  const colors: Record<ClaimStatus, string> = {
    DRAFT: 'gray',
    SUBMITTED: 'blue',
    UNDER_REVIEW: 'orange',
    APPROVED: 'green',
    REJECTED: 'red',
    PARTIAL_PAID: 'teal',
    FULLY_PAID: 'darkgreen'
  }
  return colors[status] || 'gray'
}

export const getDueDateStatus = (dueDate: string): 'ok' | 'warning' | 'overdue' => {
  const today = new Date()
  const due = new Date(dueDate)
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 7) return 'warning'
  return 'ok'
}

export const getDueDateBadgeColor = (dueDate: string): string => {
  const status = getDueDateStatus(dueDate)
  const colors = {
    ok: 'green',
    warning: 'yellow',
    overdue: 'red'
  }
  return colors[status]
}

export const formatReceivableNumber = (number: string): string => {
  return number || '-'
}

export const formatPayableNumber = (number: string): string => {
  return number || '-'
}

export const formatClaimNumber = (number: string): string => {
  return number || '-'
}

export const calculatePaymentProgress = (paidAmount: number, totalAmount: number): number => {
  if (totalAmount === 0) return 0
  return Math.round((paidAmount / totalAmount) * 100)
}
