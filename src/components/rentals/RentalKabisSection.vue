<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { kabisApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import KabisStatusBadge from '@/components/kabis/KabisStatusBadge.vue'
import { RcButton, RcEmpty } from '@/components/rc'
import { formatDateTime } from '@/utils/format'
import type { KabisNotification } from '@/types/kabis'

const props = defineProps<{
  rentalId: number
}>()

const toast = useToast()
const { isEnabled } = useFeatures()

const notifications = ref<KabisNotification[]>([])
const loadingNotifications = ref(true)
const retrying = ref<number | null>(null)

const typeLabels: Record<string, string> = {
  DELIVERY: 'Teslim',
  RETURN: 'İade',
  UPDATE: 'Güncelleme',
  CANCEL: 'İptal',
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

onMounted(loadNotifications)
watch(() => props.rentalId, loadNotifications)
</script>

<template>
  <FeatureGate feature="KABIS_NOTIFICATIONS">
    <div class="rcr-kabis">
      <div class="rcr-kabis__head">
        <div>
          <h3 class="rcr-kabis__title">KABİS bildirimleri</h3>
          <p class="rcr-kabis__sub">EGM kiralık araç bildirim durumu</p>
        </div>
      </div>

      <div v-if="loadingNotifications" class="rc-skeleton" style="height: 80px" />
      <RcEmpty
        v-else-if="notifications.length === 0"
        title="Bildirim kaydı yok"
        description="Kiralama aktivasyonu veya iade sırasında KABİS bildirimleri burada görünür"
      />
      <div v-else class="rcr-kabis__list">
        <div v-for="item in notifications" :key="item.id" class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">{{ typeLabels[item.notificationType] || item.notificationType }}</span>
            <span class="list-row-meta">
              {{ formatDateTime(item.createdAt) }}
              <span v-if="item.lastError"> · {{ item.lastError }}</span>
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px">
            <KabisStatusBadge :status="item.status" />
            <RcButton
              v-if="item.status === 'FAILED'"
              variant="ghost"
              size="sm"
              :disabled="retrying === item.id"
              @click="retryNotification(item.id)"
            >
              Yeniden dene
            </RcButton>
          </div>
        </div>
      </div>
    </div>
  </FeatureGate>
</template>

<style scoped>
.rcr-kabis__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.rcr-kabis__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.rcr-kabis__sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--rc-text-muted);
}

.rcr-kabis__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
