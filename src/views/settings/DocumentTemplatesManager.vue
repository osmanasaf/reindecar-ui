<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { contractsApi, contractTemplatesApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcBadge, RcTabs } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { CONTRACT_DOCUMENT_TYPE_LABELS } from '@/types/contract'
import type { ContractDocumentType, ContractTemplateDetail } from '@/types/contract'
import { parseSections, serializeSections } from '@/utils/contractSections'
import { groupPlaceholders, placeholderToken } from '@/utils/placeholderLabels'
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

const tabs = DOCUMENT_TYPES.map((type) => ({ id: type, label: CONTRACT_DOCUMENT_TYPE_LABELS[type] }))

const currentTemplate = computed(() =>
  templates.value.find((t) => t.documentType === activeTab.value) ?? null,
)

const placeholderGroups = computed(() => groupPlaceholders(supportedPlaceholders.value))

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
  TABLE: 'Tablo',
  TERMS: 'Şartlar',
  SIGNATURE: 'İmza bloğu',
}
const SECTION_HINTS: Record<string, string> = {
  HEADER: 'Belgenin en üstünde firma iletişim satırı',
  TITLE: 'Belge başlığı (örn. ARAÇ KİRALAMA SÖZLEŞMESİ)',
  RECIPIENT: 'Müşteri / alıcı bilgileri',
  META: 'Belge no, tarih, plaka gibi özet satırı',
  INTRO: 'Giriş paragrafı',
  BODY: 'Belgenin ana metni',
  TABLE: 'Boru (|) ile ayrılmış tablo satırları — düzeni bozmayın',
  TERMS: 'Madde madde şartlar',
  SIGNATURE: 'İmza satırları',
}

function sectionKind(name: string): 'rich' | 'plain' | 'raw' {
  if (RICH_TEXT_SECTIONS.has(name)) return 'rich'
  if (PLAIN_MULTILINE_SECTIONS.has(name)) return 'plain'
  return 'raw'
}

function sectionLabel(name: string): string {
  return SECTION_LABELS[name] ?? name
}

function sectionHint(name: string): string {
  return SECTION_HINTS[name] ?? ''
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
  if (!currentTemplate.value) return
  previewing.value = true
  try {
    const blob = await contractTemplatesApi.previewSamplePdf(currentTemplate.value.id)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    toast.apiError(err, 'PDF önizleme başarısız')
  } finally {
    previewing.value = false
  }
}

async function copyPlaceholder(key: string) {
  const token = `{{${key}}}`
  try {
    await navigator.clipboard.writeText(token)
    toast.success(`${token} kopyalandı`)
  } catch {
    toast.error('Kopyalanamadı')
  }
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
        <div class="rcs-doc-templates__head-info">
          <RcBadge :variant="currentTemplate.active ? 'success' : 'info'">
            {{ currentTemplate.active ? 'Aktif' : 'Pasif' }}
          </RcBadge>
          <span class="rcs-doc-templates__code">{{ currentTemplate.code }}</span>
        </div>
        <div class="rcs-doc-templates__actions">
          <RcButton variant="ghost" size="sm" @click="showPlaceholders = !showPlaceholders">
            <RcIcon name="info" :size="14" />
            Etiket yardımı
          </RcButton>
          <RcButton
            variant="ghost"
            size="sm"
            :loading="togglingActive"
            :title="currentTemplate.active ? 'Pasif şablon yeni belgelerde kullanılmaz' : 'Yeni belgeler bu şablonu kullanır'"
            @click="toggleActive"
          >
            {{ currentTemplate.active ? 'Pasifleştir' : 'Aktif et' }}
          </RcButton>
        </div>
      </div>

      <div v-if="showPlaceholders" class="rcr-contract-editor__placeholders">
        <p class="rcs-doc-templates__ph-hint">
          Bu etiketleri metne yazın; belge oluşturulurken gerçek değerlerle dolar. Tıklayınca kopyalanır.
        </p>
        <div v-for="grp in placeholderGroups" :key="grp.group" class="rcs-doc-templates__ph-group">
          <div class="rcs-doc-templates__ph-group-title">{{ grp.group }}</div>
          <div class="rcs-doc-templates__ph-list">
            <button
              v-for="item in grp.items"
              :key="item.key"
              type="button"
              class="rcs-doc-templates__ph-chip"
              :title="`${placeholderToken(item.key)} — kopyalamak için tıkla`"
              @click="copyPlaceholder(item.key)"
            >
              <span class="rcs-doc-templates__ph-chip-label">{{ item.label }}</span>
              <code>{{ placeholderToken(item.key) }}</code>
            </button>
          </div>
        </div>
      </div>

      <div class="rcr-contract-editor__sections">
        <div v-for="section in sections" :key="section.name" class="rcr-contract-editor__section">
          <label class="rcr-contract-editor__section-label">
            {{ sectionLabel(section.name) }}
            <span v-if="sectionHint(section.name)" class="rcr-contract-editor__section-hint">
              — {{ sectionHint(section.name) }}
            </span>
          </label>
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
        <RcButton variant="ghost" size="sm" :loading="previewing" @click="previewPdf">
          <RcIcon name="eye" :size="14" />
          PDF önizle (örnek verilerle)
        </RcButton>
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
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.rcs-doc-templates__head-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rcs-doc-templates__code {
  font-size: 11.5px;
  color: var(--rc-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.rcs-doc-templates__actions {
  display: flex;
  gap: 8px;
}

.rcr-contract-editor__placeholders {
  max-height: 240px;
  overflow: auto;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-md);
  background: var(--rc-surface-muted);
}

.rcs-doc-templates__ph-hint {
  font-size: 12px;
  color: var(--rc-text-muted);
  margin: 0 0 10px;
}

.rcs-doc-templates__ph-group {
  margin-bottom: 10px;
}

.rcs-doc-templates__ph-group-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--rc-text-muted);
  margin-bottom: 4px;
}

.rcs-doc-templates__ph-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rcs-doc-templates__ph-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border: 1px solid var(--rc-border);
  border-radius: 999px;
  background: var(--rc-surface);
  cursor: pointer;
  font-size: 12px;
  color: var(--rc-text);
}

.rcs-doc-templates__ph-chip:hover {
  border-color: var(--rc-blue-600);
}

.rcs-doc-templates__ph-chip code {
  color: var(--rc-blue-600);
  font-size: 11px;
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
  color: var(--rc-text);
  margin-bottom: 6px;
}

.rcr-contract-editor__section-hint {
  font-weight: 400;
  color: var(--rc-text-muted);
  text-transform: none;
  letter-spacing: 0;
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
</style>
