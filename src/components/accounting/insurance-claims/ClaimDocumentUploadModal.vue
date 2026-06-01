<script setup lang="ts">
import { ref, computed } from 'vue'
import { insuranceClaimsApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import { ClaimDocumentType } from '@/types'
import FileUpload from '@/components/base/FileUpload.vue'
import { RcModal, RcButton, RcField } from '@/components/rc'

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

const selectedType = ref<ClaimDocumentType>(ClaimDocumentType.DAMAGE_PHOTO)
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
  selectedType.value = ClaimDocumentType.DAMAGE_PHOTO
  selectedFiles.value = []
  emit('close')
}
</script>

<template>
  <RcModal :open="show" title="Belge yükle" wide @close="handleClose">
    <RcField label="Belge türü">
      <SearchableSelect
        v-model="selectedType"
        :options="documentTypeOptions"
        placeholder="Seçiniz"
        search-placeholder="Belge türü ara…"
      />
    </RcField>
    <RcField label="Dosya seç" hint="Kabul edilen formatlar: Resim, PDF, Word. Maksimum 10MB.">
      <FileUpload
        accept="image/*,.pdf,.doc,.docx"
        :max-size="10"
        :multiple="true"
        @change="handleFilesChange"
        @error="handleFileError"
      />
    </RcField>
    <template #footer>
      <RcButton variant="secondary" @click="handleClose">İptal</RcButton>
      <RcButton variant="primary" :disabled="!canUpload || isUploading" @click="handleUpload">
        {{ isUploading ? 'Yükleniyor…' : 'Yükle' }}
      </RcButton>
    </template>
  </RcModal>
</template>
