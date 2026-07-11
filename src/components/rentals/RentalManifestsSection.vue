<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { serviceManifestsApi, kabisApi } from '@/api'
import { useToast } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import KabisStatusBadge from '@/components/kabis/KabisStatusBadge.vue'
import ManifestCreateModal from '@/components/manifests/ManifestCreateModal.vue'
import { RcButton, RcBadge, RcEmpty } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import type { UetdsManifest } from '@/types/manifest'
import type { KabisNotification } from '@/types/kabis'

const props = defineProps<{
  rentalId: number
  rentalNumber?: string
  vehiclePlate?: string
}>()

const toast = useToast()

const manifests = ref<UetdsManifest[]>([])
const loadingManifests = ref(true)
const showCreateModal = ref(false)

const notifications = ref<KabisNotification[]>([])
const loadingNotifications = ref(true)
const retrying = ref<number | null>(null)

const typeLabels: Record<string, string> = {
  DELIVERY: 'Teslim',
  RETURN: 'İade',
  UPDATE: 'Güncelleme',
  CANCEL: 'İptal',
}

async function loadManifests() {
  loadingManifests.value = true
  try {
    manifests.value = await serviceManifestsApi.listByRental(props.rentalId)
  } catch (err) {
    toast.apiError(err, 'Manifestolar yüklenemedi')
  } finally {
    loadingManifests.value = false
  }
}

async function loadNotifications() {
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

function handleManifestCreated() {
  showCreateModal.value = false
  void loadManifests()
}

function load() {
  void loadManifests()
  void loadNotifications()
}

onMounted(load)
watch(() => props.rentalId, load)
</script>

<template>
  <div class="rcr-manifests">
    <FeatureGate feature="UETDS_MANIFESTS">
      <div class="rcr-manifests__head">
        <div>
          <h3 class="rcr-manifests__title">UETDS sefer manifestoları</h3>
          <p class="rcr-manifests__sub">Bu kiralamaya bağlı sefer manifesto kayıtları</p>
        </div>
        <RcButton variant="secondary" size="sm" @click="showCreateModal = true">
          <RcIcon name="plus" :size="14" />
          Yeni manifesto
        </RcButton>
      </div>

      <div v-if="loadingManifests" class="rc-skeleton" style="height: 80px" />
      <RcEmpty
        v-else-if="manifests.length === 0"
        title="Manifesto kaydı yok"
        description="Bu kiralama için henüz UETDS sefer manifestosu oluşturulmamış"
      />
      <div v-else class="rcr-manifests__list">
        <RouterLink
          v-for="manifest in manifests"
          :key="manifest.id"
          :to="{ name: 'service-manifest-detail', params: { id: manifest.id } }"
          class="list-row list-row-clickable"
        >
          <div class="list-row-main">
            <span class="list-row-title">{{ manifest.uetdsTripNumber }}</span>
            <span class="list-row-meta">
              {{ manifest.vehiclePlate }} · {{ formatDateTime(manifest.tripStartAt) }}
              <span v-if="manifest.passengerCount != null"> · {{ manifest.passengerCount }} yolcu</span>
            </span>
          </div>
          <RcBadge :variant="manifest.source === 'UPLOAD' ? 'info' : 'default'">
            {{ manifest.source === 'UPLOAD' ? 'PDF' : 'Manuel' }}
          </RcBadge>
        </RouterLink>
      </div>
    </FeatureGate>

    <FeatureGate feature="KABIS_NOTIFICATIONS">
      <div class="rcr-manifests__head" style="margin-top: 20px">
        <div>
          <h3 class="rcr-manifests__title">KABİS bildirimleri</h3>
          <p class="rcr-manifests__sub">EGM kiralık araç bildirim durumu</p>
        </div>
      </div>

      <div v-if="loadingNotifications" class="rc-skeleton" style="height: 80px" />
      <RcEmpty
        v-else-if="notifications.length === 0"
        title="Bildirim kaydı yok"
        description="Kiralama aktivasyonu veya iade sırasında KABİS bildirimleri burada görünür"
      />
      <div v-else class="rcr-manifests__list">
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
    </FeatureGate>

    <ManifestCreateModal
      :open="showCreateModal"
      :rental-id="rentalId"
      :rental-label="rentalNumber"
      :vehicle-plate="vehiclePlate"
      @close="showCreateModal = false"
      @created="handleManifestCreated"
    />
  </div>
</template>

<style scoped>
.rcr-manifests__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.rcr-manifests__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.rcr-manifests__sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--rc-text-muted);
}

.rcr-manifests__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
