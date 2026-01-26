/**
 * Token Manager Service
 * Proaktif token yenileme, expiry takibi ve event yönetimi
 */

import { tokenStorage } from '@/api/client'
import { isTokenExpired, shouldRefreshToken, getTokenTimeToExpiry } from '@/utils/jwt'

type TokenEventType = 'token:expired' | 'token:refreshed' | 'token:refresh_failed' | 'token:logout'
type TokenEventCallback = () => void

// Token yenileme için minimum bekleme süresi (saniye)
const MIN_REFRESH_INTERVAL = 30
// Token expire'a kaç saniye kala yenilensin
const REFRESH_THRESHOLD_SECONDS = 300 // 5 dakika
// Proaktif kontrol aralığı (ms)
const CHECK_INTERVAL_MS = 60000 // 1 dakika

class TokenManager {
    private refreshTimer: ReturnType<typeof setTimeout> | null = null
    private checkInterval: ReturnType<typeof setInterval> | null = null
    private lastRefreshAttempt = 0
    private readonly eventListeners: Map<TokenEventType, Set<TokenEventCallback>> = new Map()
    private isRefreshing = false

    /**
     * Token manager'ı başlat
     */
    start(): void {
        this.scheduleNextRefresh()
        this.startPeriodicCheck()
    }

    /**
     * Token manager'ı durdur
     */
    stop(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer)
            this.refreshTimer = null
        }
        if (this.checkInterval) {
            clearInterval(this.checkInterval)
            this.checkInterval = null
        }
    }

    /**
     * Event listener ekle
     */
    on(event: TokenEventType, callback: TokenEventCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set())
        }
        this.eventListeners.get(event)!.add(callback)
    }

    /**
     * Event listener kaldır
     */
    off(event: TokenEventType, callback: TokenEventCallback): void {
        this.eventListeners.get(event)?.delete(callback)
    }

    /**
     * Event tetikle
     */
    private emit(event: TokenEventType): void {
        this.eventListeners.get(event)?.forEach(callback => {
            try {
                callback()
            } catch (error) {
                console.error(`Token event handler error for ${event}:`, error)
            }
        })
    }

    /**
     * Token'ın durumunu kontrol et
     */
    checkTokenStatus(): { isValid: boolean; shouldRefresh: boolean; timeToExpiry: number } {
        const token = tokenStorage.getAccessToken()
        
        if (!token) {
            return { isValid: false, shouldRefresh: false, timeToExpiry: -1 }
        }

        const expired = isTokenExpired(token)
        const needsRefresh = shouldRefreshToken(token, REFRESH_THRESHOLD_SECONDS)
        const timeToExpiry = getTokenTimeToExpiry(token)

        return {
            isValid: !expired,
            shouldRefresh: needsRefresh,
            timeToExpiry
        }
    }

    /**
     * Token'ı yenile
     */
    async refreshToken(): Promise<boolean> {
        // Zaten yenileme yapılıyorsa bekle
        if (this.isRefreshing) {
            return false
        }

        // Son yenileme denemesinden beri yeterli süre geçti mi?
        const now = Date.now()
        if (now - this.lastRefreshAttempt < MIN_REFRESH_INTERVAL * 1000) {
            return false
        }

        const refreshToken = tokenStorage.getRefreshToken()
        if (!refreshToken) {
            this.emit('token:expired')
            return false
        }

        this.isRefreshing = true
        this.lastRefreshAttempt = now

        try {
            // Dynamic import to avoid circular dependency
            const { authApi } = await import('@/api/auth.api')
            const tokens = await authApi.refresh(refreshToken)
            tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken)
            
            this.emit('token:refreshed')
            this.scheduleNextRefresh()
            return true
        } catch (error) {
            console.error('Token refresh failed:', error)
            this.emit('token:refresh_failed')
            return false
        } finally {
            this.isRefreshing = false
        }
    }

    /**
     * Sonraki yenilemeyi zamanla
     */
    private scheduleNextRefresh(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer)
        }

        const token = tokenStorage.getAccessToken()
        if (!token) return

        const timeToExpiry = getTokenTimeToExpiry(token)
        if (timeToExpiry <= 0) {
            this.emit('token:expired')
            return
        }

        // Expire'dan REFRESH_THRESHOLD_SECONDS önce yenile
        const refreshIn = Math.max(
            (timeToExpiry - REFRESH_THRESHOLD_SECONDS) * 1000,
            MIN_REFRESH_INTERVAL * 1000
        )

        this.refreshTimer = setTimeout(() => {
            this.refreshToken()
        }, refreshIn)
    }

    /**
     * Periyodik kontrol başlat
     */
    private startPeriodicCheck(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval)
        }

        this.checkInterval = setInterval(() => {
            const status = this.checkTokenStatus()
            
            if (!status.isValid) {
                this.emit('token:expired')
                this.stop()
            } else if (status.shouldRefresh) {
                this.refreshToken()
            }
        }, CHECK_INTERVAL_MS)
    }

    /**
     * Kullanıcı aktivitesi bildir (activity-based refresh için)
     */
    notifyActivity(): void {
        const status = this.checkTokenStatus()
        
        // Token yakında expire olacaksa ve kullanıcı aktifse yenile
        if (status.shouldRefresh && status.isValid) {
            this.refreshToken()
        }
    }

    /**
     * Logout işlemi
     */
    logout(): void {
        this.stop()
        tokenStorage.clearTokens()
        this.emit('token:logout')
    }
}

// Singleton instance
export const tokenManager = new TokenManager()
export default tokenManager
