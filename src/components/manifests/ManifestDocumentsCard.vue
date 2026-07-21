<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { serviceManifestsApi } from '@/api'
import { FILE_UPLOAD_TYPE_LABELS, type FileRecord, type FileUploadType } from '@/api/files.api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import { RcEmpty, RcField, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'

const props = defineProps<{
  manifestId: number
}>()

const toast = useToast()
const { isEnabled } = useFeatures()

const documents = ref<FileRecord[]>([])
const uploading = ref(false)
const uploadType = ref<FileUploadType>('UETDS_SEFER_MANIFEST')

const documentTypes: FileUploadType[] = ['UETDS_SEFER_MANIFEST', 'SERVICE_ROUTE_PERMIT', 'PASSENGER_LIST']

async function loadDocuments() {
  if (!isEnabled('UETDS_DOCUMENTS')) return
  try {
    documents.value = await serviceManifestsApi.listDocuments(props.manifestId)
  } catch (err) {
    toast.apiError(err, 'Belgeler yüklenemedi')
  }
}

async function handleUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    await serviceManifestsApi.uploadDocument(props.manifestId, file, uploadType.value)
    await loadDocuments()
    toast.success('Belge yüklendi')
  } catch (err) {
    toast.apiError(err, 'Belge yüklenemedi')
  } finally {
    uploading.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

onMounted(loadDocuments)
watch(() => props.manifestId, loadDocuments)
</script>

<template>
  <FeatureGate feature="UETDS_DOCUMENTS">
    <div class="rc-card rc-animate-in">
      <div class="rc-card__head">
        <div class="rc-card__head-lead">
          <span class="rc-card__icon"><RcIcon name="folder" :size="16" /></span>
          <div>
            <h2 class="rc-card__title">Belgeler</h2>
            <div class="rc-card__desc">Sefer manifesti, güzergah izni ve yolcu listesi belgeleri</div>
          </div>
        </div>
      </div>
      <div class="rc-card__body">
        <div class="rcs-form-grid" style="margin-bottom: 16px">
          <RcField label="Belge tipi">
            <select v-model="uploadType" class="rc-input">
              <option v-for="type in documentTypes" :key="type" :value="type">
                {{ FILE_UPLOAD_TYPE_LABELS[type] }}
              </option>
            </select>
          </RcField>
          <RcField label="Dosya">
            <input type="file" class="rc-input" :disabled="uploading" @change="handleUpload" />
          </RcField>
        </div>

        <RcEmpty v-if="documents.length === 0" title="Belge yok" />
        <ul v-else class="manifest-doc-list">
          <li v-for="doc in documents" :key="doc.id">
            <span>{{ doc.fileName }}</span>
            <RcBadge>{{ FILE_UPLOAD_TYPE_LABELS[doc.uploadType as FileUploadType] || doc.uploadType }}</RcBadge>
          </li>
        </ul>
      </div>
    </div>
  </FeatureGate>
</template>

<style scoped>
.manifest-doc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.manifest-doc-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-8);
  transition: border-color var(--rc-dur-fast), background var(--rc-dur-fast);
}
.manifest-doc-list li:hover {
  border-color: var(--rc-border-strong);
  background: var(--rc-surface-2);
}
</style>
