import { RentalType } from '@/types/enums'

const DAYS_PER_WEEK = 7
const DAYS_PER_MONTH = 30

export function calculateTotalIncludedKm(
  rentalType: RentalType,
  perPeriodKm: number,
  totalDays: number,
): number {
  const days = Math.max(1, totalDays)
  switch (rentalType) {
    case RentalType.DAILY:
      return perPeriodKm * days
    case RentalType.WEEKLY:
      return Math.round((perPeriodKm * days) / DAYS_PER_WEEK)
    case RentalType.MONTHLY:
    case RentalType.SERVICE:
      return Math.round((perPeriodKm * days) / DAYS_PER_MONTH)
    default:
      return perPeriodKm
  }
}

export function getKmPeriodLabel(rentalType: RentalType): string {
  switch (rentalType) {
    case RentalType.DAILY:
      return '/gün'
    case RentalType.WEEKLY:
      return '/hafta'
    case RentalType.MONTHLY:
    case RentalType.SERVICE:
      return '/ay'
    default:
      return ''
  }
}

export function resolveEffectiveIncludedKm(options: {
  customIncludedKm?: number | null
  perPeriodKm?: number | null
  totalIncludedKm?: number | null
  rentalType: RentalType
  totalDays: number
}): number {
  if (options.customIncludedKm != null && options.customIncludedKm > 0) {
    return options.customIncludedKm
  }
  if (options.totalIncludedKm != null && options.totalIncludedKm > 0) {
    return options.totalIncludedKm
  }
  if (options.perPeriodKm != null && options.perPeriodKm > 0) {
    return calculateTotalIncludedKm(options.rentalType, options.perPeriodKm, options.totalDays)
  }
  return 0
}

export function formatIncludedKmDisplay(
  rentalType: RentalType,
  perPeriodKm: number,
  totalDays: number,
  unlimited = false,
): string {
  if (unlimited) {
    return 'Sınırsız KM'
  }
  const periodLabel = getKmPeriodLabel(rentalType)
  const totalKm = calculateTotalIncludedKm(rentalType, perPeriodKm, totalDays)
  if (totalDays > 0 && periodLabel) {
    return `${totalKm.toLocaleString('tr-TR')} km (${perPeriodKm.toLocaleString('tr-TR')} km${periodLabel})`
  }
  return `${perPeriodKm.toLocaleString('tr-TR')} km${periodLabel}`
}
