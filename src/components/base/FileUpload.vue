<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  accept?: string
  maxSize?: number
  multiple?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*',
  maxSize: 10,
  multiple: false,
  disabled: false
})

const emit = defineEmits<{
  change: [files: File[]]
  error: [message: string]
}>()

const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])

const maxSizeBytes = computed(() => props.maxSize * 1024 * 1024)

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
  }
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files) {
    processFiles(Array.from(event.dataTransfer.files))
  }
}

const processFiles = (files: File[]) => {
  const validFiles: File[] = []
  
  for (const file of files) {
    if (file.size > maxSizeBytes.value) {
      emit('error', `${file.name} dosyası çok büyük. Maksimum: ${props.maxSize}MB`)
      continue
    }
    validFiles.push(file)
  }

  if (validFiles.length > 0) {
    selectedFiles.value = props.multiple ? validFiles : [validFiles[0]]
    emit('change', selectedFiles.value)
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const triggerFileInput = () => {
  if (!props.disabled) {
    fileInputRef.value?.click()
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
  emit('change', selectedFiles.value)
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="file-upload">
    <div
      class="drop-zone"
      :class="{ 
        'dragging': isDragging, 
        'disabled': disabled,
        'has-files': selectedFiles.length > 0 
      }"
      @click="triggerFileInput"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
    >
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        @change="handleFileSelect"
        style="display: none"
      />
      
      <div v-if="selectedFiles.length === 0" class="drop-zone-content">
        <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="drop-text">
          <span class="drop-text-main">Dosya yüklemek için tıklayın veya sürükleyin</span>
          <span class="drop-text-sub">Maksimum {{ maxSize }}MB</span>
        </p>
      </div>

      <div v-else class="file-list">
        <div 
          v-for="(file, index) in selectedFiles" 
          :key="index" 
          class="file-item"
          @click.stop
        >
          <div class="file-info">
            <svg class="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div class="file-details">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>
          </div>
          <button 
            type="button"
            class="remove-btn"
            @click="removeFile(index)"
            :disabled="disabled"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-upload {
  width: 100%;
}

.drop-zone {
  border: 2px dashed var(--color-border, #d1d5db);
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-background, #f9fafb);
}

.drop-zone:hover:not(.disabled) {
  border-color: var(--color-primary, #2563eb);
  background: var(--color-background-hover, #f3f4f6);
}

.drop-zone.dragging {
  border-color: var(--color-primary, #2563eb);
  background: rgba(37, 99, 235, 0.05);
}

.drop-zone.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.drop-zone.has-files {
  padding: 1rem;
  text-align: left;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon {
  width: 3rem;
  height: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.drop-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.drop-text-main {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #111827);
}

.drop-text-sub {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.file-item:hover {
  border-color: var(--color-primary, #2563eb);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.file-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--color-text-secondary, #6b7280);
  flex-shrink: 0;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.remove-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-btn:hover:not(:disabled) {
  background: var(--color-background, #f3f4f6);
  color: #dc2626;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
