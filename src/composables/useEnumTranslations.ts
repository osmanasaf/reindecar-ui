import {
  DamageType,
  DamageSeverity,
  DamageLocation,
  MaintenanceType,
  ReceivableType,
  ReceivableStatus,
  PayableType,
  PayableStatus,
  ClaimType,
  ClaimStatus,
  ClaimDocumentType,
  InsuranceType,
  ServiceType,
  ProviderType,
  VehicleStatus,
  ViolationType,
  PenaltyStatus,
  PaymentMethod
} from '@/types'

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


  const receivableTypes: Record<ReceivableType, string> = {
    [ReceivableType.RENTAL_FEE]: 'Kiralama Ücreti',
    [ReceivableType.EXTRA_KM_FEE]: 'Ekstra KM Ücreti',
    [ReceivableType.LATE_RETURN_FEE]: 'Geç Teslim Ücreti',
    [ReceivableType.DAMAGE_FEE]: 'Hasar Bedeli',
    [ReceivableType.INSURANCE_CLAIM]: 'Sigorta Tazminatı',
    [ReceivableType.TRAFFIC_PENALTY]: 'Trafik Cezası',
    [ReceivableType.OTHER]: 'Diğer'
  }

  const receivableStatuses: Record<ReceivableStatus, string> = {
    [ReceivableStatus.PENDING]: 'Beklemede',
    [ReceivableStatus.PARTIAL_PAID]: 'Kısmi Ödendi',
    [ReceivableStatus.FULLY_PAID]: 'Tamamen Ödendi',
    [ReceivableStatus.OVERDUE]: 'Vadesi Geçmiş',
    [ReceivableStatus.CANCELLED]: 'İptal Edildi',
    [ReceivableStatus.WRITTEN_OFF]: 'Şüpheli Alacak'
  }

  const payableTypes: Record<PayableType, string> = {
    [PayableType.REPAIR_COST]: 'Onarım Maliyeti',
    [PayableType.MAINTENANCE_COST]: 'Bakım Maliyeti',
    [PayableType.PARTS_COST]: 'Parça Maliyeti',
    [PayableType.SUPPLIER_COST]: 'Tedarikçi Maliyeti',
    [PayableType.OTHER]: 'Diğer'
  }

  const payableStatuses: Record<PayableStatus, string> = {
    [PayableStatus.PENDING]: 'Beklemede',
    [PayableStatus.PARTIAL_PAID]: 'Kısmi Ödendi',
    [PayableStatus.FULLY_PAID]: 'Tamamen Ödendi',
    [PayableStatus.OVERDUE]: 'Vadesi Geçmiş',
    [PayableStatus.CANCELLED]: 'İptal Edildi'
  }

  const claimTypes: Record<ClaimType, string> = {
    [ClaimType.ACCIDENT]: 'Kaza',
    [ClaimType.THEFT]: 'Hırsızlık',
    [ClaimType.NATURAL_DISASTER]: 'Doğal Afet',
    [ClaimType.VANDALISM]: 'Vandalizm',
    [ClaimType.GLASS_DAMAGE]: 'Cam Hasarı',
    [ClaimType.OTHER]: 'Diğer'
  }

  const claimStatuses: Record<ClaimStatus, string> = {
    [ClaimStatus.DRAFT]: 'Taslak',
    [ClaimStatus.SUBMITTED]: 'Gönderildi',
    [ClaimStatus.UNDER_REVIEW]: 'İncelemede',
    [ClaimStatus.APPROVED]: 'Onaylandı',
    [ClaimStatus.REJECTED]: 'Reddedildi',
    [ClaimStatus.PARTIAL_PAID]: 'Kısmi Ödendi',
    [ClaimStatus.FULLY_PAID]: 'Tamamen Ödendi'
  }

  const serviceTypes: Record<ServiceType, string> = {
    [ServiceType.REPAIR]: 'Onarım',
    [ServiceType.PAINT]: 'Boya',
    [ServiceType.BODY_WORK]: 'Kaporta',
    [ServiceType.TIRE]: 'Lastik',
    [ServiceType.OIL_CHANGE]: 'Yağ Değişimi',
    [ServiceType.ELECTRICAL]: 'Elektrik',
    [ServiceType.GLASS]: 'Cam',
    [ServiceType.INSURANCE]: 'Sigorta',
    [ServiceType.OTHER]: 'Diğer'
  }

  const providerTypes: Record<ProviderType, string> = {
    [ProviderType.REPAIR_SHOP]: 'Tamir Servisi',
    [ProviderType.MAINTENANCE_CENTER]: 'Bakım Merkezi',
    [ProviderType.PARTS_SUPPLIER]: 'Yedek Parça Tedarikçisi',
    [ProviderType.INSURANCE_COMPANY]: 'Sigorta Şirketi',
    [ProviderType.TOWING_SERVICE]: 'Çekici Hizmeti',
    [ProviderType.CLEANING_SERVICE]: 'Temizlik Hizmeti',
    [ProviderType.INSPECTION_CENTER]: 'Muayene İstasyonu',
    [ProviderType.OTHER]: 'Diğer'
  }

  const insuranceTypes: Record<InsuranceType, string> = {
    [InsuranceType.KASKO]: 'Kasko',
    [InsuranceType.TRAFFIC]: 'Trafik Sigortası',
    [InsuranceType.THIRD_PARTY]: 'İhtiyari Mali Mesuliyet',
    [InsuranceType.OCCUPANT]: 'Ferdi Kaza / Yolcu',
    [InsuranceType.OTHER]: 'Diğer'
  }

  const documentTypes: Record<ClaimDocumentType, string> = {
    [ClaimDocumentType.DAMAGE_PHOTO]: 'Hasar Fotoğrafı',
    [ClaimDocumentType.ACCIDENT_REPORT]: 'Kaza Raporu',
    [ClaimDocumentType.POLICE_REPORT]: 'Polis Raporu',
    [ClaimDocumentType.REPAIR_ESTIMATE]: 'Tamir Teklifi',
    [ClaimDocumentType.INVOICE]: 'Fatura',
    [ClaimDocumentType.OTHER]: 'Diğer'
  }

  const violationTypes: Record<ViolationType, string> = {
    [ViolationType.SPEED]: 'Hız İhlali',
    [ViolationType.RED_LIGHT]: 'Kırmızı Işık',
    [ViolationType.PARKING]: 'Park İhlali',
    [ViolationType.SEAT_BELT]: 'Emniyet Kemeri',
    [ViolationType.PHONE_USAGE]: 'Telefon Kullanımı',
    [ViolationType.HGS_OGS]: 'HGS/OGS Geçiş',
    [ViolationType.BRIDGE_TOLL]: 'Köprü Geçiş Ücreti',
    [ViolationType.HIGHWAY_TOLL]: 'Otoyol Geçiş Ücreti',
    [ViolationType.OTHER]: 'Diğer'
  }

  const penaltyStatuses: Record<PenaltyStatus, string> = {
    [PenaltyStatus.PENDING]: 'Beklemede',
    [PenaltyStatus.NOTIFIED]: 'Müşteriye Bildirildi',
    [PenaltyStatus.DISPUTED]: 'İtiraz Edildi',
    [PenaltyStatus.PAID_BY_CUSTOMER]: 'Müşteri Ödedi',
    [PenaltyStatus.PAID_BY_COMPANY]: 'Şirket Ödedi',
    [PenaltyStatus.CANCELLED]: 'İptal Edildi',
    [PenaltyStatus.WRITTEN_OFF]: 'Tahsil Edilemedi'
  }

  const paymentMethods: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Nakit',
    [PaymentMethod.CREDIT_CARD]: 'Kredi Kartı',
    [PaymentMethod.BANK_TRANSFER]: 'Havale/EFT',
    [PaymentMethod.DEBIT_CARD]: 'Banka Kartı',
    [PaymentMethod.ONLINE]: 'Online Ödeme'
  }

  const vehicleStatuses: Record<VehicleStatus, string> = {
    [VehicleStatus.AVAILABLE]: 'Müsait',
    [VehicleStatus.RESERVED]: 'Rezerve',
    [VehicleStatus.RENTED]: 'Kirada',
    [VehicleStatus.MAINTENANCE]: 'Bakımda',
    [VehicleStatus.DAMAGED]: 'Hasarlı',
    [VehicleStatus.INACTIVE]: 'Pasif',
    [VehicleStatus.SOLD]: 'Satıldı'
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

  const translateReceivableType = (type: string): string => {
    return receivableTypes[type as ReceivableType] || type
  }

  const translateReceivableStatus = (status: string): string => {
    return receivableStatuses[status as ReceivableStatus] || status
  }

  const translatePayableType = (type: string): string => {
    return payableTypes[type as PayableType] || type
  }

  const translatePayableStatus = (status: string): string => {
    return payableStatuses[status as PayableStatus] || status
  }

  const translateClaimType = (type: string): string => {
    return claimTypes[type as ClaimType] || type
  }

  const translateClaimStatus = (status: string): string => {
    return claimStatuses[status as ClaimStatus] || status
  }

  const translateServiceType = (type: string): string => {
    return serviceTypes[type as ServiceType] || type
  }

  const translateProviderType = (type: string): string => {
    return providerTypes[type as ProviderType] || type
  }

  const translateVehicleStatus = (status: string | undefined | null): string => {
    if (!status) return 'Bilinmiyor'
    return vehicleStatuses[status as VehicleStatus] || status
  }

  const translateInsuranceType = (type: string): string => {
    return insuranceTypes[type as InsuranceType] || type
  }

  const translateDocumentType = (type: string): string => {
    return documentTypes[type as ClaimDocumentType] || type
  }

  const translateViolationType = (type: string): string => {
    return violationTypes[type as ViolationType] || type
  }

  const translatePenaltyStatus = (status: string): string => {
    return penaltyStatuses[status as PenaltyStatus] || status
  }

  const translatePaymentMethod = (method: string): string => {
    return paymentMethods[method as PaymentMethod] || method
  }

  return {
    translateDamageType,
    translateSeverity,
    translateDamageLocation,
    translateMaintenanceType,
    translateReceivableType,
    translateReceivableStatus,
    translatePayableType,
    translatePayableStatus,
    translateClaimType,
    translateClaimStatus,
    translateServiceType,
    translateProviderType,
    translateVehicleStatus,
    translateInsuranceType,
    translateDocumentType,
    translateViolationType,
    translatePenaltyStatus,
    translatePaymentMethod,
    damageTypes,
    damageSeverities,
    damageLocations,
    maintenanceTypes,
    receivableTypes,
    receivableStatuses,
    payableTypes,
    payableStatuses,
    claimTypes,
    claimStatuses,
    serviceTypes,
    providerTypes,
    insuranceTypes,
    documentTypes,
    violationTypes,
    penaltyStatuses,
    paymentMethods,
    vehicleStatuses
  }
}
