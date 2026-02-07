import { ref, computed, onMounted, onUnmounted } from 'vue'
import { tokenManager } from '@/services/tokenManager'


export function useTokenStatus() {
    const timeToExpiry = ref(0)
    const isExpiringSoon = ref(false)
    const updateInterval = ref<ReturnType<typeof setInterval> | null>(null)


    const WARNING_THRESHOLD = 300

    const formattedTimeToExpiry = computed(() => {
        if (timeToExpiry.value <= 0) return 'Oturum süresi doldu'

        const minutes = Math.floor(timeToExpiry.value / 60)
        const seconds = timeToExpiry.value % 60

        if (minutes > 60) {
            const hours = Math.floor(minutes / 60)
            const remainingMinutes = minutes % 60
            return `${hours} saat ${remainingMinutes} dakika`
        }

        if (minutes > 0) {
            return `${minutes} dakika ${seconds} saniye`
        }

        return `${seconds} saniye`
    })

    function updateStatus(): void {
        const status = tokenManager.checkTokenStatus()
        timeToExpiry.value = Math.max(0, status.timeToExpiry)
        isExpiringSoon.value = status.timeToExpiry > 0 && status.timeToExpiry <= WARNING_THRESHOLD
    }

    async function extendSession(): Promise<boolean> {
        const success = await tokenManager.refreshToken()
        if (success) {
            updateStatus()
        }
        return success
    }

    onMounted(() => {
        updateStatus()

        updateInterval.value = setInterval(updateStatus, 1000)
    })

    onUnmounted(() => {
        if (updateInterval.value) {
            clearInterval(updateInterval.value)
        }
    })

    return {
        timeToExpiry,
        isExpiringSoon,
        formattedTimeToExpiry,
        extendSession,
        updateStatus
    }
}

export default useTokenStatus
