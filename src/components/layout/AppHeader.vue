<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { RcIcon } from '@/components/icons'
import { RcButton, RcKbd } from '@/components/rc'
import { useAuthStore } from '@/stores'
import { useNotifications } from '@/composables/useNotifications'
import { useTheme } from '@/composables/useTheme'
import AppBreadcrumb from './AppBreadcrumb.vue'
import NotificationPanel from './NotificationPanel.vue'

defineEmits<{
  'toggle-sidebar': []
}>()

const authStore = useAuthStore()
const router = useRouter()
const { count, refresh, startPolling, stopPolling } = useNotifications()
const { isDark, toggleTheme } = useTheme()

const notifOpen = ref(false)
const notifWrapRef = ref<HTMLElement | null>(null)

const unreadBadge = computed(() => {
  const n = count.value.unread
  if (n <= 0) return null
  return n > 99 ? '99+' : String(n)
})

function goToNewRental() {
  router.push({ name: 'rental-create' })
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}

function toggleNotifications() {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) {
    void refresh()
  }
}

function closeNotifications() {
  notifOpen.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (!notifOpen.value) return
  const el = notifWrapRef.value
  if (el && !el.contains(e.target as Node)) {
    notifOpen.value = false
  }
}

onMounted(() => {
  void refresh()
  startPolling()
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('focus', refresh)
})

onBeforeUnmount(() => {
  stopPolling()
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('focus', refresh)
})
</script>

<template>
  <header class="rc-head">
    <button
      type="button"
      class="rc-head__menu"
      aria-label="Kenar çubuğunu aç/kapat"
      @click="$emit('toggle-sidebar')"
    >
      <RcIcon name="dot3v" />
    </button>

    <AppBreadcrumb />

    <div class="rc-head__actions">
      <div ref="notifWrapRef" class="rc-head__notif-wrap">
        <RcButton
          variant="ghost"
          icon
          aria-label="Bildirimler"
          :class="{ 'rc-head__notif-btn--active': notifOpen }"
          @click.stop="toggleNotifications"
        >
          <RcIcon name="bell" />
          <span v-if="unreadBadge" class="rc-head__notif-badge">{{ unreadBadge }}</span>
        </RcButton>
        <NotificationPanel :open="notifOpen" @close="closeNotifications" />
      </div>

      <RcButton
        variant="ghost"
        icon
        class="rc-head__theme-btn"
        :aria-label="isDark ? 'Açık moda geç' : 'Koyu moda geç'"
        @click="toggleTheme"
      >
        <RcIcon :name="isDark ? 'sun' : 'moon'" />
      </RcButton>

      <RcButton variant="ghost" icon aria-label="Çıkış yap" @click="handleLogout">
        <RcIcon name="logout" />
      </RcButton>
      <span class="rc-vr" style="height: 24px" />
      <RcButton variant="secondary" @click="goToNewRental">
        <RcIcon name="plus" />
        Yeni Kiralama
        <RcKbd>N</RcKbd>
      </RcButton>
    </div>
  </header>
</template>
