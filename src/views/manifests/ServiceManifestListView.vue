<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { serviceManifestsApi } from '@/api'
import { useToast } from '@/composables'
import ManifestCreateModal from '@/components/manifests/ManifestCreateModal.vue'
import { RcPageHeader, RcButton, RcEmpty, RcBadge, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import type { UetdsManifest } from '@/types/manifest'

const router = useRouter()
const toast = useToast()

const manifests = ref<UetdsManifest[]>([])
const loading = ref(true)
const totalCount = ref(0)
const currentPage = ref(0)
const pageSize = ref(20)
const showCreateModal = ref(false)

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

async function loadManifests() {
  loading.value = true
  try {
    const response = await serviceManifestsApi.list({
      page: currentPage.value,
      size: pageSize.value,
      sort: 'tripStartAt',
      direction: 'desc',
    })
    manifests.value = response.content
    totalCount.value = response.totalElements
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Manifestolar yüklenemedi')
  } finally {
    loading.value = false
  }
}

function openDetail(id: number) {
  router.push({ name: 'service-manifest-detail', params: { id } })
}

function handlePageChange(page: number) {
  currentPage.value = page
  void loadManifests()
}

onMounted(() => {
  void loadManifests()
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

    <RcTableSkeleton v-if="loading" :rows="8" :cols="6" />

    <RcEmpty
      v-else-if="manifests.length === 0"
      title="Manifesto kaydı yok"
      description="Servis kiralaması için UETDS sefer manifestosu oluşturabilirsiniz"
    >
      <template #icon><RcIcon name="globe" :size="32" /></template>
      <RcButton variant="primary" @click="showCreateModal = true">İlk manifestoyu oluştur</RcButton>
    </RcEmpty>

    <div v-else class="rc-card" style="overflow: hidden">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th>Sefer no</th>
            <th>Plaka</th>
            <th>Kiralama</th>
            <th>Başlangıç</th>
            <th>Yolcu</th>
            <th>Kaynak</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="manifest in manifests"
            :key="manifest.id"
            style="cursor: pointer"
            @click="openDetail(manifest.id)"
          >
            <td>
              <div class="rcr-row__primary rcr-row__mono">{{ manifest.uetdsTripNumber }}</div>
              <div class="rcr-row__secondary">{{ manifest.groupName || '—' }}</div>
            </td>
            <td>{{ manifest.vehiclePlate }}</td>
            <td>{{ manifest.rentalNumber }}</td>
            <td class="rc-mono" style="font-size: 12.5px">{{ formatDateTime(manifest.tripStartAt) }}</td>
            <td class="rc-num">{{ manifest.passengerCount ?? '—' }}</td>
            <td>
              <RcBadge :variant="manifest.source === 'UPLOAD' ? 'info' : 'default'">
                {{ manifest.source === 'UPLOAD' ? 'PDF' : 'Manuel' }}
              </RcBadge>
            </td>
          </tr>
        </tbody>
      </table>
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
      @created="loadManifests"
    />
  </div>
</template>
