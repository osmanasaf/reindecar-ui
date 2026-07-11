<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { contractsApi, contractTemplatesApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { CONTRACT_DOCUMENT_TYPE_LABELS } from '@/types/contract'
import type { ContractDocumentType } from '@/types/contract'

const props = defineProps<{
  open: boolean
  rentalId: number
  contractId?: number | null
  documentType: ContractDocumentType
  mode: 'create' | 'edit'
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const content = ref('')
const showPlaceholders = ref(false)
const placeholders = ref<Record<string, string>>({})
const resolvedContractId = ref<number | null>(null)

const title = computed(() => {
  const label = CONTRACT_DOCUMENT_TYPE_LABELS[props.documentType]
  return props.mode === 'create' ? `${label} oluştur` : `${label} düzenle`
})

const placeholderEntries = computed(() =>
  Object.entries(placeholders.value).sort(([a], [b]) => a.localeCompare(b)),
)

function placeholderToken(key: string): string {
  return `{{${key}}}`
}

async function loadEditor() {
  loading.value = true
  resolvedContractId.value = props.contractId ?? null
  try {
    if (props.mode === 'edit' && props.contractId) {
      const data = await contractsApi.getContent(props.contractId)
      content.value = data.content
      placeholders.value = {}
      return
    }

    const template = await contractTemplatesApi.findByDocumentType(props.documentType)
    const preview = await contractsApi.preview({
      rentalId: props.rentalId,
      templateId: template.id,
    })
    content.value = preview.renderedContent
    placeholders.value = preview.placeholders ?? {}
  } catch (err) {
    toast.apiError(err, 'Sözleşme içeriği yüklenemedi')
    emit('close')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.contractId, props.mode, props.documentType] as const,
  ([isOpen]) => {
    if (!isOpen) return
    void loadEditor()
  },
  { immediate: true },
)

async function save() {
  if (!content.value.trim()) {
    toast.error('İçerik boş olamaz')
    return
  }

  saving.value = true
  try {
    let contractId = resolvedContractId.value
    if (props.mode === 'create' || !contractId) {
      const created = await contractsApi.create({
        rentalId: props.rentalId,
        documentType: props.documentType,
      })
      contractId = created.id
      resolvedContractId.value = contractId
    }

    await contractsApi.updateContent(contractId, { content: content.value })
    toast.success(props.mode === 'create' ? 'Sözleşme oluşturuldu' : 'Sözleşme güncellendi')
    emit('saved')
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Kaydetme başarısız')
  } finally {
    saving.value = false
  }
}

async function previewPdf() {
  saving.value = true
  try {
    const blob = await contractsApi.previewPdf({
      rentalId: props.rentalId,
      contentOverride: content.value,
    })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    toast.apiError(err, 'PDF önizleme başarısız')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <RcModal :open="open" wide @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">{{ title }}</h2>
        <div class="rc-modal__sub">Placeholder'lar doldurulduktan sonra serbest düzenleme yapabilirsiniz</div>
      </div>
    </template>

    <div v-if="loading" class="rc-skeleton" style="height: 320px" />
    <template v-else>
      <div class="rcr-contract-editor__toolbar">
        <RcButton variant="ghost" size="sm" @click="showPlaceholders = !showPlaceholders">
          <RcIcon name="info" :size="14" />
          Placeholder yardımı
        </RcButton>
        <RcButton variant="ghost" size="sm" :disabled="saving" @click="previewPdf">
          <RcIcon name="download" :size="14" />
          PDF önizle
        </RcButton>
      </div>

      <div v-if="showPlaceholders && placeholderEntries.length > 0" class="rcr-contract-editor__placeholders">
        <div v-for="[key, value] in placeholderEntries" :key="key" class="rcr-contract-editor__ph-row">
          <code>{{ placeholderToken(key) }}</code>
          <span>{{ value || '—' }}</span>
        </div>
      </div>

      <textarea
        v-model="content"
        class="rc-input rcr-contract-editor__textarea"
        rows="18"
        spellcheck="false"
      />
    </template>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="loading || saving" @click="save">
        <RcIcon name="check" :size="14" />
        Kaydet
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rcr-contract-editor__toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.rcr-contract-editor__placeholders {
  max-height: 160px;
  overflow: auto;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-md);
  background: var(--rc-surface-muted);
  font-size: 12.5px;
}

.rcr-contract-editor__ph-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 8px;
  padding: 4px 0;
}

.rcr-contract-editor__ph-row code {
  color: var(--rc-blue-600);
}

.rcr-contract-editor__textarea {
  width: 100%;
  min-height: 360px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}
</style>
