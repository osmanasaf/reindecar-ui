/**
 * JWT Token Utilities
 * Token decode, expiry check ve timing işlemleri
 */

export interface JwtPayload {
    sub: string
    exp: number
    iat: number
    roles?: string[]
    [key: string]: unknown
}

/**
 * JWT token'ı decode eder (signature doğrulaması yapmaz - sadece payload okur)
 */
export function decodeJwt(token: string): JwtPayload | null {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        
        const payload = parts[1]
        const decoded = atob(payload.replaceAll('-', '+').replaceAll('_', '/'))
        return JSON.parse(decoded) as JwtPayload
    } catch {
        return null
    }
}

/**
 * Token'ın expire olup olmadığını kontrol eder
 * @param bufferSeconds - Expire'dan kaç saniye önce expired sayılsın (default: 0)
 */
export function isTokenExpired(token: string, bufferSeconds = 0): boolean {
    const payload = decodeJwt(token)
    if (!payload?.exp) return true
    
    const now = Math.floor(Date.now() / 1000)
    return payload.exp - bufferSeconds <= now
}

/**
 * Token'ın ne kadar süre sonra expire olacağını döner (saniye)
 * Negatif değer = zaten expired
 */
export function getTokenTimeToExpiry(token: string): number {
    const payload = decodeJwt(token)
    if (!payload?.exp) return -1
    
    const now = Math.floor(Date.now() / 1000)
    return payload.exp - now
}

/**
 * Token'ın expire tarihini Date olarak döner
 */
export function getTokenExpiryDate(token: string): Date | null {
    const payload = decodeJwt(token)
    if (!payload?.exp) return null
    
    return new Date(payload.exp * 1000)
}

/**
 * Token'ın yenilenmesi gerekip gerekmediğini kontrol eder
 * @param refreshThresholdSeconds - Expire'a kaç saniye kala yenilensin (default: 5 dakika)
 */
export function shouldRefreshToken(token: string, refreshThresholdSeconds = 300): boolean {
    const timeToExpiry = getTokenTimeToExpiry(token)
    return timeToExpiry > 0 && timeToExpiry <= refreshThresholdSeconds
}
