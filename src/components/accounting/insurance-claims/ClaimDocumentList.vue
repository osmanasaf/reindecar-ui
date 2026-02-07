<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { insuranceClaimsApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import type { ClaimDocumentResponse } from '@/types'

interface Props {
  claimId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  uploadNew: []
}>()

const toast = useToast()
const { translateDocumentType } = useEnumTranslations()
const documents = ref<ClaimDocumentResponse[]>([])
const loading = ref(true)

const loadDocuments = async () => {
  loading.value = true
  try {
    documents.value = await insuranceClaimsApi.getDocuments(props.claimId)
  } catch (error: any) {
    toast.error(error.message || 'Belgeler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const handleDelete = async (documentId: number) => {
  if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return

  try {
    await insuranceClaimsApi.deleteDocument(props.claimId, documentId)
    toast.success('Belge silindi')
    documents.value = documents.value.filter(d => d.id !== documentId)
  } catch (error: any) {
    toast.error(error.message || 'Belge silinirken hata oluştu')
  }
}

const handleDownload = async (document: ClaimDocumentResponse) => {
  try {
    const blob = await insuranceClaimsApi.downloadDocument(props.claimId, document.id)
    const url = window.URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = document.fileName
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    toast.error(error.message || 'Belge indirilirken hata oluştu')
  }
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadDocuments()
})

defineExpose({
  refresh: loadDocuments
})
</script>

<template>
  <div class="document-list">
    <div class="list-header">
      <h3 class="list-title">Belgeler</h3>
      <button class="btn btn-primary btn-sm" @click="emit('uploadNew')">
        + Belge Yükle
      </button>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="documents.length === 0" class="empty-state">
      <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <p class="empty-text">Henüz belge eklenmemiş</p>
      <button class="btn btn-primary btn-sm" @click="emit('uploadNew')">
        İlk Belgeyi Yükle
      </button>
    </div>

    <div v-else class="documents">
      <div 
        v-for="doc in documents" 
        :key="doc.id" 
        class="document-item"
      >
        <div class="document-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div class="document-info">
          <div class="document-name">{{ doc.fileName }}</div>
          <div class="document-meta">
            <span class="document-type">{{ translateDocumentType(doc.documentType) }}</span>
            <span class="document-date">{{ formatDate(doc.uploadedAt) }}</span>
            <span class="document-uploader">{{ doc.uploadedBy }}</span>
          </div>
        </div>

        <div class="document-actions">
          <button 
            class="action-btn" 
            @click="handleDownload(doc)"
            title="İndir"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button 
            class="action-btn delete-btn" 
            @click="handleDelete(doc.id)"
            title="Sil"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.list-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark, #1d4ed8);
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary, #6b7280);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--color-background, #f9fafb);
  border: 1px dashed var(--color-border, #d1d5db);
  border-radius: 0.5rem;
  gap: 0.75rem;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  color: var(--color-text-secondary, #9ca3af);
}

.empty-text {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
  font-size: 0.875rem;
}

.documents {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.document-item:hover {
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.document-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background, #f3f4f6);
  border-radius: 0.375rem;
  flex-shrink: 0;
}

.document-icon svg {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--color-text-secondary, #6b7280);
}

.document-info {
  flex: 1;
  min-width: 0;
}

.document-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-meta {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.document-type {
  font-weight: 500;
}

.document-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.375rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn svg {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-text-secondary, #6b7280);
}

.action-btn:hover {
  background: var(--color-background, #f3f4f6);
}

.action-btn:hover svg {
  color: var(--color-text, #111827);
}

.delete-btn:hover {
  background: #fee2e2;
}

.delete-btn:hover svg {
  color: #dc2626;
}
</style>
