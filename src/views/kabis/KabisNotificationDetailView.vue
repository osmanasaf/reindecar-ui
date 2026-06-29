<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { kabisApi } from '@/api'
import { useToast } from '@/composables'
import KabisStatusBadge from '@/components/kabis/KabisStatusBadge.vue'
import { RcButton, RcDetailSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import type { KabisNotification } from '@/types/kabis'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const notification = ref<KabisNotification | null>(null)
const loading = ref(true)
const retrying = ref(false)

const notificationId = computed(() => Number(route.params.id))

const typeLabels: Record<string, string> = {
  DELIVERY: 'Teslim bildirimi',
  RETURN: 'İade bildirimi',
  UPDATE: 'Güncelleme bildirimi',
  CANCEL: 'İptal bildirimi',
}

async function loadNotification() {
  loading.value = true
  try {
    notification.value = await kabisApi.getById(notificationId.value)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Bildirim yüklenemedi')
    router.push({ name: 'kabis-notifications' })
  } finally {
    loading.value = false
  }
}

async function handleRetry() {
  if (!notification.value) return
  retrying.value = true
  try {
    notification.value = await kabisApi.retry(notification.value.id)
    toast.success('Bildirim yeniden gönderildi')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Yeniden gönderim başarısız')
  } finally {
    retrying.value = false
  }
}

onMounted(() => {
  void loadNotification()
})
</script>

<template>
  <div class="rc-page">
    <div class="rc-page__toolbar">
      <RcButton variant="secondary" @click="router.push({ name: 'kabis-notifications' })">
        <RcIcon name="chevronLeft" :size="14" />
        Listeye dön
      </RcButton>
      <RcButton
        v-if="notification?.status === 'FAILED'"
        variant="primary"
        :loading="retrying"
        @click="handleRetry"
      >
        Yeniden gönder
      </RcButton>
    </div>

    <RcDetailSkeleton v-if="loading" />

    <div v-else-if="notification" class="rc-card">
      <div class="rc-card__head">
        <div>
          <h1 class="rc-card__title">{{ typeLabels[notification.notificationType] || notification.notificationType }}</h1>
          <p class="rc-card__subtitle">Bildirim #{{ notification.id }}</p>
        </div>
        <KabisStatusBadge :status="notification.status" />
      </div>
      <div class="rc-card__body">
        <div class="rc-meta-grid">
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">Kiralama</span>
            <button
              type="button"
              class="rc-link-button"
              @click="router.push({ name: 'rental-detail', params: { id: notification.rentalId } })"
            >
              #{{ notification.rentalId }}
            </button>
          </div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">EGM referans</span>
            <span class="rc-meta-row__value">{{ notification.egmReferenceNumber || '—' }}</span>
          </div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">Deneme sayısı</span>
            <span class="rc-meta-row__value rc-num">{{ notification.attemptCount }}</span>
          </div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">Oluşturulma</span>
            <span class="rc-meta-row__value">{{ formatDateTime(notification.createdAt) }}</span>
          </div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">Son deneme</span>
            <span class="rc-meta-row__value">{{ notification.lastAttemptAt ? formatDateTime(notification.lastAttemptAt) : '—' }}</span>
          </div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">Gönderim</span>
            <span class="rc-meta-row__value">{{ notification.sentAt ? formatDateTime(notification.sentAt) : '—' }}</span>
          </div>
        </div>

        <div v-if="notification.lastError" class="rc-alert rc-alert--danger" style="margin-top: 16px">
          <RcIcon name="warning" :size="16" />
          <div>
            <div class="rc-alert__title">Son hata</div>
            <span>{{ notification.lastError }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rc-link-button {
  border: none;
  background: none;
  padding: 0;
  color: var(--rc-accent);
  cursor: pointer;
  font: inherit;
}
</style>
