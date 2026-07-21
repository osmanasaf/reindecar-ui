<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { serviceManifestsApi } from '@/api'
import { useToast } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import ManifestFormCard from '@/components/manifests/ManifestFormCard.vue'
import ManifestPassengersCard from '@/components/manifests/ManifestPassengersCard.vue'
import ManifestDocumentsCard from '@/components/manifests/ManifestDocumentsCard.vue'
import { RcButton, RcField, RcBadge, RcDetailSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import type { UetdsManifest } from '@/types/manifest'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const manifest = ref<UetdsManifest | null>(null)
const loading = ref(true)
const uploadingPdf = ref(false)
const showDeleteConfirm = ref(false)

const manifestId = computed(() => Number(route.params.id))

async function loadManifest() {
  loading.value = true
  try {
    manifest.value = await serviceManifestsApi.getById(manifestId.value)
  } catch (err) {
    toast.apiError(err, 'Manifesto yüklenemedi')
    router.push({ name: 'service-manifests' })
    return
  } finally {
    loading.value = false
  }
  if (route.hash === '#yolcular') {
    await nextTick()
    document.getElementById('yolcular')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function handlePdfUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingPdf.value = true
  try {
    manifest.value = await serviceManifestsApi.attachPdf(manifestId.value, file)
    toast.success('PDF eklendi')
  } catch (err) {
    toast.apiError(err, 'PDF yüklenemedi')
  } finally {
    uploadingPdf.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

async function handleDeleteManifest() {
  try {
    await serviceManifestsApi.remove(manifestId.value)
    toast.success('Manifesto silindi')
    router.push({ name: 'service-manifests' })
  } catch (err) {
    toast.apiError(err, 'Silinemedi')
  } finally {
    showDeleteConfirm.value = false
  }
}

onMounted(() => {
  void loadManifest()
})
</script>

<template>
  <div class="rc-page">
    <div class="rc-page__toolbar">
      <RcButton variant="secondary" @click="router.push({ name: 'service-manifests' })">
        <RcIcon name="chevronLeft" :size="14" />
        Listeye dön
      </RcButton>
      <div style="display: flex; gap: 8px">
        <RcButton
          variant="secondary"
          @click="router.push({ name: 'rental-detail', params: { id: manifest?.rentalId } })"
        >
          <RcIcon name="key" :size="14" />
          Kiralamaya git
        </RcButton>
        <RcButton variant="danger" @click="showDeleteConfirm = true">Sil</RcButton>
      </div>
    </div>

    <RcDetailSkeleton v-if="loading" />

    <div v-else-if="manifest" class="manifest-detail">
      <div class="rc-card rc-animate-in">
        <div class="rc-card__head">
          <div class="rc-card__head-lead">
            <span class="rc-card__icon"><RcIcon name="globe" :size="18" /></span>
            <div>
              <h1 class="rc-card__title" style="font-size: 17px">{{ manifest.uetdsTripNumber }}</h1>
              <div class="rc-card__desc">
                {{ manifest.vehiclePlate }} · {{ manifest.rentalNumber }} ·
                {{ formatDateTime(manifest.tripStartAt) }}
              </div>
            </div>
          </div>
          <RcBadge :variant="manifest.source === 'UPLOAD' ? 'info' : 'default'">
            {{ manifest.source === 'UPLOAD' ? 'PDF' : 'Manuel' }}
          </RcBadge>
        </div>
        <div class="rc-card__body">
          <div class="manifest-detail__pdf">
            <RcField label="Manifesto PDF" :hint="manifest.pdfFile ? `${manifest.pdfFile.fileName} · ${formatDateTime(manifest.createdAt)}` : 'PDF eklemek belge doğrulamayı kolaylaştırır'">
              <input
                type="file"
                accept="application/pdf"
                class="rc-input"
                :disabled="uploadingPdf"
                @change="handlePdfUpload"
              />
            </RcField>
          </div>
        </div>
      </div>

      <ManifestFormCard :manifest="manifest" @updated="manifest = $event" />

      <ManifestPassengersCard :manifest-id="manifestId" />

      <ManifestDocumentsCard :manifest-id="manifestId" />
    </div>

    <AccountingConfirmModal
      :open="showDeleteConfirm"
      title="Manifestoyu sil"
      message="Bu sefer manifestosu kalıcı olarak silinecek."
      confirm-label="Sil"
      variant="danger"
      @close="showDeleteConfirm = false"
      @confirm="handleDeleteManifest"
    />
  </div>
</template>

<style scoped>
.manifest-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.manifest-detail__pdf {
  max-width: 440px;
}
</style>
