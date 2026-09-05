export type FeatureCategory =
    | 'CONTRACTS'
    | 'SERVICE'
    | 'INTEGRATION'
    | 'FLEET'
    | 'RENTAL'
    | 'CUSTOMER'
    | 'PAYMENT'
    | 'INTERNAL_FLEET'

export type FeatureKey =
    | 'MODIFIABLE_CONTRACTS'
    | 'CONTRACT_PDF_EXPORT'
    | 'PRICE_OFFER_DOCUMENTS'
    | 'RENTAL_CONTRACT_DOCUMENTS'
    | 'UETDS_MANIFESTS'
    | 'UETDS_PASSENGERS'
    | 'UETDS_DOCUMENTS'
    | 'SERVICE_RENTAL_TYPE'
    | 'KABIS_NOTIFICATIONS'
    | 'VEHICLE_DAILY_LOCATION'
    | 'MAINTENANCE_REMINDERS'
    | 'MAINTENANCE_ATTACHMENTS'
    | 'VEHICLE_UTTS'
    | 'VEHICLE_PROFITABILITY'
    | 'FLEET_CALENDAR'
    | 'PERIODIC_KM_REPORTING'
    | 'OPEN_ENDED_RENTAL'
    | 'RENTAL_FUEL_TRACKING'
    | 'RENTAL_PRICING'
    | 'RENTAL_EXTRA_CHARGES'
    | 'KM_PACKAGES'
    | 'PRICING_CAMPAIGNS'
    | 'BACKDATED_RENTAL_START'
    | 'MANUAL_BIRTH_DATE_EDIT'
    | 'FINDEKS_INTEGRATION'
    | 'PAYMENT_PROVISION'
    | 'RENTAL_INVOICING'
    | 'RECEIVABLES_MODULE'
    | 'KABIS_HGS_PENALTY_SYNC'
    | 'UETDS_API'
    | 'CUSTOMER_PRICING_AGREEMENTS'
    | 'DRIVER_LICENSE_EXPIRY_ALERT'
    | 'INTERNAL_FLEET_MODE'

export interface TenantFeature {
    key: FeatureKey
    displayName: string
    description: string
    category: FeatureCategory
    enabled: boolean
    defaultEnabled: boolean
    globallyAvailable: boolean
    tenantConfigurable: boolean
}

export const FEATURE_CATEGORY_LABELS: Record<FeatureCategory, string> = {
    CONTRACTS: 'Sözleşmeler',
    SERVICE: 'Servis / Turizm',
    INTEGRATION: 'Entegrasyonlar',
    FLEET: 'Filo & Bakım',
    RENTAL: 'Kiralama',
    CUSTOMER: 'Müşteri',
    PAYMENT: 'Ödeme',
    INTERNAL_FLEET: 'Şirket İçi Filo',
}

export const FEATURE_CATEGORY_ORDER: FeatureCategory[] = [
    'INTERNAL_FLEET',
    'CONTRACTS',
    'SERVICE',
    'FLEET',
    'RENTAL',
    'CUSTOMER',
    'INTEGRATION',
    'PAYMENT',
]
