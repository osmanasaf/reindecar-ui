<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { serviceManifestsApi } from '@/api'
import { useToast } from '@/composables'
import ManifestCreateModal from '@/components/manifests/ManifestCreateModal.vue'
import { RcPageHeader, RcButton, RcEmpty, RcBadge, RcTableSkeleton } from '@/components/rc'
import { RcIcon, type IconName } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import { resolveTripStatus } from '@/utils/tripStatus'
import type { UetdsManifest, UetdsManifestStats } from '@/types/manifest'

const router = useRouter()
const toast = useToast()

const manifests = ref<UetdsManifest[]>([])
const loading = ref(true)
const totalCount = ref(0)
const currentPage = ref(0)
const pageSize = ref(20)
const showCreateModal = ref(false)
const searchQuery = ref('')
const stats = ref<UetdsManifestStats>({ total: 0, upcoming: 0, ongoing: 0, done: 0, totalPassengers: 0 })

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

type SummaryCard = { label: string; value: number; icon: IconName; iconColor: string }

const summaryCards = computed<SummaryCard[]>(() => [
  { label: 'Toplam sefer', value: stats.value.total, icon: 'globe', iconColor: 'var(--rc-accent)' },
  { label: 'Yaklaşan', value: stats.value.upcoming, icon: 'calendar', iconColor: 'var(--rc-blue-500)' },
  { label: 'Devam eden', value: stats.value.ongoing, icon: 'route', iconColor: 'var(--rc-success-500)' },
  { label: 'Toplam yolcu', value: stats.value.totalPassengers, icon: 'users', iconColor: 'var(--rc-purple-500)' },
])

async function loadManifests() {
  loading.value = true
  try {
    const response = await serviceManifestsApi.list({
      page: currentPage.value,
      size: pageSize.value,
      sort: 'tripStartAt',
      direction: 'desc',
      search: searchQuery.value.trim() || undefined,
    })
    manifests.value = response.content
    totalCount.value = response.totalElements
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Manifestolar yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    stats.value = await serviceManifestsApi.stats()
  } catch {
    /* Özet kartları kritik değil — sessiz geç. */
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 0
    void loadManifests()
  }, 300)
})

function openDetail(id: number) {
  router.push({ name: 'service-manifest-detail', params: { id } })
}

function handleCreated(manifest: UetdsManifest) {
  openDetail(manifest.id)
}

function handlePageChange(page: number) {
  currentPage.value = page
  void loadManifests()
}

onMounted(() => {
  void loadManifests()
  void loadStats()
})
</script>

<template>
  <div class="rc-page">
    <RcPageHeader
      title="UETDS Manifestoları"
      subtitle="Servis kiralamalarına ait sefer manifesto kayıtları"
    >
      <template #actions>
        <RcButton variant="primary" @click="showCreateModal = true">
          <RcIcon name="plus" :size="14" />
          Yeni manifesto
        </RcButton>
      </template>
    </RcPageHeader>

    <!-- Özet kartları -->
    <div class="sm-stats">
      <div v-for="card in summaryCards" :key="card.label" class="sm-stat">
        <div class="sm-stat__head">
          <span class="sm-stat__icon" :style="{ color: card.iconColor }">
            <RcIcon :name="card.icon" :size="15" />
          </span>
          <span class="sm-stat__label">{{ card.label }}</span>
        </div>
        <div class="sm-stat__value rc-num">{{ card.value }}</div>
      </div>
    </div>

    <div class="sm-search">
      <RcIcon name="search" :size="15" class="sm-search__icon" />
      <input v-model="searchQuery" class="sm-search__input" placeholder="Sefer no, plaka veya güzergah…" />
    </div>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="5" />

    <RcEmpty
      v-else-if="manifests.length === 0"
      title="Manifesto kaydı yok"
      description="Servis kiralaması için UETDS sefer manifestosu oluşturabilirsiniz"
    >
      <template #icon><RcIcon name="globe" :size="32" /></template>
      <RcButton variant="primary" @click="showCreateModal = true">İlk manifestoyu oluştur</RcButton>
    </RcEmpty>

    <div v-else class="sm-table rc-animate-in">
      <div class="sm-row sm-row--head">
        <span>Sefer</span>
        <span>Plaka</span>
        <span>Başlangıç</span>
        <span>Yolcu</span>
        <span>Kaynak</span>
      </div>

      <div
        v-for="m in manifests"
        :key="m.id"
        class="sm-row sm-row--body"
        @click="openDetail(m.id)"
      >
        <div class="sm-cell-trip">
          <span class="sm-trip rc-mono">{{ m.uetdsTripNumber }}</span>
          <span class="sm-group">{{ m.groupName || m.groupRoute || '—' }}</span>
        </div>
        <span class="sm-plate">
          {{ m.vehiclePlate }}
          <span
            v-if="m.source === 'UPLOAD' && m.pdfPlateMatches === false"
            class="sm-plate-warn"
            :title="`Belge plakası (${m.parsedPlate || '—'}) araç plakasıyla uyuşmuyor`"
          >
            <RcIcon name="warning" :size="14" :stroke-width="1.8" />
          </span>
        </span>
        <div class="sm-cell-start">
          <span class="sm-start rc-mono">{{ formatDateTime(m.tripStartAt) }}</span>
          <span
            class="sm-tstatus"
            :class="`sm-tstatus--${resolveTripStatus(m.tripStartAt, m.tripEndAt).key}`"
          >
            <span
              class="sm-tstatus__dot"
              :class="{ 'rc-pulse': resolveTripStatus(m.tripStartAt, m.tripEndAt).key === 'ongoing' }"
            />
            {{ resolveTripStatus(m.tripStartAt, m.tripEndAt).label }}
          </span>
        </div>
        <span class="sm-pax">
          <RcIcon name="users" :size="13" :stroke-width="1.7" />
          {{ m.passengerCount ?? 0 }}
        </span>
        <div>
          <RcBadge :variant="m.source === 'UPLOAD' ? 'info' : 'default'">
            {{ m.source === 'UPLOAD' ? 'PDF' : 'Manuel' }}
          </RcBadge>
        </div>
      </div>
    </div>

    <div v-if="!loading && totalPages > 1" class="rca-pagination">
      <RcButton variant="secondary" :disabled="currentPage === 0" @click="handlePageChange(currentPage - 1)">
        Önceki
      </RcButton>
      <span style="font-size: 13px; color: var(--rc-text-muted)">Sayfa {{ currentPage + 1 }} / {{ totalPages }}</span>
      <RcButton variant="secondary" :disabled="currentPage >= totalPages - 1" @click="handlePageChange(currentPage + 1)">
        Sonraki
      </RcButton>
    </div>

    <ManifestCreateModal
      :open="showCreateModal"
      @close="showCreateModal = false"
      @created="handleCreated"
    />
  </div>
</template>

<style scoped>
.sm-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.sm-stat {
  background: var(--rc-surface);
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-12);
  padding: 14px 16px;
  box-shadow: var(--rc-shadow-sm);
}
.sm-stat__head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--rc-text-muted);
}
.sm-stat__icon { display: inline-flex; }
.sm-stat__label { font-size: 12px; font-weight: 500; }
.sm-stat__value {
  font-family: var(--rc-font-mono);
  font-size: 24px;
  font-weight: 600;
  margin-top: 6px;
}

.sm-search {
  position: relative;
  max-width: 340px;
  margin-bottom: 14px;
}
.sm-search__icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--rc-text-faint);
}
.sm-search__input {
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-8);
  font-size: 13px;
  outline: none;
  box-shadow: var(--rc-shadow-sm);
  transition: border-color var(--rc-dur-base), box-shadow var(--rc-dur-base);
}
.sm-search__input:focus {
  border-color: var(--rc-accent);
  box-shadow: var(--rc-focus-ring);
}

.sm-table {
  background: var(--rc-surface);
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-12);
  box-shadow: var(--rc-shadow-sm);
  overflow: hidden;
}
.sm-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.3fr) 128px minmax(160px, 1fr) 92px 104px;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--rc-border-subtle);
}
.sm-row--head {
  padding: 11px 16px;
  background: var(--rc-surface-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--rc-tracking-wide);
  text-transform: uppercase;
  color: var(--rc-text-faint);
}
.sm-row--body {
  cursor: pointer;
  transition: background var(--rc-dur-fast);
}
.sm-row--body:hover { background: var(--rc-surface-hover); }
.sm-row--body:last-child { border-bottom: none; }

.sm-cell-trip { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.sm-trip { font-size: 13px; font-weight: 500; color: var(--rc-text); }
.sm-group {
  font-size: 12px;
  color: var(--rc-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sm-plate {
  font-size: 13px;
  color: var(--rc-text-soft);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sm-plate-warn { display: inline-flex; color: var(--rc-warning-700); }

.sm-cell-start { display: flex; flex-direction: column; gap: 3px; }
.sm-start { font-size: 12.5px; color: var(--rc-text-soft); }
.sm-tstatus {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--rc-r-full);
}
.sm-tstatus__dot {
  width: 5px;
  height: 5px;
  border-radius: var(--rc-r-full);
  background: currentColor;
  flex-shrink: 0;
}
.sm-tstatus--upcoming { background: var(--rc-accent-subtle); color: var(--rc-blue-700); }
.sm-tstatus--ongoing { background: var(--rc-success-50); color: var(--rc-success-700); }
.sm-tstatus--done { background: var(--rc-surface-2); color: var(--rc-text-muted); }

.sm-pax {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--rc-text-soft);
}
.sm-empty-inline {
  padding: 40px;
  text-align: center;
  color: var(--rc-text-muted);
  font-size: 13.5px;
}

@media (max-width: 720px) {
  .sm-row { grid-template-columns: 1fr auto auto; }
  .sm-row > :nth-child(3) { display: none; }
}
</style>
