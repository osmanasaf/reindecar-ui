import { RentalStatus, VehicleStatus, PaymentStatus, PaymentMethod } from '@/types/enums'
import { ReceivableStatus, PayableStatus, ClaimStatus } from '@/types/accounting'
import { PenaltyStatus } from '@/types/enums'

export interface StatusStyle {
  label: string
  variant: string
  dot: string
}

const VEHICLE_STATUS_STYLE: Record<VehicleStatus, StatusStyle> = {
  [VehicleStatus.AVAILABLE]: { label: 'Müsait', variant: 'available', dot: 'success' },
  [VehicleStatus.RESERVED]: { label: 'Rezerve', variant: 'reserved', dot: 'muted' },
  [VehicleStatus.RENTED]: { label: 'Kirada', variant: 'rented', dot: 'accent' },
  [VehicleStatus.MAINTENANCE]: { label: 'Bakımda', variant: 'maintenance', dot: 'warning' },
  [VehicleStatus.DAMAGED]: { label: 'Hasarlı', variant: 'damaged', dot: 'danger' },
  [VehicleStatus.INACTIVE]: { label: 'Pasif', variant: 'draft', dot: 'muted' },
  [VehicleStatus.SOLD]: { label: 'Satıldı', variant: 'draft', dot: 'muted' },
}

const RENTAL_STATUS_STYLE: Record<RentalStatus, StatusStyle> = {
  [RentalStatus.DRAFT]: { label: 'Taslak', variant: 'draft', dot: 'muted' },
  [RentalStatus.RESERVED]: { label: 'Rezerve', variant: 'reserved', dot: 'accent' },
  [RentalStatus.ACTIVE]: { label: 'Aktif', variant: 'rented', dot: 'success' },
  [RentalStatus.OVERDUE]: { label: 'Gecikmiş', variant: 'damaged', dot: 'danger' },
  [RentalStatus.RETURN_PENDING]: { label: 'İade bekliyor', variant: 'maintenance', dot: 'warning' },
  [RentalStatus.PENDING_PAYMENT]: { label: 'Ödeme bekleniyor', variant: 'maintenance', dot: 'warning' },
  [RentalStatus.CLOSED]: { label: 'Tamamlandı', variant: 'draft', dot: 'muted' },
  [RentalStatus.CANCELLED]: { label: 'İptal', variant: 'draft', dot: 'muted' },
}

const PAYMENT_STATUS_STYLE: Record<PaymentStatus, StatusStyle> = {
  [PaymentStatus.PENDING]: { label: 'Beklemede', variant: 'maintenance', dot: 'warning' },
  [PaymentStatus.COMPLETED]: { label: 'Tahsil edildi', variant: 'available', dot: 'success' },
  [PaymentStatus.FAILED]: { label: 'Başarısız', variant: 'damaged', dot: 'danger' },
  [PaymentStatus.REFUNDED]: { label: 'İade edildi', variant: 'draft', dot: 'muted' },
}

const RECEIVABLE_STATUS_STYLE: Record<ReceivableStatus, StatusStyle> = {
  [ReceivableStatus.PENDING]: { label: 'Beklemede', variant: 'maintenance', dot: 'warning' },
  [ReceivableStatus.PARTIAL_PAID]: { label: 'Kısmi ödendi', variant: 'reserved', dot: 'accent' },
  [ReceivableStatus.FULLY_PAID]: { label: 'Tamamen ödendi', variant: 'available', dot: 'success' },
  [ReceivableStatus.OVERDUE]: { label: 'Vadesi geçmiş', variant: 'damaged', dot: 'danger' },
  [ReceivableStatus.CANCELLED]: { label: 'İptal edildi', variant: 'draft', dot: 'muted' },
  [ReceivableStatus.WRITTEN_OFF]: { label: 'Şüpheli alacak', variant: 'draft', dot: 'muted' },
}

const PAYABLE_STATUS_STYLE: Record<PayableStatus, StatusStyle> = {
  [PayableStatus.PENDING]: { label: 'Beklemede', variant: 'maintenance', dot: 'warning' },
  [PayableStatus.PARTIAL_PAID]: { label: 'Kısmi ödendi', variant: 'reserved', dot: 'accent' },
  [PayableStatus.FULLY_PAID]: { label: 'Tamamen ödendi', variant: 'available', dot: 'success' },
  [PayableStatus.OVERDUE]: { label: 'Vadesi geçmiş', variant: 'damaged', dot: 'danger' },
  [PayableStatus.CANCELLED]: { label: 'İptal edildi', variant: 'draft', dot: 'muted' },
  [PayableStatus.WRITTEN_OFF]: { label: 'Şüpheli', variant: 'draft', dot: 'muted' },
}

const CLAIM_STATUS_STYLE: Record<ClaimStatus, StatusStyle> = {
  [ClaimStatus.DRAFT]: { label: 'Taslak', variant: 'draft', dot: 'muted' },
  [ClaimStatus.SUBMITTED]: { label: 'Gönderildi', variant: 'reserved', dot: 'accent' },
  [ClaimStatus.UNDER_REVIEW]: { label: 'İncelemede', variant: 'maintenance', dot: 'warning' },
  [ClaimStatus.APPROVED]: { label: 'Onaylandı', variant: 'available', dot: 'success' },
  [ClaimStatus.REJECTED]: { label: 'Reddedildi', variant: 'damaged', dot: 'danger' },
  [ClaimStatus.PARTIAL_PAID]: { label: 'Kısmi ödendi', variant: 'reserved', dot: 'accent' },
  [ClaimStatus.FULLY_PAID]: { label: 'Tamamen ödendi', variant: 'available', dot: 'success' },
}

const PENALTY_STATUS_STYLE: Record<PenaltyStatus, StatusStyle> = {
  [PenaltyStatus.PENDING]: { label: 'Beklemede', variant: 'draft', dot: 'muted' },
  [PenaltyStatus.NOTIFIED]: { label: 'Bildirildi', variant: 'maintenance', dot: 'warning' },
  [PenaltyStatus.DISPUTED]: { label: 'İtiraz', variant: 'reserved', dot: 'accent' },
  [PenaltyStatus.PAID_BY_CUSTOMER]: { label: 'Müşteri ödedi', variant: 'available', dot: 'success' },
  [PenaltyStatus.PAID_BY_COMPANY]: { label: 'Şirket ödedi', variant: 'available', dot: 'success' },
  [PenaltyStatus.CANCELLED]: { label: 'İptal', variant: 'draft', dot: 'muted' },
  [PenaltyStatus.WRITTEN_OFF]: { label: 'Silindi', variant: 'draft', dot: 'muted' },
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Nakit',
  [PaymentMethod.CREDIT_CARD]: 'Kredi kartı',
  [PaymentMethod.DEBIT_CARD]: 'Banka kartı',
  [PaymentMethod.BANK_TRANSFER]: 'Havale/EFT',
  [PaymentMethod.ONLINE]: 'Online',
}

/** Prototip / mock veride kullanılan lowercase araç anahtarları */
const LEGACY_VEHICLE_KEY: Record<string, VehicleStatus> = {
  available: VehicleStatus.AVAILABLE,
  rented: VehicleStatus.RENTED,
  reserved: VehicleStatus.RESERVED,
  maintenance: VehicleStatus.MAINTENANCE,
  damaged: VehicleStatus.DAMAGED,
}

/** Enum dışı prototip anahtarları */
const LEGACY_EXTRA: Record<string, StatusStyle> = {
  completed: { label: 'Tamamlandı', variant: 'draft', dot: 'muted' },
  draft: { label: 'Taslak', variant: 'draft', dot: 'muted' },
  PENDING: { label: 'Beklemede', variant: 'maintenance', dot: 'warning' },
  USED: { label: 'Kullanıldı', variant: 'available', dot: 'success' },
  CANCELLED: { label: 'İptal edildi', variant: 'draft', dot: 'muted' },
  EXPIRED: { label: 'Süresi doldu', variant: 'draft', dot: 'muted' },
  ADMIN: { label: 'Yönetici', variant: 'reserved', dot: 'accent' },
  MANAGER: { label: 'Şube müdürü', variant: 'maintenance', dot: 'warning' },
  OPERATOR: { label: 'Operatör', variant: 'draft', dot: 'muted' },
}

const VEHICLE_ENUM_VALUES = new Set<string>(Object.values(VehicleStatus))
const RENTAL_ENUM_VALUES = new Set<string>(Object.values(RentalStatus))
const PAYMENT_ENUM_VALUES = new Set<string>(Object.values(PaymentStatus))
const RECEIVABLE_ENUM_VALUES = new Set<string>(Object.values(ReceivableStatus))
const PAYABLE_ENUM_VALUES = new Set<string>(Object.values(PayableStatus))
const CLAIM_ENUM_VALUES = new Set<string>(Object.values(ClaimStatus))
const PENALTY_ENUM_VALUES = new Set<string>(Object.values(PenaltyStatus))

const FALLBACK_STYLE: StatusStyle = { label: '', variant: 'draft', dot: 'muted' }

function buildFlatMaps() {
  const tr: Record<string, string> = {}
  const variant: Record<string, string> = {}
  const dot: Record<string, string> = {}

  for (const [key, style] of Object.entries(VEHICLE_STATUS_STYLE)) {
    tr[key] = style.label
    variant[key] = style.variant
    dot[key] = style.dot
  }
  for (const [key, style] of Object.entries(RENTAL_STATUS_STYLE)) {
    tr[key] = style.label
    variant[key] = style.variant
    dot[key] = style.dot
  }
  for (const [legacy, vehicleKey] of Object.entries(LEGACY_VEHICLE_KEY)) {
    const style = VEHICLE_STATUS_STYLE[vehicleKey]
    tr[legacy] = style.label
    variant[legacy] = style.variant
    dot[legacy] = style.dot
  }
  for (const [key, style] of Object.entries(PAYMENT_STATUS_STYLE)) {
    tr[key] = style.label
    variant[key] = style.variant
    dot[key] = style.dot
  }
  for (const [key, style] of Object.entries(RECEIVABLE_STATUS_STYLE)) {
    tr[key] = style.label
    variant[key] = style.variant
    dot[key] = style.dot
  }
  for (const [key, style] of Object.entries(PAYABLE_STATUS_STYLE)) {
    tr[key] = style.label
    variant[key] = style.variant
    dot[key] = style.dot
  }
  for (const [key, style] of Object.entries(CLAIM_STATUS_STYLE)) {
    tr[key] = style.label
    variant[key] = style.variant
    dot[key] = style.dot
  }
  for (const [key, style] of Object.entries(PENALTY_STATUS_STYLE)) {
    tr[key] = style.label
    variant[key] = style.variant
    dot[key] = style.dot
  }
  for (const [key, label] of Object.entries(PAYMENT_METHOD_LABELS)) {
    tr[key] = label
  }
  for (const [legacy, style] of Object.entries(LEGACY_EXTRA)) {
    tr[legacy] = style.label
    variant[legacy] = style.variant
    dot[legacy] = style.dot
  }

  return { tr, variant, dot }
}

const flat = buildFlatMaps()

/** Geriye dönük: doğrudan map erişimi */
export const STATUS_TR = flat.tr
export const STATUS_VARIANT = flat.variant
export const STATUS_DOT = flat.dot

/**
 * API enum (UPPERCASE), prototip lowercase veya bilinmeyen değer → görsel stil.
 */
export function resolveStatus(status: string): StatusStyle & { key: string } {
  if (!status) {
    return { key: '', ...FALLBACK_STYLE, label: '—' }
  }

  if (LEGACY_EXTRA[status]) {
    return { key: status, ...LEGACY_EXTRA[status] }
  }

  if (LEGACY_VEHICLE_KEY[status]) {
    const style = VEHICLE_STATUS_STYLE[LEGACY_VEHICLE_KEY[status]]
    return { key: status, ...style }
  }

  if (VEHICLE_ENUM_VALUES.has(status)) {
    const style = VEHICLE_STATUS_STYLE[status as VehicleStatus]
    return { key: status, ...style }
  }

  if (RENTAL_ENUM_VALUES.has(status)) {
    const style = RENTAL_STATUS_STYLE[status as RentalStatus]
    return { key: status, ...style }
  }

  if (PAYMENT_ENUM_VALUES.has(status)) {
    const style = PAYMENT_STATUS_STYLE[status as PaymentStatus]
    return { key: status, ...style }
  }

  if (RECEIVABLE_ENUM_VALUES.has(status)) {
    const style = RECEIVABLE_STATUS_STYLE[status as ReceivableStatus]
    return { key: status, ...style }
  }

  if (PAYABLE_ENUM_VALUES.has(status)) {
    const style = PAYABLE_STATUS_STYLE[status as PayableStatus]
    return { key: status, ...style }
  }

  if (CLAIM_ENUM_VALUES.has(status)) {
    const style = CLAIM_STATUS_STYLE[status as ClaimStatus]
    return { key: status, ...style }
  }

  if (PENALTY_ENUM_VALUES.has(status)) {
    const style = PENALTY_STATUS_STYLE[status as PenaltyStatus]
    return { key: status, ...style }
  }

  const lower = status.toLowerCase()
  if (LEGACY_VEHICLE_KEY[lower]) {
    const style = VEHICLE_STATUS_STYLE[LEGACY_VEHICLE_KEY[lower]]
    return { key: status, ...style }
  }

  return {
    key: status,
    label: STATUS_TR[status] ?? status,
    variant: STATUS_VARIANT[status] ?? 'draft',
    dot: STATUS_DOT[status] ?? 'muted',
  }
}

/** Ödeme yöntemi enum → Türkçe etiket */
export function resolvePaymentMethod(method: string): string {
  if (!method) return '—'
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? STATUS_TR[method] ?? method
}
