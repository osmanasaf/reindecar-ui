<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RcIcon } from '@/components/icons'
import { useContractEditorStore } from '@/stores/contractEditor.store'
import { isNumericCellText, parseOrderedSections, sectionBaseName, serializeBlocks, splitSignatureLine } from '@/utils/contractBlocks'
import { miniMarkdownToHtml, inlineMiniMarkdownToHtml } from '@/utils/miniMarkdown'

const emit = defineEmits<{
  close: []
}>()

const store = useContractEditorStore()
const { blocks, placeholders, documentType } = storeToRefs(store)

const PAPER_WIDTH = 760

const boxEl = ref<HTMLElement | null>(null)
const innerEl = ref<HTMLElement | null>(null)
const previewHtml = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null

const defaultTitle = computed(() =>
  documentType.value === 'PRICE_OFFER' ? 'FİYAT TEKLİFİ' : 'ARAÇ KİRALAMA SÖZLEŞMESİ',
)

function renderLines(body: string, className: string): string {
  const html = miniMarkdownToHtml(body)
  return `<div class="${className}">${html}</div>`
}

function renderTable(body: string): string {
  const lines = body.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return ''
  const rows = lines
    .map(
      (line) =>
        `<tr>${line
          .split('|')
          .map((cell) => {
            const text = cell.trim()
            const cls = isNumericCellText(text) ? ' class="rcep-num"' : ''
            return `<td${cls}>${inlineMiniMarkdownToHtml(text)}</td>`
          })
          .join('')}</tr>`,
    )
    .join('')
  return `<table class="rcep-table"><tbody>${rows}</tbody></table>`
}

function renderTerms(body: string): string {
  const items = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (items.length === 0) return ''
  const rows = items
    .map((item, i) => {
      const text = item.replace(/^\d+[.)]\s*/, '')
      return `<div class="rcep-list__item"><span class="rcep-list__num">${i + 1}.</span><span>${inlineMiniMarkdownToHtml(text)}</span></div>`
    })
    .join('')
  return `<div class="rcep-list">${rows}</div>`
}

function renderSignature(body: string): string {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  let html = ''
  for (const line of lines) {
    const parts = splitSignatureLine(inlineMiniMarkdownToHtml(line))
    if (parts) {
      html += `<div class="rcep-signature"><div class="rcep-signature__cell">${parts[0]}</div><div class="rcep-signature__cell">${parts[1]}</div></div>`
    } else {
      html += `<div class="rcep-signature__line">${inlineMiniMarkdownToHtml(line)}</div>`
    }
  }
  return html
}

/** Backend PDF üreticiyle aynı kural: bölümler yazım sırasıyla basılır. */
function buildPreviewHtml(): string {
  const content = serializeBlocks(blocks.value, {
    chipMode: 'resolve',
    placeholders: placeholders.value,
  })
  const sections = parseOrderedSections(content)
  const hasTitle = sections.some((s) => sectionBaseName(s.name) === 'TITLE')
  let defaultTitleAdded = false

  let html = ''
  for (const section of sections) {
    const name = sectionBaseName(section.name)
    if (!hasTitle && !defaultTitleAdded && name !== 'HEADER') {
      html += `<div class="rcep-title">${defaultTitle.value}</div>`
      defaultTitleAdded = true
    }
    const body = section.body
    if (name === 'TITLE') {
      html += `<div class="rcep-title">${body.trim() ? miniMarkdownToHtml(body) : defaultTitle.value}</div>`
      continue
    }
    if (name === 'DIVIDER') {
      html += '<div class="rcep-divider"></div>'
      continue
    }
    if (!body.trim()) continue
    if (name === 'HEADER') html += renderLines(body, 'rcep-header')
    else if (name === 'RECIPIENT') html += renderLines(body, 'rcep-recipient')
    else if (name === 'META') html += renderLines(body, 'rcep-meta')
    else if (name === 'TABLE') html += renderTable(body)
    else if (name === 'TERMS') html += renderTerms(body)
    else if (name === 'SIGNATURE') html += renderSignature(body)
    else html += renderLines(body, 'rcep-text')
  }
  if (!hasTitle && !defaultTitleAdded) {
    html += `<div class="rcep-title">${defaultTitle.value}</div>`
  }
  return html
}

function applyScale() {
  if (!boxEl.value || !innerEl.value) return
  const scale = boxEl.value.clientWidth / PAPER_WIDTH
  innerEl.value.style.transform = `scale(${scale})`
  const paper = innerEl.value.firstElementChild as HTMLElement | null
  if (paper) {
    boxEl.value.style.height = `${paper.offsetHeight * scale}px`
  }
}

function refresh() {
  previewHtml.value = buildPreviewHtml()
  requestAnimationFrame(applyScale)
}

watch(
  [blocks, placeholders],
  () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(refresh, 220)
  },
  { deep: true },
)

onMounted(() => {
  refresh()
  if (window.ResizeObserver && boxEl.value) {
    resizeObserver = new ResizeObserver(applyScale)
    resizeObserver.observe(boxEl.value)
  }
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  resizeObserver?.disconnect()
})
</script>

<template>
  <aside class="rce-preview">
    <div class="rce-preview__head">
      <span class="rce-preview__title">PDF önizleme</span>
      <span class="rce-preview__sub">Yazdırıldığında böyle görünür</span>
      <button type="button" class="rce-preview__close" aria-label="Önizlemeyi kapat" @click="emit('close')">
        <RcIcon name="chevronRight" :size="14" />
      </button>
    </div>
    <div class="rce-preview__scroll">
      <div ref="boxEl" class="rce-preview__box">
        <div ref="innerEl" class="rce-preview__inner">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="rce-preview-paper" v-html="previewHtml" />
        </div>
      </div>
      <div class="rce-preview__foot">
        <span>A4 · PDF ile birebir bölüm düzeni</span>
        <span>Otomatik güncellenir</span>
      </div>
    </div>
  </aside>
</template>
