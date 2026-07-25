/**
 * Şablon düzenleme modunda akıllı alan çiplerinde gösterilen örnek değerler —
 * backend ContractPlaceholderContextBuilder.buildSample() ile aynı set.
 * Alan kaynak açıklamaları çip popover'ında ("Kaynak: …") kullanılır.
 */

export const SAMPLE_PLACEHOLDERS: Record<string, string> = {
    companyName: 'Örnek Filo Kiralama A.Ş.',
    companyAddress: 'Atatürk Cad. No:1, Kadıköy / İstanbul',
    companyPhone: '0216 000 00 00',
    companyFax: '0216 000 00 01',
    companyWeb: 'www.ornekfilo.com',
    companyEmail: 'info@ornekfilo.com',
    authorizedPerson: 'Mehmet Demir',

    customerName: 'Ahmet Yılmaz',
    customerContactName: 'Ahmet Yılmaz',
    customerCompany: 'Yılmaz İnşaat Ltd. Şti.',
    customerPhone: '0532 000 00 00',
    customerGsm: '0532 000 00 00',
    customerEmail: 'ahmet@ornekmusteri.com',

    offerNumber: 'TKL-2026-00042',
    contractNumber: 'CNT-2026-00042',
    offerDate: new Date().toLocaleDateString('tr-TR'),
    startDate: new Date().toLocaleDateString('tr-TR'),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR'),
    monthlyPrice: '25.000 TRY',
    dailyPrice: '1.200 TRY',
    totalPrice: '300.000 TRY',
    discountAmount: '5.000 TRY',
    rentalPeriod: '12 AY KİRALAMA',
    vehicleQuantity: '1',

    vehiclePlate: '34 ABC 123',
    vehicleBrand: 'Volkswagen',
    vehicleModel: 'Passat 1.5 TSI',
    vehicleDescription: 'Volkswagen Passat 1.5 TSI SÜRÜCÜSÜZ – YAKIT HARİÇ',

    pickupBranchName: 'Kadıköy Şubesi',
    pickupBranchCity: 'İstanbul',
    returnBranchName: 'Kadıköy Şubesi',
    returnBranchCity: 'İstanbul',
    startKm: '45.000',
    startFuelLevel: '%50',
    driversBlock: '- Ahmet Yılmaz (Birincil)\n- Ayşe Yılmaz',
    notes: 'Araç tam depo ve hasarsız teslim edilmiştir.',

    endKm: '48.500',
    totalKm: '3.500',
    endFuelLevel: '%45',
    kmOverage: '0',
    kmPenalty: '0 TRY',
    lateDays: '0',
    lateFee: '0 TRY',
    penaltyTotal: '0 TRY',
    damageTotal: '0 TRY',
    tollTotal: '150 TRY',
    overallGrandTotal: '300.150 TRY',
}

export const FIELD_SOURCES: Record<string, string> = {
    companyName: 'Ayarlar → Firma bilgileri',
    companyAddress: 'Ayarlar → Firma bilgileri',
    companyPhone: 'Ayarlar → Firma bilgileri',
    companyFax: 'Ayarlar → Firma bilgileri',
    companyWeb: 'Ayarlar → Firma bilgileri',
    companyEmail: 'Ayarlar → Firma bilgileri',
    authorizedPerson: 'Ayarlar → Yetkili kişi',

    customerName: 'Müşteri kartı → Ad soyad',
    customerContactName: 'Müşteri kartı → Yetkili',
    customerCompany: 'Müşteri kartı → Firma unvanı',
    customerPhone: 'Müşteri kartı → Telefon',
    customerGsm: 'Müşteri kartı → GSM',
    customerEmail: 'Müşteri kartı → E-posta',

    offerNumber: 'Belge → Numara',
    contractNumber: 'Belge → Numara',
    offerDate: 'Belge → Oluşturma tarihi',
    startDate: 'Kiralama → Başlangıç',
    endDate: 'Kiralama → Bitiş',

    vehiclePlate: 'Araç kartı → Plaka',
    vehicleBrand: 'Araç kartı → Marka',
    vehicleModel: 'Araç kartı → Model',
    vehicleDescription: 'Araç kartı → Açıklama',
    vehicleQuantity: 'Kiralama → Araç sayısı',

    pickupBranchName: 'Kiralama → Alış şubesi',
    pickupBranchCity: 'Kiralama → Alış şehri',
    returnBranchName: 'Kiralama → İade şubesi',
    returnBranchCity: 'Kiralama → İade şehri',

    monthlyPrice: 'Fiyatlandırma → Aylık',
    dailyPrice: 'Fiyatlandırma → Günlük',
    totalPrice: 'Fiyatlandırma → Toplam',
    discountAmount: 'Fiyatlandırma → İndirim',
    rentalPeriod: 'Kiralama → Süre',

    startKm: 'Teslim → KM',
    startFuelLevel: 'Teslim → Yakıt',
    endKm: 'İade → KM',
    endFuelLevel: 'İade → Yakıt',
    totalKm: 'İade → Toplam KM',
    kmOverage: 'İade → KM aşımı',
    driversBlock: 'Kiralama → Sürücüler',
    notes: 'Kiralama → Notlar',
    kmPenalty: 'İade → KM cezası',
    lateDays: 'İade → Gecikme günü',
    lateFee: 'İade → Gecikme ücreti',
    penaltyTotal: 'Cezalar → Toplam',
    damageTotal: 'Hasarlar → Toplam',
    tollTotal: 'Geçişler → Toplam',
    overallGrandTotal: 'Kapanış → Genel toplam',

    termsBlock: 'Şablon → Şartlar',
}

export function fieldSource(key: string): string {
    return FIELD_SOURCES[key] ?? 'Belge alanı'
}

/** "Kayıtlı maddelerden ekle" kitaplığı — Faz 2'de backend'e taşınacak. */
export const STANDARD_CLAUSES: string[] = [
    'Kiracı, aracı sözleşmede belirtilen kullanım amacı dışında kullanamaz ve üçüncü kişilere devredemez.',
    'Yakıt gideri kiracıya aittir; araç teslim alındığı yakıt seviyesiyle iade edilir.',
    'Kaza halinde kiracı, kaza tespit tutanağı ve alkol raporunu 24 saat içinde firmaya iletmekle yükümlüdür.',
    'Geç iade halinde her gün için günlük kira bedelinin %50 fazlası uygulanır.',
    'İşbu sözleşmeden doğan uyuşmazlıklarda Kayseri Mahkemeleri ve İcra Daireleri yetkilidir.',
    'Fiyatlarımıza KDV dahil değildir.',
    'Tüm periyodik bakım ve onarımlar firmamız tarafından yaptırılacaktır.',
    'Araçların Zorunlu Trafik Sigortası, Kasko Sigortası ve muayeneleri kira bedeline dahildir.',
]
