<script setup lang="ts">
import { useRouter } from 'vue-router'
import { RcIcon } from '@/components/icons'
import { RcButton } from '@/components/rc'
import { useNotifications } from '@/composables/useNotifications'
import type { NotificationResponse } from '@/types/notification'

defineProps<{ open: boolean }>()

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const { items, loading, count, markAsRead, dismiss, markAllAsRead } = useNotifications()

function formatRelative(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa önce`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} gün önce`
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

function resolveRoute(n: NotificationResponse): string | null {
  if (!n.referenceType || n.referenceId == null) return null
  const type = n.referenceType.toUpperCase()
  if (type === 'VEHICLE') return `/vehicles/${n.referenceId}`
  if (type === 'RENTAL') return `/rentals/${n.referenceId}`
  if (type === 'CUSTOMER') return `/customers/${n.referenceId}`
  return null
}

async function handleItemClick(n: NotificationResponse) {
  if (!n.isRead) {
    try {
      await markAsRead(n.id)
    } catch {
      /* ignore */
    }
  }
  const path = resolveRoute(n)
  if (path) {
    emit('close')
    await router.push(path)
  }
}

async function handleDismiss(e: Event, id: number) {
  e.stopPropagation()
  try {
    await dismiss(id)
  } catch {
    /* ignore */
  }
}

async function handleMarkAll() {
  if (count.value.unread <= 0) return
  try {
    await markAllAsRead()
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div v-if="open" class="rc-head__notif-panel" role="dialog" aria-label="Bildirimler">
    <div class="rc-head__notif-head">
      <span class="rc-head__notif-title">
        Bildirimler
        <span v-if="count.unread > 0" class="rc-head__notif-count-badge">{{ count.unread }}</span>
      </span>
      <button type="button" class="rc-head__notif-close" aria-label="Kapat" @click="emit('close')">
        <RcIcon name="close" :size="16" />
      </button>
    </div>

    <div v-if="loading && items.length === 0" class="rc-head__notif-loading">
      Yükleniyor…
    </div>
    <div v-else-if="items.length === 0" class="rc-head__notif-empty">
      <RcIcon name="bell" :size="28" />
      <p>Henüz bildirim yok</p>
      <small>Sistem uyarıları burada görünecek</small>
    </div>
    <ul v-else class="rc-head__notif-list" role="list">
      <li
        v-for="n in items"
        :key="n.id"
        class="rc-head__notif-item"
        :class="{
          'rc-head__notif-item--unread': !n.isRead,
          'rc-head__notif-item--urgent': n.isUrgent,
          'rc-head__notif-item--high': n.priority === 'HIGH' || n.priority === 'URGENT',
        }"
        role="listitem"
        @click="handleItemClick(n)"
      >
        <div class="rc-head__notif-item-main">
          <div class="rc-head__notif-item-title">{{ n.title }}</div>
          <div class="rc-head__notif-item-msg">{{ n.message }}</div>
          <div class="rc-head__notif-item-time">{{ formatRelative(n.createdAt) }}</div>
        </div>
        <button
          type="button"
          class="rc-head__notif-dismiss"
          aria-label="Kapat"
          @click="handleDismiss($event, n.id)"
        >
          <RcIcon name="close" :size="12" />
        </button>
      </li>
    </ul>

    <div v-if="items.length > 0" class="rc-head__notif-foot">
      <RcButton variant="ghost" size="sm" :disabled="count.unread <= 0" @click="handleMarkAll">
        Tümünü okundu işaretle
      </RcButton>
    </div>
  </div>
</template>
