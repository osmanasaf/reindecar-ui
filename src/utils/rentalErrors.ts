import { getApiErrorMessage, isErrorResponse } from './error'

export interface RentalOperationError {
    message: string
    hint?: string
}

/** Backend genel hata başlığını detayın önüne ekler; detay tek başına anlaşılır olduğu için başlığı düşürüyoruz */
const GENERIC_PREFIX = /^(Geçersiz işlem|Geçersiz ehliyet bilgisi):\s*/

const HINT_RULES: Array<{ matches: (message: string, code: string | null) => boolean; hint: string }> = [
    {
        matches: (message) => message.includes('İmzalı'),
        hint: 'Belgeler bölümünden ilgili tutanağı/sözleşmeyi yükleyip imzalı olarak işaretledikten sonra tekrar deneyin.'
    },
    {
        matches: (message) => message.includes('muayene') || message.includes('sigorta'),
        hint: 'Araç kartından muayene ve sigorta bitiş tarihlerini güncelledikten sonra tekrar deneyin.'
    },
    {
        matches: (message) => message.includes('ehliyet sınıfı tanımlı değil'),
        hint: 'Sürücü kartını düzenleyip ehliyet sınıfını seçin.'
    },
    {
        matches: (message, code) => code === 'C003' || message.includes('Gerekli sınıf'),
        hint: 'Aracın kategorisi için gereken ehliyet sınıfı Ayarlar › Araç kategorileri ekranında tanımlıdır. Uygun sınıfa sahip bir sürücü seçin ya da sürücünün ehliyet sınıfını güncelleyin.'
    },
    {
        matches: (message) => message.includes('minimum yaş') || message.includes('ehliyeti en az'),
        hint: 'Sürücü kartındaki doğum tarihi ve ehliyet veriliş tarihi bilgilerini kontrol edin.'
    }
]

function extractErrorCode(err: unknown): string | null {
    if (!err || typeof err !== 'object') return null
    if (isErrorResponse(err)) return err.code
    const data = (err as { response?: { data?: unknown } }).response?.data
    if (data && isErrorResponse(data)) return data.code
    return null
}

export function describeRentalOperationError(err: unknown, fallback: string): RentalOperationError {
    const message = getApiErrorMessage(err, fallback).replace(GENERIC_PREFIX, '')
    const code = extractErrorCode(err)
    const hint = HINT_RULES.find((rule) => rule.matches(message, code))?.hint
    return { message, hint }
}
