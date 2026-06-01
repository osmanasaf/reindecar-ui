<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { filesApi, FILE_UPLOAD_TYPE_LABELS, ALLOWED_TYPES_BY_REFERENCE } from '@/api/files.api'
import type { FileRecord, FileReferenceType, FileUploadType } from '@/api/files.api'
import { useToast } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import { RcButton, RcEmpty, RcBadge, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'

interface Props {
  referenceType: FileReferenceType
  referenceId: number
  title?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Belgeler',
  readonly: false,
})

const toast = useToast()
const files = ref<FileRecord[]>([])
const loading = ref(false)
const uploading = ref(false)
const deletingId = ref<number | null>(null)
const openingId = ref<number | null>(null)
const showUploadForm = ref(false)
const confirmDeleteId = ref<number | null>(null)

const selectedUploadType = ref<FileUploadType | ''>('')
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const allowedTypes = computed(() => ALLOWED_TYPES_BY_REFERENCE[props.referenceType] || [])

const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp,application/pdf'
const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

const deleteTargetName = computed(() => {
  const file = files.value.find(f => f.id === confirmDeleteId.value)
  return file?.fileName ?? 'Bu belge'
})

async function loadFiles() {
  loading.value = true
  try {
    files.value = await filesApi.getByReference(props.referenceType, props.referenceId)
  } catch (err) {
    toast.apiError(err, 'Belgeler yüklenemedi')
  } finally {
    loading.value = false
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files?.[0]) {
    processFile(target.files[0])
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) processFile(file)
}

function processFile(file: File) {
  if (file.size > MAX_SIZE_BYTES) {
    toast.error(`Dosya çok büyük. Maksimum ${MAX_SIZE_MB}MB`)
    return
  }
  const ext = file.name.split('.').pop()?.toLowerCase()
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
  if (!ext || !allowed.includes(ext)) {
    toast.error('Sadece JPG, PNG, WEBP ve PDF dosyaları yüklenebilir')
    return
  }
  selectedFile.value = file
}

function removeSelectedFile() {
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function uploadFile() {
  if (!selectedFile.value || !selectedUploadType.value) return
  uploading.value = true
  try {
    const uploaded = await filesApi.upload(
      selectedFile.value,
      props.referenceType,
      props.referenceId,
      selectedUploadType.value as FileUploadType
    )
    files.value.unshift(uploaded)
    toast.success('Belge başarıyla yüklendi')
    resetUploadForm()
  } catch (err) {
    toast.apiError(err, 'Belge yüklenemedi')
  } finally {
    uploading.value = false
  }
}

function resetUploadForm() {
  selectedFile.value = null
  selectedUploadType.value = ''
  showUploadForm.value = false
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function openFile(file: FileRecord) {
  openingId.value = file.id
  try {
    await filesApi.openFile(file.id)
  } catch (err) {
    toast.apiError(err, 'Dosya açılamadı')
  } finally {
    openingId.value = null
  }
}

async function downloadFile(file: FileRecord) {
  try {
    await filesApi.downloadFile(file.id, file.fileName)
  } catch (err) {
    toast.apiError(err, 'Dosya indirilemedi')
  }
}

function confirmDelete(id: number) {
  confirmDeleteId.value = id
}

async function deleteFile() {
  if (!confirmDeleteId.value) return
  deletingId.value = confirmDeleteId.value
  const id = confirmDeleteId.value
  confirmDeleteId.value = null
  try {
    await filesApi.delete(id)
    files.value = files.value.filter(f => f.id !== id)
    toast.success('Belge silindi')
  } catch (err) {
    toast.apiError(err, 'Belge silinemedi')
  } finally {
    deletingId.value = null
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(loadFiles)
</script>

<template>
  <div class="rcd-section">
    <div class="rcd-head">
      <h3 class="rcd-head__title">
        {{ title }}
        <span v-if="files.length > 0" class="rcd-head__meta">{{ files.length }} belge</span>
      </h3>
      <RcButton
        v-if="!readonly"
        :variant="showUploadForm ? 'secondary' : 'accent'"
        size="sm"
        @click="showUploadForm = !showUploadForm"
      >
        <RcIcon :name="showUploadForm ? 'close' : 'plus'" :size="14" />
        {{ showUploadForm ? 'İptal' : 'Belge ekle' }}
      </RcButton>
    </div>

    <div v-if="showUploadForm && !readonly" class="rcd-upload">
      <RcField label="Belge tipi">
        <select v-model="selectedUploadType" class="rc-select">
          <option value="">Seçiniz…</option>
          <option v-for="type in allowedTypes" :key="type" :value="type">
            {{ FILE_UPLOAD_TYPE_LABELS[type] }}
          </option>
        </select>
      </RcField>

      <div
        class="rcd-drop"
        :class="{
          'rcd-drop--drag': isDragging,
          'rcd-drop--filled': !!selectedFile,
        }"
        @click="!selectedFile && fileInputRef?.click()"
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
      >
        <input
          ref="fileInputRef"
          type="file"
          :accept="ACCEPTED_MIME"
          style="display: none"
          @change="handleFileSelect"
        />

        <template v-if="!selectedFile">
          <RcIcon name="upload" :size="28" style="color: var(--rc-text-faint)" />
          <p class="rcd-drop__hint">Dosyayı buraya sürükleyin veya tıklayın</p>
          <p class="rcd-drop__sub">JPG, PNG, WEBP, PDF — maks. {{ MAX_SIZE_MB }}MB</p>
        </template>

        <div v-else class="rcd-selected" @click.stop>
          <RcIcon name="folder" :size="20" style="color: var(--rc-accent); flex-shrink: 0" />
          <div class="rcd-selected__info">
            <span class="rcd-selected__name">{{ selectedFile.name }}</span>
            <span class="rcd-selected__size">{{ filesApi.formatFileSize(selectedFile.size) }}</span>
          </div>
          <RcButton variant="ghost" size="sm" icon @click="removeSelectedFile">
            <RcIcon name="close" :size="14" />
          </RcButton>
        </div>
      </div>

      <div class="rcd-upload__actions">
        <RcButton
          variant="primary"
          :disabled="!selectedFile || !selectedUploadType || uploading"
          @click="uploadFile"
        >
          {{ uploading ? 'Yükleniyor…' : 'Yükle' }}
        </RcButton>
        <RcButton variant="secondary" @click="resetUploadForm">Vazgeç</RcButton>
      </div>
      <p v-if="(!selectedFile || !selectedUploadType) && !uploading" class="rcd-upload__hint">
        Yüklemek için belge tipi seçin ve dosya ekleyin.
      </p>
    </div>

    <div v-if="loading" class="rc-skeleton" style="height: 120px" />

    <RcEmpty
      v-else-if="!files.length"
      title="Henüz belge yok"
      description="Sözleşme, kimlik veya diğer belgeleri yukarıdaki Belge ekle ile yükleyin"
    >
      <template #icon><RcIcon name="folder" :size="32" /></template>
    </RcEmpty>

    <div v-else class="rc-table-wrap">
      <table class="rc-table">
        <thead>
          <tr>
            <th>Dosya</th>
            <th>Tip</th>
            <th>Boyut</th>
            <th>Yüklenme</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in files" :key="file.id">
            <td>
              <div class="rcd-file-name">
                <RcBadge variant="default">{{ file.extension?.toUpperCase() || '—' }}</RcBadge>
                <span class="rcd-file-name__text" :title="file.fileName">{{ file.fileName }}</span>
              </div>
            </td>
            <td>
              <RcBadge variant="info">{{ FILE_UPLOAD_TYPE_LABELS[file.uploadType] }}</RcBadge>
            </td>
            <td class="rc-mono rc-num">{{ filesApi.formatFileSize(file.size) }}</td>
            <td class="rc-mono" style="font-size: 12.5px">{{ formatDate(file.uploadedAt) }}</td>
            <td class="rc-right">
              <div class="rcd-actions">
                <RcButton
                  variant="ghost"
                  size="sm"
                  icon
                  :disabled="openingId === file.id"
                  :title="'Aç'"
                  @click="openFile(file)"
                >
                  <span v-if="openingId === file.id" class="rc-spin" aria-hidden="true" />
                  <RcIcon v-else name="eye" :size="14" />
                </RcButton>
                <RcButton variant="ghost" size="sm" icon title="İndir" @click="downloadFile(file)">
                  <RcIcon name="download" :size="14" />
                </RcButton>
                <RcButton
                  v-if="!readonly"
                  variant="ghost"
                  size="sm"
                  icon
                  title="Sil"
                  :disabled="deletingId === file.id"
                  @click="confirmDelete(file.id)"
                >
                  <span v-if="deletingId === file.id" class="rc-spin" aria-hidden="true" />
                  <RcIcon v-else name="trash" :size="14" />
                </RcButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AccountingConfirmModal
      :open="!!confirmDeleteId"
      title="Belgeyi sil"
      :message="`${deleteTargetName} kalıcı olarak silinecek. Emin misiniz?`"
      confirm-label="Sil"
      @close="confirmDeleteId = null"
      @confirm="deleteFile"
    />
  </div>
</template>
