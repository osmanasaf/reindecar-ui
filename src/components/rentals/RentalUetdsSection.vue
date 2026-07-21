<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { serviceManifestsApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import ManifestCreateModal from '@/components/manifests/ManifestCreateModal.vue'
import { RcButton, RcEmpty } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import { resolveTripStatus } from '@/utils/tripStatus'
import type { UetdsManifest } from '@/types/manifest'

const props = defineProps<{
  rentalId: number
  rentalNumber?: string
  vehiclePlate?: string
}>()

const router = useRouter()
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

function openManifest(id: number) {
  router.push({ name: 'service-manifest-detail', params: { id } })
}

onMounted(loadManifests)
watch(() => props.rentalId, loadManifests)
</script>

<template>
  <FeatureGate feature="UETDS_MANIFESTS">
    <div class="ru">
      <div class="ru__head">
        <div>
          <h3 class="ru__title">UETDS sefer manifestoları</h3>
          <p class="ru__sub">Bu servis kiralamasına bağlı sefer manifesto kayıtları</p>
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
      <div v-else class="ru__list">
        <button
          v-for="manifest in manifests"
          :key="manifest.id"
          type="button"
          class="ru-row"
          @click="openManifest(manifest.id)"
        >
          <span class="ru-row__icon"><RcIcon name="globe" :size="16" /></span>
          <div class="ru-row__main">
            <span class="ru-row__trip rc-mono">{{ manifest.uetdsTripNumber }}</span>
            <span class="ru-row__meta">
              {{ manifest.vehiclePlate }} · {{ formatDateTime(manifest.tripStartAt) }}
            </span>
          </div>
          <span
            class="ru-tstatus"
            :class="`ru-tstatus--${resolveTripStatus(manifest.tripStartAt, manifest.tripEndAt).key}`"
          >
            <span
              class="ru-tstatus__dot"
              :class="{ 'rc-pulse': resolveTripStatus(manifest.tripStartAt, manifest.tripEndAt).key === 'ongoing' }"
            />
            {{ resolveTripStatus(manifest.tripStartAt, manifest.tripEndAt).label }}
          </span>
          <span class="ru-row__pax">
            <RcIcon name="users" :size="13" :stroke-width="1.7" />
            {{ manifest.passengerCount ?? 0 }}
          </span>
          <span class="ru-src" :class="manifest.source === 'UPLOAD' ? 'ru-src--pdf' : 'ru-src--manual'">
            {{ manifest.source === 'UPLOAD' ? 'PDF' : 'Manuel' }}
          </span>
          <RcIcon name="chevronRight" :size="16" class="ru-row__chevron" />
        </button>
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
.ru__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.ru__title { margin: 0; font-size: 16px; font-weight: 600; }
.ru__sub { margin: 4px 0 0; font-size: 13px; color: var(--rc-text-muted); }

.ru__list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-10);
  overflow: hidden;
}
.ru-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid var(--rc-border-subtle);
  transition: background var(--rc-dur-fast);
}
.ru-row:last-child { border-bottom: none; }
.ru-row:hover { background: var(--rc-surface-hover); }
.ru-row__icon {
  width: 32px;
  height: 32px;
  border-radius: var(--rc-r-8);
  background: var(--rc-surface-2);
  color: var(--rc-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ru-row__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ru-row__trip { font-size: 13px; font-weight: 500; }
.ru-row__meta {
  font-size: 12px;
  color: var(--rc-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ru-tstatus {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--rc-r-full);
  flex-shrink: 0;
}
.ru-tstatus__dot { width: 5px; height: 5px; border-radius: var(--rc-r-full); background: currentColor; }
.ru-tstatus--upcoming { background: var(--rc-accent-subtle); color: var(--rc-blue-700); }
.ru-tstatus--ongoing { background: var(--rc-success-50); color: var(--rc-success-700); }
.ru-tstatus--done { background: var(--rc-surface-2); color: var(--rc-text-muted); }
.ru-row__pax {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--rc-text-muted);
  padding: 4px 10px;
  border-radius: var(--rc-r-full);
  background: var(--rc-surface-2);
  flex-shrink: 0;
}
.ru-src {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--rc-r-full);
  flex-shrink: 0;
}
.ru-src--pdf { background: var(--rc-info-50); color: var(--rc-info-700); }
.ru-src--manual { background: var(--rc-surface-2); color: var(--rc-text-muted); }
.ru-row__chevron { color: var(--rc-text-faint); flex-shrink: 0; }

@media (max-width: 640px) {
  .ru-tstatus,
  .ru-row__pax { display: none; }
}
</style>
