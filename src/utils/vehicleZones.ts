import { DamageLocation, DamageSeverity, MaintenanceType } from '@/types'

export const ZONE_LOCATION_MAP: Record<number, DamageLocation[]> = {
  1: [DamageLocation.FRONT_RIGHT_FENDER, DamageLocation.WHEEL_FRONT_RIGHT],
  2: [DamageLocation.WINDSHIELD],
  3: [DamageLocation.FRONT_BUMPER, DamageLocation.HOOD],
  4: [DamageLocation.FRONT_LEFT_FENDER, DamageLocation.WHEEL_FRONT_LEFT],
  6: [DamageLocation.LEFT_FRONT_DOOR, DamageLocation.LEFT_REAR_DOOR, DamageLocation.LEFT_MIRROR],
  7: [DamageLocation.REAR_BUMPER, DamageLocation.REAR_LEFT_FENDER, DamageLocation.WHEEL_REAR_LEFT],
  8: [DamageLocation.TRUNK],
  9: [DamageLocation.REAR_WINDOW],
  10: [DamageLocation.REAR_RIGHT_FENDER, DamageLocation.WHEEL_REAR_RIGHT],
  12: [DamageLocation.RIGHT_FRONT_DOOR, DamageLocation.RIGHT_REAR_DOOR, DamageLocation.RIGHT_MIRROR],
  13: [DamageLocation.ROOF, DamageLocation.INTERIOR]
}

export function getZoneForLocation(location: DamageLocation): number {
  for (const [zone, locations] of Object.entries(ZONE_LOCATION_MAP)) {
    if (locations.includes(location)) {
      return Number(zone)
    }
  }
  return 13
}

export function getDefaultLocationForZone(zoneId: number): DamageLocation {
  return ZONE_LOCATION_MAP[zoneId]?.[0] ?? DamageLocation.ROOF
}

export const SEVERITY_COLORS: Record<DamageSeverity, string> = {
  [DamageSeverity.MINOR]: '#FFC107',
  [DamageSeverity.MODERATE]: '#FF9800',
  [DamageSeverity.MAJOR]: '#F44336',
  [DamageSeverity.CRITICAL]: '#B71C1C'
}

export const MAINTENANCE_COLORS: Record<MaintenanceType, string> = {
  [MaintenanceType.REPAIR]: '#2196F3',
  [MaintenanceType.PAINT]: '#9C27B0',
  [MaintenanceType.PART_REPLACEMENT]: '#00BCD4',
  [MaintenanceType.SERVICE]: '#4CAF50',
  [MaintenanceType.INSPECTION]: '#9E9E9E',
  [MaintenanceType.TIRE_CHANGE]: '#795548',
  [MaintenanceType.OIL_CHANGE]: '#FF9800',
  [MaintenanceType.FILTER_CHANGE]: '#607D8B',
  [MaintenanceType.BRAKE_SERVICE]: '#F44336',
  [MaintenanceType.ELECTRICAL_REPAIR]: '#FFEB3B',
  [MaintenanceType.BODY_WORK]: '#3F51B5',
  [MaintenanceType.OTHER]: '#757575'
}

export const ZONE_NAMES: Record<number, string> = {
  1: 'Sağ Ön Çamurluk & Tekerlek',
  2: 'Ön Cam',
  3: 'Kaput & Ön Tampon',
  4: 'Sol Ön Çamurluk & Tekerlek',
  6: 'Sol Kapılar & Ayna',
  7: 'Arka Tampon & Sol Arka',
  8: 'Bagaj',
  9: 'Arka Cam',
  10: 'Sağ Arka Çamurluk & Tekerlek',
  12: 'Sağ Kapılar & Ayna',
  13: 'Tavan & İç Mekan'
}

/** CarDiagramSVG viewBox (0 0 240 430) pin merkezleri */
export const ZONE_PIN_CENTERS: Record<number, { x: number; y: number }> = {
  4: { x: 100, y: 62 },
  1: { x: 140, y: 62 },
  3: { x: 120, y: 116 },
  2: { x: 120, y: 162 },
  6: { x: 48, y: 245 },
  13: { x: 120, y: 244 },
  12: { x: 192, y: 245 },
  9: { x: 120, y: 320 },
  7: { x: 66, y: 376 },
  8: { x: 120, y: 380 },
  10: { x: 174, y: 376 }
}
