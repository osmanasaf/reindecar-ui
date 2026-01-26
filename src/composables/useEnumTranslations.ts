import { DamageType, DamageSeverity, DamageLocation, MaintenanceType } from '@/types'

export function useEnumTranslations() {
  const damageTypes: Record<DamageType, string> = {
    [DamageType.SCRATCH]: 'Çizik',
    [DamageType.DENT]: 'Göçük',
    [DamageType.CRACK]: 'Çatlak',
    [DamageType.BROKEN_GLASS]: 'Kırık Cam',
    [DamageType.TIRE_DAMAGE]: 'Lastik Hasarı',
    [DamageType.INTERIOR_DAMAGE]: 'İç Mekan Hasarı',
    [DamageType.ENGINE_DAMAGE]: 'Motor Hasarı',
    [DamageType.ELECTRICAL]: 'Elektrik Arızası',
    [DamageType.ACCIDENT]: 'Kaza',
    [DamageType.OTHER]: 'Diğer'
  }

  const damageSeverities: Record<DamageSeverity, string> = {
    [DamageSeverity.MINOR]: 'Küçük',
    [DamageSeverity.MODERATE]: 'Orta',
    [DamageSeverity.MAJOR]: 'Büyük',
    [DamageSeverity.CRITICAL]: 'Kritik'
  }

  const damageLocations: Record<DamageLocation, string> = {
    [DamageLocation.FRONT_BUMPER]: 'Ön Tampon',
    [DamageLocation.REAR_BUMPER]: 'Arka Tampon',
    [DamageLocation.HOOD]: 'Kaput',
    [DamageLocation.TRUNK]: 'Bagaj',
    [DamageLocation.ROOF]: 'Tavan',
    [DamageLocation.FRONT_LEFT_FENDER]: 'Sol Ön Çamurluk',
    [DamageLocation.FRONT_RIGHT_FENDER]: 'Sağ Ön Çamurluk',
    [DamageLocation.REAR_LEFT_FENDER]: 'Sol Arka Çamurluk',
    [DamageLocation.REAR_RIGHT_FENDER]: 'Sağ Arka Çamurluk',
    [DamageLocation.LEFT_FRONT_DOOR]: 'Sol Ön Kapı',
    [DamageLocation.LEFT_REAR_DOOR]: 'Sol Arka Kapı',
    [DamageLocation.RIGHT_FRONT_DOOR]: 'Sağ Ön Kapı',
    [DamageLocation.RIGHT_REAR_DOOR]: 'Sağ Arka Kapı',
    [DamageLocation.WINDSHIELD]: 'Ön Cam',
    [DamageLocation.REAR_WINDOW]: 'Arka Cam',
    [DamageLocation.LEFT_MIRROR]: 'Sol Ayna',
    [DamageLocation.RIGHT_MIRROR]: 'Sağ Ayna',
    [DamageLocation.INTERIOR]: 'İç Mekan',
    [DamageLocation.WHEEL_FRONT_LEFT]: 'Sol Ön Tekerlek',
    [DamageLocation.WHEEL_FRONT_RIGHT]: 'Sağ Ön Tekerlek',
    [DamageLocation.WHEEL_REAR_LEFT]: 'Sol Arka Tekerlek',
    [DamageLocation.WHEEL_REAR_RIGHT]: 'Sağ Arka Tekerlek'
  }

  const maintenanceTypes: Record<MaintenanceType, string> = {
    [MaintenanceType.REPAIR]: 'Tamir',
    [MaintenanceType.PAINT]: 'Boyama',
    [MaintenanceType.PART_REPLACEMENT]: 'Parça Değişimi',
    [MaintenanceType.SERVICE]: 'Servis Bakımı',
    [MaintenanceType.INSPECTION]: 'Muayene',
    [MaintenanceType.TIRE_CHANGE]: 'Lastik Değişimi',
    [MaintenanceType.OIL_CHANGE]: 'Yağ Değişimi',
    [MaintenanceType.FILTER_CHANGE]: 'Filtre Değişimi',
    [MaintenanceType.BRAKE_SERVICE]: 'Fren Servisi',
    [MaintenanceType.ELECTRICAL_REPAIR]: 'Elektrik Tamiri',
    [MaintenanceType.BODY_WORK]: 'Kaporta İşi',
    [MaintenanceType.OTHER]: 'Diğer'
  }

  const translateDamageType = (type: string): string => {
    return damageTypes[type as DamageType] || type
  }

  const translateSeverity = (severity: string): string => {
    return damageSeverities[severity as DamageSeverity] || severity
  }

  const translateDamageLocation = (location: string): string => {
    return damageLocations[location as DamageLocation] || location
  }

  const translateMaintenanceType = (type: string): string => {
    return maintenanceTypes[type as MaintenanceType] || type
  }

  return {
    translateDamageType,
    translateSeverity,
    translateDamageLocation,
    translateMaintenanceType,
    damageTypes,
    damageSeverities,
    damageLocations,
    maintenanceTypes
  }
}
