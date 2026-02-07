<script setup lang="ts">
import { ref, computed } from 'vue'
import { insuranceClaimsApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import type { ClaimDocumentType } from '@/types'
import FileUpload from '@/components/base/FileUpload.vue'

interface Props {
  show: boolean
  claimId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const { documentTypes } = useEnumTranslations()

const selectedType = ref<ClaimDocumentType>('DAMAGE_PHOTO')
const selectedFiles = ref<File[]>([])
const isUploading = ref(false)

const documentTypeOptions = computed(() => {
  return Object.entries(documentTypes).map(([value, label]) => ({
    value,
    label
  }))
})

const canUpload = computed(() => {
  return selectedFiles.value.length > 0 && selectedType.value
})

const handleFilesChange = (files: File[]) => {
  selectedFiles.value = files
}

const handleFileError = (message: string) => {
  toast.error(message)
}

const handleUpload = async () => {
  if (!canUpload.value) return

  isUploading.value = true
  try {
    for (const file of selectedFiles.value) {
      await insuranceClaimsApi.uploadDocument(props.claimId, file, selectedType.value)
    }
    
    toast.success(`${selectedFiles.value.length} belge başarıyla yüklendi`)
    emit('success')
    handleClose()
  } catch (error: any) {
    toast.error(error.message || 'Belge yüklenirken hata oluştu')
  } finally {
    isUploading.value = false
  }
}

const handleClose = () => {
  selectedType.value = 'DAMAGE_PHOTO'
  selectedFiles.value = []
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Belge Yükle</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">
            Belge Türü <span class="required">*</span>
          </label>
          <select v-model="selectedType" class="form-input">
            <option 
              v-for="option in documentTypeOptions" 
              :key="option.value" 
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            Dosya Seç <span class="required">*</span>
          </label>
          <FileUpload
            accept="image/*,.pdf,.doc,.docx"
            :max-size="10"
            :multiple="true"
            @change="handleFilesChange"
            @error="handleFileError"
          />
          <span class="help-text">
            Kabul edilen formatlar: Resim, PDF, Word. Maksimum 10MB.
          </span>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="handleClose">
          İptal
        </button>
        <button 
          type="button" 
          class="btn btn-primary" 
          :disabled="!canUpload || isUploading"
          @click="handleUpload"
        >
          {{ isUploading ? 'Yükleniyor...' : 'Yükle' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-background, #f3f4f6);
  color: var(--color-text, #111827);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #111827);
}

.required {
  color: #dc2626;
}

.form-input {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.help-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: var(--color-text, #111827);
  border: 1px solid var(--color-border, #d1d5db);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-background, #f3f4f6);
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark, #1d4ed8);
}
</style>
