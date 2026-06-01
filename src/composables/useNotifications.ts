import { ref, readonly } from 'vue'
import { notificationsApi } from '@/api/notifications.api'
import type { NotificationCountResponse, NotificationResponse } from '@/types/notification'

const count = ref<NotificationCountResponse>({ total: 0, unread: 0, urgent: 0 })
const items = ref<NotificationResponse[]>([])
const loading = ref(false)

let pollTimer: ReturnType<typeof setInterval> | null = null
const POLL_MS = 60_000

async function refresh(): Promise<void> {
    loading.value = true
    try {
        const [countRes, page] = await Promise.all([
            notificationsApi.getCount(),
            notificationsApi.getPage({ page: 0, size: 20, sort: 'createdAt', direction: 'desc' }),
        ])
        count.value = countRes
        items.value = page.content
    } catch {
        // Sessiz — header badge kritik değil
    } finally {
        loading.value = false
    }
}

function startPolling(): void {
    if (pollTimer) return
    pollTimer = setInterval(() => {
        void refresh()
    }, POLL_MS)
}

function stopPolling(): void {
    if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
    }
}

async function markAsRead(id: number): Promise<void> {
    await notificationsApi.markAsRead(id)
    const item = items.value.find(n => n.id === id)
    if (item && !item.isRead) {
        item.isRead = true
        count.value = {
            ...count.value,
            unread: Math.max(0, count.value.unread - 1),
        }
    }
}

async function dismiss(id: number): Promise<void> {
    await notificationsApi.dismiss(id)
    const removed = items.value.find(n => n.id === id)
    items.value = items.value.filter(n => n.id !== id)
    if (removed && !removed.isRead) {
        count.value = {
            ...count.value,
            unread: Math.max(0, count.value.unread - 1),
            total: Math.max(0, count.value.total - 1),
        }
    }
}

async function markAllAsRead(): Promise<void> {
    await notificationsApi.markAllAsRead()
    items.value = items.value.map(n => ({ ...n, isRead: true }))
    count.value = { ...count.value, unread: 0, urgent: 0 }
}

export function useNotifications() {
    return {
        count: readonly(count),
        items: readonly(items),
        loading: readonly(loading),
        refresh,
        startPolling,
        stopPolling,
        markAsRead,
        dismiss,
        markAllAsRead,
    }
}
