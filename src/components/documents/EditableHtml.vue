<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useContractEditorStore } from '@/stores/contractEditor.store'
import { paintChips, normalizeChipHtml, type ChipPaintContext } from './chipDom'
import { openChipInfo } from './editorUi'

const props = defineProps<{
  modelValue: string
  locked?: boolean
  tag?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: []
  keydownEnter: [event: KeyboardEvent]
  keydownBackspaceEmpty: []
}>()

const store = useContractEditorStore()
const { placeholders, sampleNames, mode } = storeToRefs(store)

const el = ref<HTMLElement | null>(null)

const ctx = computed<ChipPaintContext>(() => ({
  template: mode.value === 'template',
  sampleNames: sampleNames.value,
  values: placeholders.value,
}))

function paintedHtml(): string {
  return paintChips(props.modelValue, ctx.value)
}

function syncDom() {
  if (!el.value) return
  if (document.activeElement === el.value) return
  const next = paintedHtml()
  if (el.value.innerHTML !== next) {
    el.value.innerHTML = next
  }
}

onMounted(syncDom)
watch(() => props.modelValue, syncDom)
watch(ctx, syncDom, { deep: true })

function onInput() {
  if (!el.value) return
  emit('update:modelValue', normalizeChipHtml(el.value.innerHTML))
  emit('change')
}

function onClick(event: MouseEvent) {
  const chip = (event.target as HTMLElement).closest?.('[data-field]')
  if (chip) {
    event.preventDefault()
    event.stopPropagation()
    openChipInfo(chip, chip.getAttribute('data-field') ?? '')
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    emit('keydownEnter', event)
    return
  }
  if (event.key === 'Backspace' && (el.value?.textContent ?? '').trim() === '') {
    emit('keydownBackspaceEmpty')
  }
}

/** Dışarıdan (ör. çip ekleme sonrası) model senkronu için. */
function commitFromDom() {
  onInput()
}

defineExpose({ el, commitFromDom })
</script>

<template>
  <component
    :is="tag ?? 'div'"
    ref="el"
    :contenteditable="locked ? 'false' : 'true'"
    spellcheck="false"
    data-rce-dom-editable="1"
    @input="onInput"
    @click="onClick"
    @keydown="onKeydown"
  />
</template>
