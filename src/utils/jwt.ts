

export interface JwtPayload {
    sub: string
    exp: number
    iat: number
    roles?: string[]
    [key: string]: unknown
}


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


export function isTokenExpired(token: string, bufferSeconds = 0): boolean {
    const payload = decodeJwt(token)
    if (!payload?.exp) return true

    const now = Math.floor(Date.now() / 1000)
    return payload.exp - bufferSeconds <= now
}


export function getTokenTimeToExpiry(token: string): number {
    const payload = decodeJwt(token)
    if (!payload?.exp) return -1

    const now = Math.floor(Date.now() / 1000)
    return payload.exp - now
}


export function getTokenExpiryDate(token: string): Date | null {
    const payload = decodeJwt(token)
    if (!payload?.exp) return null

    return new Date(payload.exp * 1000)
}


export function shouldRefreshToken(token: string, refreshThresholdSeconds = 300): boolean {
    const timeToExpiry = getTokenTimeToExpiry(token)
    return timeToExpiry > 0 && timeToExpiry <= refreshThresholdSeconds
}
