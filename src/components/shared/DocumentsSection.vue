<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { filesApi, FILE_UPLOAD_TYPE_LABELS, ALLOWED_TYPES_BY_REFERENCE } from '@/api/files.api'
import type { FileRecord, FileReferenceType, FileUploadType } from '@/api/files.api'
import { useToast } from '@/composables'

interface Props {
  referenceType: FileReferenceType
  referenceId: number
  title?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Belgeler',
  readonly: false
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

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  webp: '🖼️',
  default: '📎',
}

function getFileIcon(extension: string): string {
  return FILE_ICONS[extension?.toLowerCase()] || FILE_ICONS.default
}

function isImage(file: FileRecord): boolean {
  return ['jpg', 'jpeg', 'png', 'webp'].includes(file.extension?.toLowerCase())
}

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

async function confirmDelete(id: number) {
  confirmDeleteId.value = id
}

async function deleteFile() {
  if (!confirmDeleteId.value) return
  deletingId.value = confirmDeleteId.value
  confirmDeleteId.value = null
  try {
    await filesApi.delete(deletingId.value)
    files.value = files.value.filter(f => f.id !== deletingId.value)
    toast.success('Belge silindi')
  } catch (err) {
    toast.apiError(err, 'Belge silinemedi')
  } finally {
    deletingId.value = null
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

onMounted(loadFiles)
</script>

<template>
  <div class="documents-section">
    <div class="section-header">
      <div class="header-left">
        <h3 class="section-title">{{ title }}</h3>
        <span class="file-count">{{ files.length }} belge</span>
      </div>
      <button
        v-if="!readonly"
        class="btn-upload-toggle"
        @click="showUploadForm = !showUploadForm"
      >
        <svg v-if="!showUploadForm" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <svg v-else width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        {{ showUploadForm ? 'İptal' : 'Belge Ekle' }}
      </button>
    </div>

    <!-- Upload Form -->
    <div v-if="showUploadForm && !readonly" class="upload-form">
      <div class="form-row">
        <div class="form-group">
          <label for="doc-upload-type" class="form-label">Belge Tipi</label>
          <select id="doc-upload-type" v-model="selectedUploadType" class="form-select">
            <option value="">Seçiniz...</option>
            <option v-for="type in allowedTypes" :key="type" :value="type">
              {{ FILE_UPLOAD_TYPE_LABELS[type] }}
            </option>
          </select>
        </div>
      </div>

      <div
        class="drop-zone"
        :class="{ dragging: isDragging, 'has-file': !!selectedFile }"
        @click="fileInputRef?.click()"
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

        <div v-if="!selectedFile" class="drop-content">
          <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="drop-text">Dosyayı buraya sürükleyin veya tıklayın</p>
          <p class="drop-hint">JPG, PNG, WEBP, PDF — Maks. {{ MAX_SIZE_MB }}MB</p>
        </div>

        <div v-else class="selected-file" @click.stop>
          <span class="file-icon-large">{{ getFileIcon(selectedFile.name.split('.').pop() || '') }}</span>
          <div class="selected-file-info">
            <span class="selected-file-name">{{ selectedFile.name }}</span>
            <span class="selected-file-size">{{ filesApi.formatFileSize(selectedFile.size) }}</span>
          </div>
          <button type="button" class="remove-file-btn" @click="removeSelectedFile">×</button>
        </div>
      </div>

      <div class="upload-actions">
        <button
          class="btn-primary"
          :disabled="!selectedFile || !selectedUploadType || uploading"
          @click="uploadFile"
        >
          <span v-if="uploading" class="spinner" />
          {{ uploading ? 'Yükleniyor...' : 'Yükle' }}
        </button>
        <button class="btn-secondary" @click="resetUploadForm">İptal</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <span class="spinner" />
      <span>Belgeler yükleniyor...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && files.length === 0" class="empty-state">
      <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p>Henüz belge yüklenmemiş</p>
    </div>

    <!-- File List -->
    <div v-else class="file-list">
      <div v-for="file in files" :key="file.id" class="file-card">
        <div class="file-card-icon">
          {{ getFileIcon(file.extension) }}
        </div>
        <div class="file-card-info">
          <span class="file-card-name" :title="file.fileName">{{ file.fileName }}</span>
          <div class="file-card-meta">
            <span class="file-type-badge">{{ FILE_UPLOAD_TYPE_LABELS[file.uploadType] }}</span>
            <span class="file-size">{{ filesApi.formatFileSize(file.size) }}</span>
            <span class="file-date">{{ formatDate(file.uploadedAt) }}</span>
          </div>
        </div>
        <div class="file-card-actions">
          <button
            class="action-btn view-btn"
            :disabled="openingId === file.id"
            :title="isImage(file) ? 'Görüntüle' : 'Aç'"
            @click="openFile(file)"
          >
            <span v-if="openingId === file.id" class="spinner spinner-sm" />
            <svg v-else width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            class="action-btn download-btn"
            title="İndir"
            @click="downloadFile(file)"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            v-if="!readonly"
            class="action-btn delete-btn"
            :disabled="deletingId === file.id"
            title="Sil"
            @click="confirmDelete(file.id)"
          >
            <span v-if="deletingId === file.id" class="spinner spinner-sm" />
            <svg v-else width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <div v-if="confirmDeleteId" class="modal-overlay" @click.self="confirmDeleteId = null">
        <div class="confirm-modal">
          <div class="confirm-icon">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4>Belgeyi Sil</h4>
          <p>Bu belge kalıcı olarak silinecek. Emin misiniz?</p>
          <div class="confirm-actions">
            <button class="btn-danger" @click="deleteFile">Evet, Sil</button>
            <button class="btn-secondary" @click="confirmDeleteId = null">İptal</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.documents-section {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.25rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.file-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  background: var(--color-background, #f3f4f6);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.btn-upload-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.875rem;
  background: var(--color-primary, #2563eb);
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-upload-toggle:hover {
  background: var(--color-primary-dark, #1d4ed8);
}

/* Upload Form */
.upload-form {
  background: var(--color-background, #f9fafb);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text, #374151);
}

.form-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: #fff;
  color: var(--color-text, #111827);
  outline: none;
  transition: border-color 0.15s;
}

.form-select:focus {
  border-color: var(--color-primary, #2563eb);
}

/* Drop Zone */
.drop-zone {
  border: 2px dashed var(--color-border, #d1d5db);
  border-radius: 0.5rem;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.drop-zone:hover,
.drop-zone.dragging {
  border-color: var(--color-primary, #2563eb);
  background: rgba(37, 99, 235, 0.03);
}

.drop-zone.has-file {
  padding: 0.75rem;
  text-align: left;
  cursor: default;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary, #6b7280);
}

.drop-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #374151);
  margin: 0;
}

.drop-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #9ca3af);
  margin: 0;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-icon-large {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.selected-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.selected-file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-file-size {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.remove-file-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--color-text-secondary, #9ca3af);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  line-height: 1;
  transition: color 0.15s;
}

.remove-file-btn:hover {
  color: #dc2626;
}

.upload-actions {
  display: flex;
  gap: 0.5rem;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: var(--color-primary, #2563eb);
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark, #1d4ed8);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: var(--color-background, #f3f4f6);
  color: var(--color-text, #374151);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:hover {
  background: var(--color-border, #e5e7eb);
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-danger:hover {
  background: #b91c1c;
}

/* States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--color-text-secondary, #9ca3af);
  font-size: 0.875rem;
}

/* File List */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-background, #f9fafb);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  transition: border-color 0.15s;
}

.file-card:hover {
  border-color: var(--color-primary, #93c5fd);
}

.file-card-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.file-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-card-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.file-type-badge {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-primary, #2563eb);
  background: rgba(37, 99, 235, 0.08);
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
}

.file-size,
.file-date {
  font-size: 0.6875rem;
  color: var(--color-text-secondary, #9ca3af);
}

.file-card-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--color-text-secondary, #6b7280);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.view-btn:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.2);
  color: var(--color-primary, #2563eb);
}

.download-btn:hover:not(:disabled) {
  background: #d1fae5;
  border-color: #6ee7b7;
  color: #064e3b;
}

.delete-btn:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #7f1d1d;
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spinner-sm {
  width: 0.875rem;
  height: 0.875rem;
  border-color: rgba(107, 114, 128, 0.3);
  border-top-color: #6b7280;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Confirm Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-modal {
  background: #fff;
  border-radius: 0.75rem;
  padding: 1.5rem;
  max-width: 360px;
  width: 90%;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.confirm-icon {
  color: #f59e0b;
  display: flex;
  justify-content: center;
}

.confirm-modal h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.confirm-modal p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.confirm-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}
</style>
