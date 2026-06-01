import type { 
  ReceivableStatus,
  PayableStatus,
  ClaimStatus,
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
    CANCELLED: 'gray',
    WRITTEN_OFF: 'darkred'
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

export interface DueAgeBadge {
  label: string
  variant: 'danger' | 'warning' | 'info'
}

export function getDueAgeBadge(
  dueDate: string | undefined,
  status: ReceivableStatus | PayableStatus
): DueAgeBadge | null {
  if (!dueDate) return null
  if (status === 'FULLY_PAID' || status === 'CANCELLED' || status === 'WRITTEN_OFF') return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - due.getTime()) / 86_400_000)

  if (diffDays > 0) return { label: `${diffDays} gün geç`, variant: 'danger' }
  if (diffDays === 0) return { label: 'vadede', variant: 'warning' }
  return { label: 'planlandı', variant: 'info' }
}

export function isReceivableOverdue(
  dueDate: string | undefined,
  status: ReceivableStatus | PayableStatus
): boolean {
  if (!dueDate) return false
  if (status === 'FULLY_PAID' || status === 'CANCELLED' || status === 'WRITTEN_OFF') return false
  const today = new Date().toISOString().split('T')[0] ?? ''
  return (today.length > 0 && dueDate < today) || status === 'OVERDUE'
}
