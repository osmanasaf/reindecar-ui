

import { tokenStorage } from '@/api/client'
import { isTokenExpired, shouldRefreshToken, getTokenTimeToExpiry } from '@/utils/jwt'

type TokenEventType = 'token:expired' | 'token:refreshed' | 'token:refresh_failed' | 'token:logout'
type TokenEventCallback = () => void

const MIN_REFRESH_INTERVAL = 30
const REFRESH_THRESHOLD_SECONDS = 300
const CHECK_INTERVAL_MS = 60000

class TokenManager {
    private refreshTimer: ReturnType<typeof setTimeout> | null = null
    private checkInterval: ReturnType<typeof setInterval> | null = null
    private lastRefreshAttempt = 0
    private readonly eventListeners: Map<TokenEventType, Set<TokenEventCallback>> = new Map()
    private isRefreshing = false


    start(): void {
        this.scheduleNextRefresh()
        this.startPeriodicCheck()
    }


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


    on(event: TokenEventType, callback: TokenEventCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set())
        }
        this.eventListeners.get(event)!.add(callback)
    }


    off(event: TokenEventType, callback: TokenEventCallback): void {
        this.eventListeners.get(event)?.delete(callback)
    }


    private emit(event: TokenEventType): void {
        this.eventListeners.get(event)?.forEach(callback => {
            try {
                callback()
            } catch (error) {
                console.error(`Token event handler error for ${event}:`, error)
            }
        })
    }


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


    async refreshToken(): Promise<boolean> {

        if (this.isRefreshing) {
            return false
        }


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


        const refreshIn = Math.max(
            (timeToExpiry - REFRESH_THRESHOLD_SECONDS) * 1000,
            MIN_REFRESH_INTERVAL * 1000
        )

        this.refreshTimer = setTimeout(() => {
            this.refreshToken()
        }, refreshIn)
    }


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


    notifyActivity(): void {
        const status = this.checkTokenStatus()


        if (status.shouldRefresh && status.isValid) {
            this.refreshToken()
        }
    }


    logout(): void {
        this.stop()
        tokenStorage.clearTokens()
        this.emit('token:logout')
    }
}


export const tokenManager = new TokenManager()
export default tokenManager
