<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { serviceManifestsApi } from '@/api'
import { FILE_UPLOAD_TYPE_LABELS, type FileRecord, type FileUploadType } from '@/api/files.api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import { RcField } from '@/components/rc'
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

const typeCards = computed(() =>
  documentTypes.map((type) => ({
    type,
    label: FILE_UPLOAD_TYPE_LABELS[type],
    uploaded: documents.value.some((doc) => doc.uploadType === type),
  })),
)

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
            <div class="rc-card__desc">Sefere bağlı resmi belgeler</div>
          </div>
        </div>
      </div>
      <div class="rc-card__body">
        <!-- Belge tipi durum kartları -->
        <div class="md-doc-grid">
          <div
            v-for="card in typeCards"
            :key="card.type"
            class="md-doc"
            :class="{ 'md-doc--ok': card.uploaded }"
          >
            <span class="md-doc__icon" :class="card.uploaded ? 'md-doc__icon--ok' : 'md-doc__icon--muted'">
              <RcIcon :name="card.uploaded ? 'checkCircle' : 'warning'" :size="16" :stroke-width="1.8" />
            </span>
            <div class="md-doc__text">
              <div class="md-doc__label">{{ card.label }}</div>
              <div class="md-doc__meta" :class="{ 'md-doc__meta--ok': card.uploaded }">
                {{ card.uploaded ? 'Yüklendi' : 'Eksik — yüklenmedi' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Yükleme kontrolü -->
        <div class="rcs-form-grid md-doc-upload">
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
      </div>
    </div>
  </FeatureGate>
</template>

<style scoped>
.md-doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.md-doc {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 14px;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-10);
  background: var(--rc-surface-2);
}
.md-doc--ok { background: var(--rc-surface); }
.md-doc__icon {
  width: 34px;
  height: 34px;
  border-radius: var(--rc-r-8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.md-doc__icon--ok { background: var(--rc-success-50); color: var(--rc-success-700); }
.md-doc__icon--muted { background: var(--rc-surface-2); color: var(--rc-text-faint); }
.md-doc__text { flex: 1; min-width: 0; }
.md-doc__label { font-size: 12.5px; font-weight: 500; color: var(--rc-text); }
.md-doc__meta { font-size: 11.5px; color: var(--rc-text-muted); }
.md-doc__meta--ok { color: var(--rc-success-700); }

.md-doc-upload { margin-top: 16px; }
</style>
