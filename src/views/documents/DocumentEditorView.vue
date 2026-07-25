<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables'
import { contractsApi } from '@/api'
import { RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { useContractEditorStore } from '@/stores/contractEditor.store'
import { CONTRACT_DOCUMENT_TYPE_LABELS, type ContractDocumentType } from '@/types/contract'
import { downloadBlob } from '@/utils/download'
import { isErrorResponse } from '@/utils/error'
import { formatDateTime } from '@/utils/format'
import BlockCanvas from '@/components/documents/BlockCanvas.vue'
import DocumentPreviewPane from '@/components/documents/DocumentPreviewPane.vue'
import FieldPickerPopover from '@/components/documents/FieldPickerPopover.vue'
import ChipInfoPopover from '@/components/documents/ChipInfoPopover.vue'
import { closeAllMenus, setDomTarget } from '@/components/documents/editorUi'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useContractEditorStore()
const {
  mode,
  contract,
  template,
  blocks,
  placeholders,
  documentName,
  loading,
  dirty,
  saveState,
  sampleNames,
  locked,
  documentType,
} = storeToRefs(store)

const rootEl = ref<HTMLElement | null>(null)
const narrow = ref(false)
const previewOpen = ref(true)
const activeTab = ref<'doc' | 'preview'>('doc')
const working = ref(false)
const showChooser = ref(false)

const VALID_TYPES: ContractDocumentType[] = ['PRICE_OFFER', 'RENTAL_CONTRACT', 'HANDOVER', 'COMPLETION']

const isTemplateMode = computed(() => mode.value === 'template')

const typeLabel = computed(() => CONTRACT_DOCUMENT_TYPE_LABELS[documentType.value])

const titleText = computed(() => {
  if (isTemplateMode.value) return template.value?.name ?? 'Şablon'
  const customer = placeholders.value.customerName
  return customer ? `${typeLabel.value} — ${customer}` : typeLabel.value
})

const statusBadge = computed(() => {
  if (isTemplateMode.value) {
    return { text: `Şablon · v${template.value?.version ?? 1}`, cls: 'rce-status-badge--template' }
  }
  const c = contract.value
  if (!c) return { text: 'Yeni taslak', cls: '' }
  if (c.isSigned) return { text: `İmzalandı · v${c.contractVersion}`, cls: 'rce-status-badge--signed' }
  if (c.status === 'CANCELLED') return { text: 'İptal edildi', cls: '' }
  return { text: `Taslak · v${c.contractVersion}`, cls: '' }
})

const metaText = computed(() => {
  if (isTemplateMode.value) {
    return `${template.value?.code ?? ''} · örnek verilerle gösteriliyor`
  }
  const parts = [documentName.value || 'Henüz kaydedilmedi']
  if (placeholders.value.customerName) parts.push(placeholders.value.customerName)
  return parts.join(' · ')
})

const saveStateText = computed(() => {
  if (saveState.value === 'saving') return 'Kaydediliyor…'
  if (saveState.value === 'saved') return 'Kaydedildi ✓'
  return dirty.value ? 'Kaydedilmemiş değişiklikler' : ''
})

const lockInfo = computed(() => {
  const c = contract.value
  if (!c?.isSigned) return ''
  const when = c.signedAt ? formatDateTime(c.signedAt) : ''
  return [when, c.signedBy, c.signatureMethod].filter(Boolean).join(' · ')
})

const showEmptyState = computed(
  () => !isTemplateMode.value && showChooser.value && !loading.value,
)

/* ────── Yükleme ────── */

async function loadFromRoute() {
  closeAllMenus()
  showChooser.value = false

  if (route.name === 'template-editor') {
    const templateId = Number(route.params.templateId)
    if (!Number.isFinite(templateId)) return
    try {
      await store.loadTemplate(templateId)
    } catch (err) {
      toast.apiError(err, 'Şablon yüklenemedi')
      void router.push({ name: 'settings', query: { tab: 'document-templates' } })
    }
    return
  }

  const rentalId = Number(route.params.rentalId)
  const rawType = String(route.params.documentType ?? '')
  if (!Number.isFinite(rentalId)) return

  if (rawType === 'new' || !VALID_TYPES.includes(rawType as ContractDocumentType)) {
    store.resetState()
    store.rentalId = rentalId
    showChooser.value = true
    return
  }

  const type = rawType as ContractDocumentType
  try {
    if (route.query.create === '1') {
      await store.startFromTemplate(rentalId, type)
      return
    }
    if (route.query.blank === '1') {
      await store.startBlank(rentalId, type)
      return
    }
    await store.loadDocument(rentalId, type)
  } catch (err) {
    if (isErrorResponse(err) && err.code === 'E001') {
      try {
        await store.startFromTemplate(rentalId, type)
        toast.info('Şablondan yeni taslak hazırlandı')
      } catch (innerErr) {
        toast.apiError(innerErr, 'Belge hazırlanamadı')
        goBack()
      }
      return
    }
    toast.apiError(err, 'Belge yüklenemedi')
    goBack()
  }
}

async function chooseType(type: ContractDocumentType, blank = false) {
  const rentalId = Number(route.params.rentalId)
  showChooser.value = false
  try {
    if (blank) {
      await store.startBlank(rentalId, type)
    } else {
      await store.startFromTemplate(rentalId, type)
    }
    void router.replace({
      name: 'document-editor',
      params: { rentalId, documentType: type },
      query: blank ? { blank: '1' } : { create: '1' },
    })
  } catch (err) {
    toast.apiError(err, 'Belge hazırlanamadı')
    showChooser.value = true
  }
}

watch(() => [route.name, route.params.rentalId, route.params.documentType, route.params.templateId], loadFromRoute)

/* ────── Aksiyonlar ────── */

function goBack() {
  if (isTemplateMode.value) {
    void router.push({ name: 'settings', query: { tab: 'document-templates' } })
    return
  }
  const rentalId = Number(route.params.rentalId)
  void router.push({ name: 'rental-detail', params: { id: rentalId } })
}

async function handleSave() {
  working.value = true
  try {
    const ok = await store.save()
    if (ok) {
      toast.success(
        isTemplateMode.value
          ? `Şablon kaydedildi ve yayınlandı (v${template.value?.version ?? ''}). Bundan sonraki yeni belgeler bu şablonu kullanır.`
          : 'Belge kaydedildi. PDF çıktısı güncellendi.',
      )
    }
  } catch (err) {
    toast.apiError(err, 'Kaydetme başarısız')
  } finally {
    working.value = false
  }
}

async function handleRegenerate() {
  working.value = true
  try {
    await store.regenerateFromTemplate()
    toast.success('İçerik şablondan yenilendi')
  } catch (err) {
    toast.apiError(err, 'Yenileme başarısız')
  } finally {
    working.value = false
  }
}

async function handlePdf() {
  working.value = true
  try {
    const blob = await store.downloadPdfBlob()
    downloadBlob(blob, `${documentName.value || typeLabel.value}.pdf`)
    toast.success('PDF indirildi')
  } catch (err) {
    toast.apiError(err, 'PDF oluşturulamadı')
  } finally {
    working.value = false
  }
}

async function handleNewVersion() {
  if (!contract.value) return
  working.value = true
  try {
    const next = await contractsApi.newVersion(contract.value.id)
    toast.success(`v${next.contractVersion} taslağı oluşturuldu, düzenleyebilirsiniz.`)
    await loadFromRoute()
  } catch (err) {
    toast.apiError(err, 'Yeni sürüm oluşturulamadı')
  } finally {
    working.value = false
  }
}

function togglePreview() {
  previewOpen.value = !previewOpen.value
}

function toggleSampleNames() {
  sampleNames.value = !sampleNames.value
}

function onNameBlur(event: FocusEvent) {
  const el = event.target as HTMLElement
  const name = (el.textContent ?? '').trim()
  if (!name) {
    el.textContent = template.value?.name ?? ''
    return
  }
  if (name !== template.value?.name) {
    documentName.value = name
    dirty.value = true
  }
}

/* ────── Dar ekran + global dinleyiciler ────── */

let resizeObserver: ResizeObserver | null = null

function syncNarrow() {
  narrow.value = (rootEl.value?.clientWidth ?? window.innerWidth) < 1200
}

function onSelectionChange() {
  const selection = document.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  const node = range.startContainer
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  if (el?.closest?.('[data-rce-dom-editable]')) {
    setDomTarget(range)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeAllMenus()
}

onMounted(() => {
  void loadFromRoute()
  syncNarrow()
  if (window.ResizeObserver && rootEl.value) {
    resizeObserver = new ResizeObserver(syncNarrow)
    resizeObserver.observe(rootEl.value)
  }
  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('selectionchange', onSelectionChange)
  document.removeEventListener('keydown', onKeydown)
  closeAllMenus()
  store.resetState()
})

const showPreviewPane = computed(() => {
  if (narrow.value) return activeTab.value === 'preview'
  return previewOpen.value
})

const showCanvas = computed(() => {
  if (narrow.value) return activeTab.value === 'doc'
  return true
})

const EMPTY_CARDS: Array<{ type: ContractDocumentType; desc: string; thumb: 'offer' | 'contract' | 'handover' }> = [
  { type: 'PRICE_OFFER', desc: 'Başlık, alıcı kutusu, araç/fiyat tablosu, koşullar ve imza.', thumb: 'offer' },
  { type: 'RENTAL_CONTRACT', desc: 'Standart sözleşme metni ve taraf imzaları.', thumb: 'contract' },
  { type: 'HANDOVER', desc: 'KM, yakıt, hasar notu ve teslim eden/alan imzası.', thumb: 'handover' },
  { type: 'COMPLETION', desc: 'İade bilgileri, ek ücretler ve kapanış özeti.', thumb: 'handover' },
]
</script>

<template>
  <div ref="rootEl" class="rce-editor">
    <!-- Üst bar -->
    <div class="rce-topbar">
      <button type="button" class="rce-topbar__back" aria-label="Geri" @click="goBack">
        <RcIcon name="chevronLeft" :size="16" />
      </button>
      <div class="rce-topbar__info">
        <div class="rce-topbar__titlerow">
          <span
            v-if="isTemplateMode"
            class="rce-topbar__name"
            contenteditable="true"
            spellcheck="false"
            title="Şablon adını düzenlemek için tıklayın"
            @blur="onNameBlur"
            @keydown.enter.prevent="($event.target as HTMLElement).blur()"
          >{{ template?.name }}</span>
          <span v-else class="rce-topbar__name">{{ titleText }}</span>
          <span class="rc-badge rc-badge--accent">{{ typeLabel }}</span>
          <span class="rce-status-badge" :class="statusBadge.cls">{{ statusBadge.text }}</span>
        </div>
        <div class="rce-topbar__meta">
          <span v-if="saveStateText">{{ saveStateText }}</span>
          <span v-if="saveStateText" class="rce-topbar__meta-sep">·</span>
          <span>{{ metaText }}</span>
        </div>
      </div>

      <div class="rce-topbar__actions">
        <RcButton
          v-if="!isTemplateMode && contract && !locked"
          variant="ghost"
          size="sm"
          :disabled="working || loading"
          @click="handleRegenerate"
        >
          <RcIcon name="refresh" :size="14" />
          Şablondan yenile
        </RcButton>

        <RcButton v-if="!narrow" variant="ghost" size="sm" @click="togglePreview">
          <RcIcon name="eye" :size="14" />
          {{ previewOpen ? 'Önizlemeyi gizle' : 'Önizlemeyi göster' }}
        </RcButton>

        <div v-else class="rce-viewtabs">
          <button
            type="button"
            class="rce-viewtabs__btn"
            :class="{ 'rce-viewtabs__btn--active': activeTab === 'doc' }"
            @click="activeTab = 'doc'"
          >
            Belge
          </button>
          <button
            type="button"
            class="rce-viewtabs__btn"
            :class="{ 'rce-viewtabs__btn--active': activeTab === 'preview' }"
            @click="activeTab = 'preview'"
          >
            Önizleme
          </button>
        </div>

        <RcButton variant="secondary" size="sm" :disabled="working || loading || showEmptyState" @click="handlePdf">
          <RcIcon name="download" :size="14" />
          PDF indir
        </RcButton>

        <RcButton
          v-if="!locked"
          variant="accent"
          size="sm"
          :disabled="working || loading || showEmptyState"
          @click="handleSave"
        >
          <span v-if="dirty" class="rce-dirty-dot" />
          {{ isTemplateMode ? 'Kaydet ve yayınla' : 'Kaydet' }}
        </RcButton>
      </div>
    </div>

    <!-- Şablon modu bandı -->
    <div v-if="isTemplateMode" class="rce-banner rce-banner--template">
      <RcIcon name="folder" :size="16" />
      <b>Şablon düzenliyorsunuz.</b>
      <span>Akıllı alanlarda örnek veriler görünür; kaydedince bu türdeki tüm <b>yeni</b> belgelere uygulanır. Mevcut belgeler değişmez.</span>
      <button type="button" class="rce-banner__action" @click="toggleSampleNames">
        {{ sampleNames ? 'Örnek verileri göster' : 'Alan adlarını göster' }}
      </button>
    </div>

    <!-- Kilitli belge bandı -->
    <div v-if="locked" class="rce-banner rce-banner--locked">
      <RcIcon name="shield" :size="16" />
      <b>Bu belge imzalandı, değiştirilemez.</b>
      <span>{{ lockInfo }}. Değişiklik için yeni sürüm oluşturun.</span>
      <button type="button" class="rce-banner__action" @click="handleNewVersion">Kopyala ve yeni sürüm</button>
    </div>

    <!-- Gövde -->
    <div class="rce-body">
      <div v-show="showCanvas" class="rce-canvas" :class="{ 'rce-canvas--narrow': narrow }">
        <div v-if="loading" class="rce-paper-shell">
          <div class="rc-skeleton" style="height: 480px; border-radius: 6px" />
        </div>

        <div v-else-if="showEmptyState" class="rce-empty">
          <div class="rce-empty__head">
            <h2 class="rce-empty__title">Henüz belge yok</h2>
            <p class="rce-empty__sub">Hazır bir şablondan başlayın; içindeki bilgiler kiralamadan otomatik dolar.</p>
          </div>
          <div class="rce-empty__grid">
            <button
              v-for="card in EMPTY_CARDS"
              :key="card.type"
              type="button"
              class="rce-empty__card"
              @click="chooseType(card.type)"
            >
              <span class="rce-thumb">
                <span class="rce-thumb__line rce-thumb__line--bold" style="width: 70%" />
                <span class="rce-thumb__line" style="width: 100%" />
                <span class="rce-thumb__line" style="width: 90%" />
                <span v-if="card.thumb === 'offer'" class="rce-thumb__line rce-thumb__line--box" />
                <span v-else-if="card.thumb === 'handover'" class="rce-thumb__line rce-thumb__line--wide-box" />
                <span v-else class="rce-thumb__line" style="width: 95%" />
                <span class="rce-thumb__line" style="width: 60%" />
              </span>
              <span>
                <b class="rce-empty__card-name">{{ CONTRACT_DOCUMENT_TYPE_LABELS[card.type] }}</b>
                <span class="rce-empty__card-desc">{{ card.desc }}</span>
              </span>
            </button>
            <button type="button" class="rce-empty__card rce-empty__card--dashed" @click="chooseType('RENTAL_CONTRACT', true)">
              <span class="rce-thumb rce-thumb--dashed">
                <RcIcon name="plus" :size="20" />
              </span>
              <span>
                <b class="rce-empty__card-name">Boş belge</b>
                <span class="rce-empty__card-desc">Sıfırdan başlayın, blokları kendiniz ekleyin.</span>
              </span>
            </button>
          </div>
        </div>

        <BlockCanvas v-else />
      </div>

      <DocumentPreviewPane
        v-if="showPreviewPane && !loading && !showEmptyState && blocks.length > 0"
        @close="narrow ? (activeTab = 'doc') : (previewOpen = false)"
      />
    </div>

    <FieldPickerPopover />
    <ChipInfoPopover />
  </div>
</template>
