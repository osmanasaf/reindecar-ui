export type FeatureCategory =
    | 'CONTRACTS'
    | 'SERVICE'
    | 'INTEGRATION'
    | 'FLEET'
    | 'RENTAL'
    | 'CUSTOMER'
    | 'PAYMENT'

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
    | 'OPEN_ENDED_RENTAL'
    | 'RENTAL_FUEL_TRACKING'
    | 'MANUAL_BIRTH_DATE_EDIT'
    | 'FINDEKS_INTEGRATION'
    | 'PAYMENT_PROVISION'
    | 'KABIS_HGS_PENALTY_SYNC'
    | 'UETDS_API'

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
}

export const FEATURE_CATEGORY_ORDER: FeatureCategory[] = [
    'CONTRACTS',
    'SERVICE',
    'FLEET',
    'RENTAL',
    'CUSTOMER',
    'INTEGRATION',
    'PAYMENT',
]
