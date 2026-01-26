import { DamageLocation, DamageSeverity, MaintenanceType } from '@/types'

export const ZONE_LOCATION_MAP: Record<number, DamageLocation[]> = {
  1: [DamageLocation.FRONT_BUMPER, DamageLocation.FRONT_RIGHT_FENDER, DamageLocation.WHEEL_FRONT_RIGHT],
  2: [DamageLocation.WINDSHIELD],
  3: [DamageLocation.HOOD],
  4: [DamageLocation.FRONT_LEFT_FENDER, DamageLocation.WHEEL_FRONT_LEFT],
  6: [DamageLocation.LEFT_FRONT_DOOR, DamageLocation.LEFT_REAR_DOOR, DamageLocation.LEFT_MIRROR],
  7: [DamageLocation.WHEEL_REAR_LEFT],
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
  1: 'Sağ Ön Köşe',
  2: 'Ön Cam',
  3: 'Kaput',
  4: 'Sol Ön Köşe',
  6: 'Sol Kapılar',
  7: 'Arka Sol Tekerlek',
  8: 'Bagaj',
  9: 'Arka Cam',
  10: 'Sağ Arka Köşe',
  12: 'Sağ Kapılar',
  13: 'İç Mekan/Tavan'
}
