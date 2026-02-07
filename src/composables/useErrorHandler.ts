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


export function useErrorHandler(): UseErrorHandlerReturn {
    const error = ref<ErrorResponse | null>(null)
    const validationErrors = ref<Record<string, string>>({})


    function handleError(err: unknown): void {

        if (err && typeof err === 'object' && 'response' in err) {
            const axiosError = err as AxiosError
            const responseData = axiosError.response?.data


            if (responseData && isErrorResponse(responseData)) {
                error.value = responseData


                if (isValidationError(responseData) && responseData.details) {
                    validationErrors.value = responseData.details
                } else {
                    validationErrors.value = {}
                }
                return
            }
        }


        error.value = {
            code: 'S001',
            message: err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu',
            timestamp: new Date().toISOString(),
            path: '',
            traceId: 'unknown'
        }
        validationErrors.value = {}
    }


    function clearError(): void {
        error.value = null
        validationErrors.value = {}
    }


    function getFieldError(fieldName: string): string | undefined {
        return validationErrors.value[fieldName]
    }


    function hasFieldError(fieldName: string): boolean {
        return !!validationErrors.value[fieldName]
    }


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
