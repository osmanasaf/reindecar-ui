import type { FeatureKey } from './feature'

export type IntegrationKey = 'KABIS' | 'UETDS'

export interface IntegrationCredential {
    key: IntegrationKey
    configured: boolean
    username: string | null
    updatedAt: string | null
    updatedBy: string | null
}

export interface UpsertIntegrationCredentialPayload {
    username: string
    secret: string
}

export interface IntegrationMeta {
    title: string
    subtitle: string
    hint: string
    usernameLabel: string
    featureKey: FeatureKey
}

export const INTEGRATION_ORDER: IntegrationKey[] = ['KABIS', 'UETDS']

export const INTEGRATION_META: Record<IntegrationKey, IntegrationMeta> = {
    KABIS: {
        title: 'KABİS',
        subtitle: 'EGM Araç Kiralama Bildirim Sistemi',
        hint: 'EGM tarafından firmanıza tahsis edilen üye kodu ve şifre. Kiralama bildirimleri bu hesapla gönderilir.',
        usernameLabel: 'Üye kodu',
        featureKey: 'KABIS_NOTIFICATIONS',
    },
    UETDS: {
        title: 'UETDS',
        subtitle: 'Ulaştırma Elektronik Takip Denetim Sistemi',
        hint: 'U-ETDS web servisi için firmanıza verilen UNET kullanıcı adı ve şifre. Sefer manifestoları bu hesapla iletilir.',
        usernameLabel: 'Kullanıcı adı',
        featureKey: 'UETDS_API',
    },
}
