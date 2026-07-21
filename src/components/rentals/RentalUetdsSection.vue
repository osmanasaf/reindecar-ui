<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { serviceManifestsApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import ManifestCreateModal from '@/components/manifests/ManifestCreateModal.vue'
import { RcButton, RcBadge, RcEmpty } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import type { UetdsManifest } from '@/types/manifest'

const props = defineProps<{
  rentalId: number
  rentalNumber?: string
  vehiclePlate?: string
}>()

const toast = useToast()
const { isEnabled } = useFeatures()

const manifests = ref<UetdsManifest[]>([])
const loadingManifests = ref(true)
const showCreateModal = ref(false)

async function loadManifests() {
  if (!isEnabled('UETDS_MANIFESTS')) {
    loadingManifests.value = false
    return
  }
  loadingManifests.value = true
  try {
    manifests.value = await serviceManifestsApi.listByRental(props.rentalId)
  } catch (err) {
    toast.apiError(err, 'Manifestolar yüklenemedi')
  } finally {
    loadingManifests.value = false
  }
}

function handleManifestCreated() {
  showCreateModal.value = false
  void loadManifests()
}

onMounted(loadManifests)
watch(() => props.rentalId, loadManifests)
</script>

<template>
  <FeatureGate feature="UETDS_MANIFESTS">
    <div class="rcr-uetds">
      <div class="rcr-uetds__head">
        <div>
          <h3 class="rcr-uetds__title">UETDS sefer manifestoları</h3>
          <p class="rcr-uetds__sub">Bu servis kiralamasına bağlı sefer manifesto kayıtları</p>
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
      <div v-else class="rcr-uetds__list">
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

      <ManifestCreateModal
        :open="showCreateModal"
        :rental-id="rentalId"
        :rental-label="rentalNumber"
        :vehicle-plate="vehiclePlate"
        @close="showCreateModal = false"
        @created="handleManifestCreated"
      />
    </div>
  </FeatureGate>
</template>

<style scoped>
.rcr-uetds__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.rcr-uetds__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.rcr-uetds__sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--rc-text-muted);
}

.rcr-uetds__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
