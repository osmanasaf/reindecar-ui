export type TripStatusKey = 'upcoming' | 'ongoing' | 'done'

export interface TripStatus {
  key: TripStatusKey
  label: string
}

const TRIP_STATUS_LABELS: Record<TripStatusKey, string> = {
  upcoming: 'Yaklaşan',
  ongoing: 'Devam ediyor',
  done: 'Tamamlandı',
}

/**
 * Sefer başlangıç/bitiş zamanına göre görsel durum türetir.
 * Bitiş yoksa, başlangıç geçmişteyse sefer "devam ediyor" kabul edilir.
 */
export function resolveTripStatus(
  startAt: string | null | undefined,
  endAt?: string | null,
): TripStatus {
  const now = Date.now()
  const start = startAt ? new Date(startAt).getTime() : NaN
  const end = endAt ? new Date(endAt).getTime() : NaN

  let key: TripStatusKey = 'ongoing'
  if (!Number.isNaN(start) && now < start) {
    key = 'upcoming'
  } else if (!Number.isNaN(end) && now > end) {
    key = 'done'
  }

  return { key, label: TRIP_STATUS_LABELS[key] }
}
