import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { authApi, tokenStorage } from '@/api'
import { tokenManager } from '@/services/tokenManager'
import type { User, LoginForm, Role } from '@/types'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)
    const tokenStatus = ref<{ isValid: boolean; timeToExpiry: number }>({ isValid: false, timeToExpiry: -1 })

    const isAuthenticated = computed(() => !!tokenStorage.getAccessToken() && tokenStatus.value.isValid)
    const isAdmin = computed(() => user.value?.role === 'ADMIN' as Role)
    const userFullName = computed(() => user.value?.fullName ?? '')

    // Token event listeners
    function setupTokenListeners(): void {
        tokenManager.on('token:expired', handleTokenExpired)
        tokenManager.on('token:refreshed', handleTokenRefreshed)
        tokenManager.on('token:refresh_failed', handleRefreshFailed)
    }

    function removeTokenListeners(): void {
        tokenManager.off('token:expired', handleTokenExpired)
        tokenManager.off('token:refreshed', handleTokenRefreshed)
        tokenManager.off('token:refresh_failed', handleRefreshFailed)
    }

    function handleTokenExpired(): void {
        user.value = null
        tokenStatus.value = { isValid: false, timeToExpiry: -1 }
        // Router redirect login sayfasına yönlendirecek
    }

    function handleTokenRefreshed(): void {
        updateTokenStatus()
    }

    function handleRefreshFailed(): void {
        // Refresh başarısız olursa logout yap
        logout()
    }

    function updateTokenStatus(): void {
        const status = tokenManager.checkTokenStatus()
        tokenStatus.value = { isValid: status.isValid, timeToExpiry: status.timeToExpiry }
    }

    async function login(credentials: LoginForm): Promise<boolean> {
        loading.value = true
        error.value = null

        try {
            const tokens = await authApi.login(credentials)
            tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken)
            
            // Token manager'ı başlat
            setupTokenListeners()
            tokenManager.start()
            updateTokenStatus()
            
            await fetchUser()
            return true
        } catch (e) {
            error.value = (e as Error).message || 'Giriş başarısız'
            return false
        } finally {
            loading.value = false
        }
    }

    async function fetchUser(): Promise<void> {
        try {
            user.value = await authApi.me()
        } catch {
            user.value = null
        }
    }

    async function logout(): Promise<void> {
        try {
            await authApi.logout()
        } finally {
            user.value = null
            tokenManager.logout()
            removeTokenListeners()
            tokenStatus.value = { isValid: false, timeToExpiry: -1 }
        }
    }

    async function checkAuth(): Promise<boolean> {
        const token = tokenStorage.getAccessToken()
        if (!token) {
            return false
        }

        try {
            // Token manager'ı başlat
            setupTokenListeners()
            tokenManager.start()
            updateTokenStatus()

            // Token geçerli mi kontrol et
            const status = tokenManager.checkTokenStatus()
            if (!status.isValid) {
                // Token expired, refresh dene
                const refreshed = await tokenManager.refreshToken()
                if (!refreshed) {
                    tokenStorage.clearTokens()
                    return false
                }
            }

            await fetchUser()
            return true
        } catch {
            tokenStorage.clearTokens()
            removeTokenListeners()
            tokenManager.stop()
            return false
        }
    }

    /**
     * Kullanıcı aktivitesi bildir - API çağrılarında kullanılabilir
     */
    function notifyActivity(): void {
        tokenManager.notifyActivity()
    }

    function clearError(): void {
        error.value = null
    }

    /**
     * Token'ın ne kadar süre sonra expire olacağını döner (saniye)
     */
    function getTimeToExpiry(): number {
        return tokenStatus.value.timeToExpiry
    }

    return {
        user: readonly(user),
        loading: readonly(loading),
        error: readonly(error),
        tokenStatus: readonly(tokenStatus),
        isAuthenticated,
        isAdmin,
        userFullName,
        login,
        logout,
        checkAuth,
        fetchUser,
        notifyActivity,
        getTimeToExpiry,
        clearError
    }
})
