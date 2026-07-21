<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { contractsApi, contractTemplatesApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { CONTRACT_DOCUMENT_TYPE_LABELS } from '@/types/contract'
import type { ContractDocumentType } from '@/types/contract'
import { parseSections, serializeSections } from '@/utils/contractSections'
import RichTextField from '@/components/shared/RichTextField.vue'

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
const showPlaceholders = ref(false)
const placeholders = ref<Record<string, string>>({})
const resolvedContractId = ref<number | null>(null)

const RICH_TEXT_SECTIONS = new Set(['INTRO', 'BODY', 'TERMS', 'SIGNATURE'])
const PLAIN_MULTILINE_SECTIONS = new Set(['HEADER', 'TITLE', 'RECIPIENT', 'META'])

const SECTION_LABELS: Record<string, string> = {
  HEADER: 'Üst bilgi',
  TITLE: 'Başlık',
  RECIPIENT: 'Alıcı bilgileri',
  META: 'Belge bilgileri',
  INTRO: 'Giriş',
  BODY: 'Gövde metni',
  TABLE: 'Tablo (ARAÇ|ADET|...)',
  TERMS: 'Şartlar',
  SIGNATURE: 'İmza bloğu',
}

const sections = ref<Array<{ name: string; content: string }>>([])

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

function sectionKind(name: string): 'rich' | 'plain' | 'raw' {
  if (RICH_TEXT_SECTIONS.has(name)) return 'rich'
  if (PLAIN_MULTILINE_SECTIONS.has(name)) return 'plain'
  return 'raw'
}

function sectionLabel(name: string): string {
  return SECTION_LABELS[name] ?? name
}

function loadContentIntoSections(content: string) {
  const parsed = parseSections(content)
  sections.value = Array.from(parsed.entries()).map(([name, body]) => ({ name, content: body }))
}

async function loadEditor() {
  loading.value = true
  resolvedContractId.value = props.contractId ?? null
  try {
    if (props.mode === 'edit' && props.contractId) {
      const data = await contractsApi.getContent(props.contractId)
      loadContentIntoSections(data.content)
      placeholders.value = {}
      return
    }

    const template = await contractTemplatesApi.findByDocumentType(props.documentType)
    const preview = await contractsApi.preview({
      rentalId: props.rentalId,
      templateId: template.id,
    })
    loadContentIntoSections(preview.renderedContent)
    placeholders.value = preview.placeholders ?? {}
  } catch (err) {
    toast.apiError(err, 'İçerik yüklenemedi')
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

function serializedContent(): string {
  const map = new Map(sections.value.map((s) => [s.name, s.content]))
  return serializeSections(map)
}

async function save() {
  const content = serializedContent()
  if (!content.trim()) {
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

    await contractsApi.updateContent(contractId, { content })
    toast.success(props.mode === 'create' ? 'Belge oluşturuldu' : 'Belge güncellendi')
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
      contentOverride: serializedContent(),
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
        <div class="rc-modal__sub">Placeholder'lar doldurulduktan sonra bölüm bölüm düzenleyebilirsiniz</div>
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

      <div class="rcr-contract-editor__sections">
        <div v-for="section in sections" :key="section.name" class="rcr-contract-editor__section">
          <label class="rcr-contract-editor__section-label">{{ sectionLabel(section.name) }}</label>

          <RichTextField
            v-if="sectionKind(section.name) === 'rich'"
            v-model="section.content"
            :min-height="section.name === 'BODY' ? 160 : 80"
          />
          <textarea
            v-else
            v-model="section.content"
            class="rc-input rcr-contract-editor__textarea"
            :rows="sectionKind(section.name) === 'plain' ? 3 : 6"
            spellcheck="false"
          />
        </div>
      </div>
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

.rcr-contract-editor__sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.rcr-contract-editor__section-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--rc-text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.rcr-contract-editor__textarea {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}
</style>
