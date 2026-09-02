<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { matchesSearch, toSearchQuery } from '@/utils/search'
import { storeToRefs } from 'pinia'
import { useContractEditorStore } from '@/stores/contractEditor.store'
import { groupPlaceholders } from '@/utils/placeholderLabels'
import { editorUi, closeAllMenus, getInsertTarget } from './editorUi'
import { popoverStyle } from './popoverPosition'
import { createChipElement } from './chipDom'

const emit = defineEmits<{
  inserted: []
}>()

const store = useContractEditorStore()
const { placeholders, mode, sampleNames } = storeToRefs(store)

const search = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

const STRUCTURAL_KEYS = new Set(['termsBlock', 'driversBlock'])

const groups = computed(() => {
  const keys = Object.keys(placeholders.value).filter((k) => !STRUCTURAL_KEYS.has(k))
  const grouped = groupPlaceholders(keys)
  const term = toSearchQuery(search.value)
  if (!term) return grouped
  return grouped
    .map((g) => ({
      group: g.group,
      items: g.items.filter(
        (item) =>
          matchesSearch(item.label, term) ||
          matchesSearch(placeholders.value[item.key], term),
      ),
    }))
    .filter((g) => g.items.length > 0)
})

const style = computed(() => popoverStyle(editorUi.fieldPicker.anchor, 330, 440))

watch(
  () => editorUi.fieldPicker.open,
  async (open) => {
    if (open) {
      search.value = ''
      await nextTick()
      searchInput.value?.focus()
    }
  },
)

function insert(key: string) {
  const target = getInsertTarget()
  if (target?.kind === 'tiptap') {
    target.editor
      .chain()
      .focus()
      .insertContent([{ type: 'fieldChip', attrs: { field: key } }, { type: 'text', text: ' ' }])
      .run()
  } else if (target?.kind === 'dom') {
    const chip = createChipElement(key, {
      template: mode.value === 'template',
      sampleNames: sampleNames.value,
      values: placeholders.value,
    })
    chip.classList.add('rce-chip--flash')
    const range = target.range
    range.collapse(false)
    range.insertNode(document.createTextNode(' '))
    range.insertNode(chip)
    setTimeout(() => chip.classList.remove('rce-chip--flash'), 700)
    const editable = chip.closest('[data-rce-dom-editable]')
    editable?.dispatchEvent(new Event('input', { bubbles: true }))
  }
  closeAllMenus()
  emit('inserted')
}
</script>

<template>
  <div
    v-if="editorUi.fieldPicker.open"
    v-click-outside="closeAllMenus"
    class="rce-popover rce-fieldpicker"
    :style="style"
  >
    <div class="rce-fieldpicker__head">
      <div class="rce-fieldpicker__titlerow">
        <b class="rce-fieldpicker__title">Akıllı alan ekle</b>
        <button type="button" class="rce-fieldpicker__close" aria-label="Kapat" @click="closeAllMenus">×</button>
      </div>
      <p class="rce-fieldpicker__hint">
        Seçtiğiniz bilgi belgeye otomatik gelir; kiralama değişirse belge de güncellenir.
      </p>
      <input ref="searchInput" v-model="search" type="text" class="rce-fieldpicker__search" placeholder="Alan ara…" />
    </div>
    <div class="rce-fieldpicker__list">
      <template v-for="group in groups" :key="group.group">
        <div class="rce-fieldpicker__group">{{ group.group }}</div>
        <button
          v-for="item in group.items"
          :key="item.key"
          type="button"
          class="rce-fieldpicker__row"
          @click="insert(item.key)"
        >
          <span class="rce-fieldpicker__label">{{ item.label }}</span>
          <span
            class="rce-fieldpicker__value"
            :class="{ 'rce-fieldpicker__value--empty': !placeholders[item.key] }"
          >
            {{ placeholders[item.key] || 'boş' }}
          </span>
        </button>
      </template>
      <div v-if="groups.length === 0" class="rce-fieldpicker__empty">Eşleşen alan yok.</div>
    </div>
  </div>
</template>
