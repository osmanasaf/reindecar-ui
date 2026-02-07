import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiError, ApiResponse, PaginatedResponse, PaginationParams, ErrorResponse } from '@/types'
import { isTokenExpired } from '@/utils/jwt'
import { generateTraceId, isErrorResponse, isAuthError } from '@/utils/error'
import { useToast } from '@/composables/useToast'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

const ACCESS_TOKEN_KEY = 'reindecar_access_token'
const REFRESH_TOKEN_KEY = 'reindecar_refresh_token'

export const tokenStorage = {
    getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
    getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
    setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    },
    clearTokens: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
    },
    isAccessTokenValid: (): boolean => {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY)
        if (!token) return false
        return !isTokenExpired(token)
    }
}

const apiClient: AxiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = []

const processQueue = (error: AxiosError | null) => {
    failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve())
    failedQueue = []
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken()
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
    }

    if (config.headers) {
        config.headers['X-Trace-Id'] = generateTraceId()
    }

    return config
})

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ErrorResponse | ApiError>) => {
        const originalRequest = error.config

        const responseData = error.response?.data
        const isBackendError = responseData && isErrorResponse(responseData)

        if (isBackendError && isAuthError(responseData)) {
            const errorCode = responseData.code

            if (errorCode === 'A003' && originalRequest) {
                if (originalRequest.url?.includes('/auth/refresh')) {
                    tokenStorage.clearTokens()
                    globalThis.location.href = '/login?expired=true'
                    throw error
                }

                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject })
                    }).then(() => apiClient(originalRequest))
                }

                isRefreshing = true
                const refreshToken = tokenStorage.getRefreshToken()

                if (!refreshToken) {
                    tokenStorage.clearTokens()
                    globalThis.location.href = '/login?expired=true'
                    throw error
                }

                try {
                    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
                    const { accessToken, refreshToken: newRefreshToken } = response.data.data
                    tokenStorage.setTokens(accessToken, newRefreshToken)
                    processQueue(null)
                    return apiClient(originalRequest)
                } catch (refreshError) {
                    processQueue(refreshError as AxiosError)
                    tokenStorage.clearTokens()
                    globalThis.location.href = '/login?expired=true'
                    throw refreshError
                } finally {
                    isRefreshing = false
                }
            }

            if (errorCode === 'A001') {
                tokenStorage.clearTokens()
                globalThis.location.href = '/login'
                throw error
            }

        }

        if (error.response?.status === 401 && originalRequest && !isBackendError) {
            if (originalRequest.url?.includes('/auth/refresh')) {
                tokenStorage.clearTokens()
                globalThis.location.href = '/login'
                throw error
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(() => apiClient(originalRequest))
            }

            isRefreshing = true
            const refreshToken = tokenStorage.getRefreshToken()

            if (!refreshToken) {
                tokenStorage.clearTokens()
                globalThis.location.href = '/login'
                throw error
            }

            try {
                const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
                const { accessToken, refreshToken: newRefreshToken } = response.data.data
                tokenStorage.setTokens(accessToken, newRefreshToken)
                processQueue(null)
                return apiClient(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError as AxiosError)
                tokenStorage.clearTokens()
                globalThis.location.href = '/login'
                throw refreshError
            } finally {
                isRefreshing = false
            }
        }

        if (!error.response) {
            console.error('[API Client] Network error: No response received')
            const networkError: ErrorResponse = {
                code: 'S003',
                message: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
                timestamp: new Date().toISOString(),
                path: originalRequest?.url || '',
                traceId: 'network-error'
            }
            const toast = useToast()
            toast.error(networkError.message)
            throw networkError
        }

        if (isBackendError) {
            console.error(`[${responseData.traceId}] Error ${responseData.code}: ${responseData.message}`)
            if (!isAuthError(responseData)) {
                const toast = useToast()
                toast.error(responseData.message)
            }
            throw responseData
        }

        const apiError: ApiError = responseData || {
            success: false,
            message: error.message || 'Network error',
            timestamp: new Date().toISOString()
        }

        const toast = useToast()
        toast.error(apiError.message || 'Bir hata oluştu')

        throw apiError
    }
)

export abstract class BaseApi {
    protected abstract readonly basePath: string

    private buildUrl(path = ''): string {
        if (!path) return this.basePath
        return path.startsWith('/') ? `${this.basePath}${path}` : `${this.basePath}/${path}`
    }

    protected async get<T>(path = '', params?: PaginationParams): Promise<T> {
        const { data } = await apiClient.get<ApiResponse<T>>(this.buildUrl(path), { params })
        return data.data
    }

    protected async post<T>(path = '', body?: unknown): Promise<T> {
        const { data } = await apiClient.post<ApiResponse<T>>(this.buildUrl(path), body)
        return data.data
    }

    protected async postFormData<T>(formData: FormData, path = ''): Promise<T> {
        const { data } = await apiClient.post<ApiResponse<T>>(this.buildUrl(path), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return data.data
    }

    protected async put<T>(path = '', body?: unknown): Promise<T> {
        const { data } = await apiClient.put<ApiResponse<T>>(this.buildUrl(path), body)
        return data.data
    }

    protected async patch<T>(path = '', body?: unknown): Promise<T> {
        const { data } = await apiClient.patch<ApiResponse<T>>(this.buildUrl(path), body)
        return data.data
    }

    protected async remove(path = ''): Promise<void> {
        await apiClient.delete(this.buildUrl(path))
    }

    protected async getList<T>(path = '', params?: PaginationParams): Promise<PaginatedResponse<T>> {
        return this.get<PaginatedResponse<T>>(path, params)
    }
}

export default apiClient
