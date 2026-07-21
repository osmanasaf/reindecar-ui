<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { contractsApi, contractTemplatesApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcBadge, RcTabs } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { CONTRACT_DOCUMENT_TYPE_LABELS } from '@/types/contract'
import type { ContractDocumentType, ContractTemplateDetail } from '@/types/contract'
import { parseSections, serializeSections } from '@/utils/contractSections'
import RichTextField from '@/components/shared/RichTextField.vue'

const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const previewing = ref(false)
const togglingActive = ref(false)

const DOCUMENT_TYPES: ContractDocumentType[] = ['RENTAL_CONTRACT', 'PRICE_OFFER', 'HANDOVER', 'COMPLETION']
const activeTab = ref<ContractDocumentType>('RENTAL_CONTRACT')

const templates = ref<ContractTemplateDetail[]>([])
const supportedPlaceholders = ref<string[]>([])
const showPlaceholders = ref(false)
const previewRentalId = ref<number | null>(null)

const tabs = DOCUMENT_TYPES.map((type) => ({ id: type, label: CONTRACT_DOCUMENT_TYPE_LABELS[type] }))

const currentTemplate = computed(() =>
  templates.value.find((t) => t.documentType === activeTab.value) ?? null,
)

const sections = ref<Array<{ name: string; content: string }>>([])

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

function sectionKind(name: string): 'rich' | 'plain' | 'raw' {
  if (RICH_TEXT_SECTIONS.has(name)) return 'rich'
  if (PLAIN_MULTILINE_SECTIONS.has(name)) return 'plain'
  return 'raw'
}

function sectionLabel(name: string): string {
  return SECTION_LABELS[name] ?? name
}

function loadSectionsFromTemplate() {
  if (!currentTemplate.value) {
    sections.value = []
    return
  }
  const parsed = parseSections(currentTemplate.value.content)
  sections.value = Array.from(parsed.entries()).map(([name, body]) => ({ name, content: body }))
}

async function fetchTemplates() {
  loading.value = true
  try {
    await contractTemplatesApi.bootstrapDefaults()
    templates.value = await contractTemplatesApi.findAll()
    supportedPlaceholders.value = await contractsApi.listPlaceholders()
    loadSectionsFromTemplate()
  } catch (err) {
    toast.apiError(err, 'Şablonlar yüklenemedi')
  } finally {
    loading.value = false
  }
}

watch(activeTab, loadSectionsFromTemplate)

async function saveTemplate() {
  if (!currentTemplate.value) return
  const map = new Map(sections.value.map((s) => [s.name, s.content]))
  const content = serializeSections(map)
  if (!content.trim()) {
    toast.error('İçerik boş olamaz')
    return
  }

  saving.value = true
  try {
    const updated = await contractTemplatesApi.updateContent(currentTemplate.value.id, content)
    const index = templates.value.findIndex((t) => t.id === updated.id)
    if (index >= 0) templates.value[index] = updated
    toast.success('Şablon kaydedildi')
  } catch (err) {
    toast.apiError(err, 'Kaydetme başarısız')
  } finally {
    saving.value = false
  }
}

async function toggleActive() {
  if (!currentTemplate.value) return
  togglingActive.value = true
  try {
    if (currentTemplate.value.active) {
      await contractTemplatesApi.deactivate(currentTemplate.value.id)
    } else {
      await contractTemplatesApi.activate(currentTemplate.value.id)
    }
    templates.value = await contractTemplatesApi.findAll()
    toast.success('Şablon durumu güncellendi')
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    togglingActive.value = false
  }
}

async function previewPdf() {
  if (!currentTemplate.value || !previewRentalId.value) {
    toast.error('Önizleme için bir kiralama ID girin')
    return
  }
  previewing.value = true
  try {
    const blob = await contractTemplatesApi.previewPdf(currentTemplate.value.id, previewRentalId.value)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    toast.apiError(err, 'PDF önizleme başarısız')
  } finally {
    previewing.value = false
  }
}

function placeholderToken(key: string): string {
  return `{{${key}}}`
}

onMounted(fetchTemplates)
</script>

<template>
  <div class="rcs-manager">
    <p class="rcs-branding__hint">
      Her belge tipi için firmanıza özel içeriği burada düzenleyin. Değişiklikler bu tipteki tüm yeni belgelere yansır.
    </p>

    <RcTabs v-model="activeTab" :tabs="tabs" style="margin-bottom: 16px" />

    <div v-if="loading" class="rc-skeleton" style="height: 320px" />
    <div v-else-if="!currentTemplate" class="rcs-list__meta">Bu belge tipi için şablon bulunamadı.</div>
    <template v-else>
      <div class="rcs-doc-templates__head">
        <div>
          <div class="rcs-doc-templates__code">{{ currentTemplate.code }}</div>
          <RcBadge :variant="currentTemplate.active ? 'success' : 'info'">
            {{ currentTemplate.active ? 'Aktif' : 'Pasif' }}
          </RcBadge>
        </div>
        <div class="rcs-doc-templates__actions">
          <RcButton variant="ghost" size="sm" @click="showPlaceholders = !showPlaceholders">
            <RcIcon name="info" :size="14" />
            Placeholder yardımı
          </RcButton>
          <RcButton variant="ghost" size="sm" :loading="togglingActive" @click="toggleActive">
            {{ currentTemplate.active ? 'Pasifleştir' : 'Aktif et' }}
          </RcButton>
        </div>
      </div>

      <div v-if="showPlaceholders" class="rcr-contract-editor__placeholders">
        <code v-for="key in supportedPlaceholders" :key="key" class="rcs-doc-templates__ph">
          {{ placeholderToken(key) }}
        </code>
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

      <div class="rcs-doc-templates__footer">
        <div class="rcs-doc-templates__preview">
          <input
            v-model.number="previewRentalId"
            type="number"
            class="rc-input"
            placeholder="Kiralama ID"
            style="width: 140px"
          />
          <RcButton variant="ghost" size="sm" :loading="previewing" @click="previewPdf">
            <RcIcon name="download" :size="14" />
            PDF önizle
          </RcButton>
        </div>
        <RcButton variant="primary" :loading="saving" @click="saveTemplate">
          Kaydet
        </RcButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rcs-branding__hint {
  color: var(--rc-text-muted);
  font-size: 13px;
  margin: 4px 0 16px;
}

.rcs-doc-templates__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.rcs-doc-templates__code {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.rcs-doc-templates__actions {
  display: flex;
  gap: 8px;
}

.rcs-doc-templates__ph {
  display: inline-block;
  margin: 2px 6px 2px 0;
  color: var(--rc-blue-600);
}

.rcr-contract-editor__placeholders {
  max-height: 120px;
  overflow: auto;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-md);
  background: var(--rc-surface-muted);
  font-size: 12.5px;
}

.rcr-contract-editor__sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.rcs-doc-templates__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--rc-border);
}

.rcs-doc-templates__preview {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
