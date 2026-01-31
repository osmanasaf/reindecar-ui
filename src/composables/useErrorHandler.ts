import { ref, computed, readonly } from 'vue'
import type { ErrorResponse } from '@/types'
import { isErrorResponse, isValidationError } from '@/utils/error'
import type { AxiosError } from 'axios'

export interface UseErrorHandlerReturn {
    error: Readonly<typeof error>
    validationErrors: Readonly<typeof validationErrors>
    handleError: (err: unknown) => void
    clearError: () => void
    getFieldError: (fieldName: string) => string | undefined
    hasFieldError: (fieldName: string) => boolean
    hasError: Readonly<typeof hasError>
}

/**
 * Global error handler composable
 * Backend'den gelen ErrorResponse formatındaki hataları yönetir
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useErrorHandler } from '@/composables'
 * 
 * const { error, handleError, getFieldError, clearError } = useErrorHandler()
 * 
 * async function submit() {
 *   clearError()
 *   try {
 *     await api.create(data)
 *   } catch (err) {
 *     handleError(err)
 *     if (error.value) {
 *       toast.error(error.value.message)
 *     }
 *   }
 * }
 * </script>
 * 
 * <template>
 *   <input :class="{ error: getFieldError('email') }" />
 *   <span v-if="getFieldError('email')">{{ getFieldError('email') }}</span>
 * </template>
 * ```
 */
export function useErrorHandler(): UseErrorHandlerReturn {
    const error = ref<ErrorResponse | null>(null)
    const validationErrors = ref<Record<string, string>>({})

    /**
     * Hatayı işler ve state'e kaydeder
     */
    function handleError(err: unknown): void {
        // Axios error response kontrolü
        if (err && typeof err === 'object' && 'response' in err) {
            const axiosError = err as AxiosError
            const responseData = axiosError.response?.data

            // Backend ErrorResponse formatı kontrolü
            if (responseData && isErrorResponse(responseData)) {
                error.value = responseData

                // Validasyon hatası ise field-level hataları ayır
                if (isValidationError(responseData) && responseData.details) {
                    validationErrors.value = responseData.details
                } else {
                    validationErrors.value = {}
                }
                return
            }
        }

        // Generic error fallback
        error.value = {
            code: 'S001',
            message: err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu',
            timestamp: new Date().toISOString(),
            path: '',
            traceId: 'unknown'
        }
        validationErrors.value = {}
    }

    /**
     * Tüm hata state'ini temizler
     */
    function clearError(): void {
        error.value = null
        validationErrors.value = {}
    }

    /**
     * Belirli bir field için validasyon hatası döner
     */
    function getFieldError(fieldName: string): string | undefined {
        return validationErrors.value[fieldName]
    }

    /**
     * Belirli bir field'in validasyon hatası olup olmadığını kontrol eder
     */
    function hasFieldError(fieldName: string): boolean {
        return !!validationErrors.value[fieldName]
    }

    /**
     * Genel hata olup olmadığını kontrol eder
     */
    const hasError = computed(() => error.value !== null)

    return {
        error: readonly(error),
        validationErrors: readonly(validationErrors),
        handleError,
        clearError,
        getFieldError,
        hasFieldError,
        hasError: readonly(hasError)
    }
}
