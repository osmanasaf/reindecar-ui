const TURKISH_FOLD_MAP: Record<string, string> = {
    'İ': 'i', 'I': 'i', 'ı': 'i',
    'Ş': 's', 'ş': 's',
    'Ğ': 'g', 'ğ': 'g',
    'Ç': 'c', 'ç': 'c',
    'Ü': 'u', 'ü': 'u',
    'Ö': 'o', 'ö': 'o',
    'Â': 'a', 'â': 'a',
    'Î': 'i', 'î': 'i',
    'Û': 'u', 'û': 'u'
}

/**
 * Türkçe metni aramaya uygun, diyakritiksiz bir anahtara indirger.
 *
 * `String.prototype.toLowerCase()` 'İ' harfini "i" + U+0307 (birleşen nokta)
 * olarak açtığı için `'İstanbul'.toLowerCase().includes('istanbul')` false
 * döner. `toLocaleLowerCase('tr')` ise ayna görüntüsü hatayı getirir:
 * 'Isparta' → 'ısparta', bu kez "isparta" bulunamaz. Her iki ucu da kapatmak
 * için harfler önce ASCII karşılıklarına katlanır, sonra küçültülür.
 */
export function foldSearchText(value: string | null | undefined): string {
    if (!value) return ''
    let folded = ''
    for (const char of value) {
        folded += TURKISH_FOLD_MAP[char] ?? char
    }
    return folded.toLowerCase()
}

/**
 * Katlanmış aramada `haystack`, `needle`'ı içeriyor mu?
 *
 * `needle` da katlanır; katlama idempotent olduğu için `toSearchQuery` ile
 * hazırlanmış bir sorgu geçirmek de, ham bir literal geçirmek de güvenlidir.
 */
export function matchesSearch(haystack: string | null | undefined, needle: string): boolean {
    const foldedNeedle = foldSearchText(needle).trim()
    if (!foldedNeedle) return true
    return foldSearchText(haystack).includes(foldedNeedle)
}

/** Kullanıcı girdisini karşılaştırmaya hazır hâle getirir (katla + kırp). */
export function toSearchQuery(value: string | null | undefined): string {
    return foldSearchText(value).trim()
}
