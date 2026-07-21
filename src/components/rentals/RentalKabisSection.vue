<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { kabisApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import KabisStatusBadge from '@/components/kabis/KabisStatusBadge.vue'
import { RcEmpty, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import { kabisTypeLabel, type KabisNotification } from '@/types/kabis'

const props = defineProps<{
  rentalId: number
}>()

const router = useRouter()
const toast = useToast()
const { isEnabled } = useFeatures()

const notifications = ref<KabisNotification[]>([])
const loadingNotifications = ref(true)
const retrying = ref<number | null>(null)

const typeVariant: Record<string, 'success' | 'info' | 'purple' | 'default'> = {
  DELIVERY: 'success',
  RETURN: 'info',
  UPDATE: 'purple',
  CANCEL: 'default',
}

async function loadNotifications() {
  if (!isEnabled('KABIS_NOTIFICATIONS')) {
    loadingNotifications.value = false
    return
  }
  loadingNotifications.value = true
  try {
    notifications.value = await kabisApi.listByRental(props.rentalId)
  } catch (err) {
    toast.apiError(err, 'KABİS bildirimleri yüklenemedi')
  } finally {
    loadingNotifications.value = false
  }
}

async function retryNotification(id: number) {
  retrying.value = id
  try {
    await kabisApi.retry(id)
    toast.success('Bildirim yeniden gönderildi')
    await loadNotifications()
  } catch (err) {
    toast.apiError(err, 'Yeniden gönderim başarısız')
  } finally {
    retrying.value = null
  }
}

function openDetail(id: number) {
  router.push({ name: 'kabis-notification-detail', params: { id } })
}

onMounted(loadNotifications)
watch(() => props.rentalId, loadNotifications)
</script>

<template>
  <FeatureGate feature="KABIS_NOTIFICATIONS">
    <div class="rk">
      <div class="rk__head">
        <div>
          <h3 class="rk__title">KABİS bildirimleri</h3>
          <p class="rk__sub">
            Aktivasyon, uzatma, iade ve iptalde otomatik oluşturulur; EGM entegrasyonu
            aktifleşene dek gönderim kuyruğunda bekler
          </p>
        </div>
      </div>

      <div v-if="loadingNotifications" class="rc-skeleton" style="height: 80px" />
      <RcEmpty
        v-else-if="notifications.length === 0"
        title="Bildirim kaydı yok"
        description="Kiralama aktivasyonu veya iade sırasında KABİS bildirimleri burada görünür"
      />
      <div v-else class="rk__list">
        <div
          v-for="item in notifications"
          :key="item.id"
          class="rk-row"
          @click="openDetail(item.id)"
        >
          <RcBadge :variant="typeVariant[item.notificationType] ?? 'default'">
            {{ kabisTypeLabel(item.notificationType) }}
          </RcBadge>
          <div class="rk-row__main">
            <span class="rk-row__date">{{ formatDateTime(item.createdAt) }}</span>
            <span v-if="item.lastError" class="rk-row__error">{{ item.lastError }}</span>
          </div>
          <KabisStatusBadge :status="item.status" />
          <button
            v-if="item.status === 'FAILED'"
            type="button"
            class="rk-retry"
            :disabled="retrying === item.id"
            @click.stop="retryNotification(item.id)"
          >
            <RcIcon name="refresh" :size="13" :stroke-width="1.8" />
            Yeniden dene
          </button>
        </div>
      </div>
    </div>
  </FeatureGate>
</template>

<style scoped>
.rk__head { margin-bottom: 12px; }
.rk__title { margin: 0; font-size: 16px; font-weight: 600; }
.rk__sub { margin: 4px 0 0; font-size: 13px; color: var(--rc-text-muted); }

.rk__list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-10);
  overflow: hidden;
}
.rk-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--rc-border-subtle);
  cursor: pointer;
  transition: background var(--rc-dur-fast);
}
.rk-row:last-child { border-bottom: none; }
.rk-row:hover { background: var(--rc-surface-hover); }
.rk-row__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rk-row__date { font-size: 13px; color: var(--rc-text-soft); }
.rk-row__error {
  font-size: 12px;
  color: var(--rc-danger-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rk-retry {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border-radius: var(--rc-r-6);
  font-size: 12px;
  font-weight: 500;
  color: var(--rc-text-soft);
  background: var(--rc-surface-2);
  flex-shrink: 0;
  transition: background var(--rc-dur-fast);
}
.rk-retry:hover:not(:disabled) { background: var(--rc-surface-hover); }
.rk-retry:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
