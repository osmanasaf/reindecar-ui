import { ref, readonly } from 'vue'
import { getApiErrorMessage } from '@/utils/error'

export interface Toast {
    id: number
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    duration?: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
    function addToast(type: Toast['type'], message: string, duration = 5000) {
        const id = nextId++
        toasts.value.push({ id, type, message, duration })

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration)
        }

        return id
    }

    function removeToast(id: number) {
        const index = toasts.value.findIndex(t => t.id === id)
        if (index > -1) {
            toasts.value.splice(index, 1)
        }
    }

    function success(message: string, duration?: number) {
        return addToast('success', message, duration)
    }

    function error(message: string, duration?: number) {
        return addToast('error', message, duration)
    }

    function warning(message: string, duration?: number) {
        return addToast('warning', message, duration)
    }

    function info(message: string, duration?: number) {
        return addToast('info', message, duration)
    }

    function apiError(err: unknown, fallback = 'Bir hata oluştu', duration?: number) {
        const message = getApiErrorMessage(err, fallback)
        return addToast('error', message, duration)
    }

    function clear() {
        toasts.value = []
    }

    return {
        toasts: readonly(toasts),
        success,
        error,
        warning,
        info,
        apiError,
        removeToast,
        clear
    }
}
