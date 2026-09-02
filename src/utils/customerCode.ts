const CODE_PREFIX = 'MŞT'
const CODE_LENGTH = 8

/**
 * `Customer.publicId` rastgele bir UUID; kısa insan-okunur bir kod için
 * tasarlanmış slotlarda (liste satırı, hero rozeti) ham hâliyle basılıyordu.
 *
 * Bu yardımcı UUID'yi kısa, okunabilir ve telefonda söylenebilir bir koda
 * indirger — `MŞT-1A2B3C4D`. Kod deterministik olduğu için kayıt eşleştirme
 * amacı korunur; tam UUID teknik detay olarak `title` ile erişilebilir kalır.
 */
export function formatCustomerCode(publicId: string | null | undefined): string {
    if (!publicId) return ''
    const compact = publicId.replace(/-/g, '').slice(0, CODE_LENGTH).toUpperCase()
    return compact ? `${CODE_PREFIX}-${compact}` : ''
}
