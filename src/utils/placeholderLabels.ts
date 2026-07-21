/**
 * Backend'in listSupportedPlaceholders (ContractService) anahtarlarını, Belge Şablonları
 * ekranındaki "placeholder yardımı" için Türkçe açıklama + kategoriye eşler. Bilinmeyen
 * anahtar için anahtarın kendisi 'Diğer' grubu altında gösterilir.
 */

export interface PlaceholderInfo {
    label: string
    group: string
}

export const PLACEHOLDER_GROUP_ORDER = ['Firma', 'Müşteri', 'Belge', 'Araç', 'Şube', 'Fiyat', 'İade', 'Diğer'] as const

const PLACEHOLDER_LABELS: Record<string, PlaceholderInfo> = {
    companyName: { label: 'Firma adı', group: 'Firma' },
    companyAddress: { label: 'Firma adresi', group: 'Firma' },
    companyPhone: { label: 'Firma telefonu', group: 'Firma' },
    companyFax: { label: 'Firma faks', group: 'Firma' },
    companyWeb: { label: 'Firma web adresi', group: 'Firma' },
    companyEmail: { label: 'Firma e-postası', group: 'Firma' },
    authorizedPerson: { label: 'Yetkili kişi', group: 'Firma' },

    customerName: { label: 'Müşteri adı', group: 'Müşteri' },
    customerContactName: { label: 'Müşteri yetkilisi', group: 'Müşteri' },
    customerCompany: { label: 'Müşteri firması', group: 'Müşteri' },
    customerPhone: { label: 'Müşteri telefonu', group: 'Müşteri' },
    customerGsm: { label: 'Müşteri GSM', group: 'Müşteri' },
    customerEmail: { label: 'Müşteri e-postası', group: 'Müşteri' },

    offerNumber: { label: 'Teklif no', group: 'Belge' },
    contractNumber: { label: 'Sözleşme no', group: 'Belge' },
    offerDate: { label: 'Belge tarihi', group: 'Belge' },
    startDate: { label: 'Başlangıç tarihi', group: 'Belge' },
    endDate: { label: 'Bitiş tarihi', group: 'Belge' },

    vehiclePlate: { label: 'Araç plakası', group: 'Araç' },
    vehicleBrand: { label: 'Araç markası', group: 'Araç' },
    vehicleModel: { label: 'Araç modeli', group: 'Araç' },
    vehicleDescription: { label: 'Araç açıklaması', group: 'Araç' },
    vehicleQuantity: { label: 'Araç adedi', group: 'Araç' },

    pickupBranchName: { label: 'Alış şubesi', group: 'Şube' },
    pickupBranchCity: { label: 'Alış şehri', group: 'Şube' },
    returnBranchName: { label: 'İade şubesi', group: 'Şube' },
    returnBranchCity: { label: 'İade şehri', group: 'Şube' },

    monthlyPrice: { label: 'Aylık ücret', group: 'Fiyat' },
    dailyPrice: { label: 'Günlük ücret', group: 'Fiyat' },
    totalPrice: { label: 'Toplam ücret', group: 'Fiyat' },
    discountAmount: { label: 'İndirim tutarı', group: 'Fiyat' },
    rentalPeriod: { label: 'Kiralama süresi', group: 'Fiyat' },

    startKm: { label: 'Teslim KM', group: 'İade' },
    startFuelLevel: { label: 'Teslim yakıt seviyesi', group: 'İade' },
    endKm: { label: 'İade KM', group: 'İade' },
    endFuelLevel: { label: 'İade yakıt seviyesi', group: 'İade' },
    totalKm: { label: 'Toplam KM', group: 'İade' },
    kmOverage: { label: 'KM aşımı', group: 'İade' },
    driversBlock: { label: 'Sürücü listesi', group: 'İade' },
    notes: { label: 'Notlar', group: 'İade' },
    kmPenalty: { label: 'KM aşım cezası', group: 'İade' },
    lateDays: { label: 'Gecikme günü', group: 'İade' },
    lateFee: { label: 'Gecikme ücreti', group: 'İade' },
    penaltyTotal: { label: 'Ceza toplamı', group: 'İade' },
    damageTotal: { label: 'Hasar toplamı', group: 'İade' },
    tollTotal: { label: 'Geçiş ücreti toplamı', group: 'İade' },
    overallGrandTotal: { label: 'Genel toplam', group: 'İade' },

    termsBlock: { label: 'Şartlar bloğu', group: 'Diğer' },
}

export function placeholderInfo(key: string): PlaceholderInfo {
    return PLACEHOLDER_LABELS[key] ?? { label: key, group: 'Diğer' }
}

export function placeholderToken(key: string): string {
    return `{{${key}}}`
}

export interface PlaceholderGroup {
    group: string
    items: Array<{ key: string; label: string }>
}

export function groupPlaceholders(keys: string[]): PlaceholderGroup[] {
    const byGroup = new Map<string, Array<{ key: string; label: string }>>()
    for (const key of keys) {
        const info = placeholderInfo(key)
        if (!byGroup.has(info.group)) byGroup.set(info.group, [])
        byGroup.get(info.group)!.push({ key, label: info.label })
    }
    return PLACEHOLDER_GROUP_ORDER
        .filter((g) => byGroup.has(g))
        .map((g) => ({ group: g, items: byGroup.get(g)! }))
}
