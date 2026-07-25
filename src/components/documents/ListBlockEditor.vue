<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { ListDocBlock } from '@/utils/contractBlocks'
import { contractClausesApi } from '@/api/contracts.api'
import { htmlToInlineMiniMarkdown } from '@/utils/miniMarkdown'
import { useToast } from '@/composables'
import { useContractEditorStore } from '@/stores/contractEditor.store'
import EditableHtml from './EditableHtml.vue'
import { openClauseMenu } from './editorUi'

const props = defineProps<{
  block: ListDocBlock
  locked: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

const itemRefs = ref<Array<InstanceType<typeof EditableHtml> | null>>([])

function updateItem(index: number, value: string) {
  // eslint-disable-next-line vue/no-mutating-props
  props.block.items[index] = value
  emit('change')
}

async function addItem(afterIndex?: number) {
  const index = afterIndex === undefined ? props.block.items.length : afterIndex + 1
  // eslint-disable-next-line vue/no-mutating-props
  props.block.items.splice(index, 0, '')
  emit('change')
  await nextTick()
  itemRefs.value[index]?.el?.focus()
}

function removeItem(index: number) {
  if (props.block.items.length <= 1) {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.items[0] = ''
    emit('change')
    return
  }
  // eslint-disable-next-line vue/no-mutating-props
  props.block.items.splice(index, 1)
  emit('change')
}

function onEnter(index: number, event: KeyboardEvent) {
  event.preventDefault()
  void addItem(index)
}

function onClauses(event: MouseEvent) {
  openClauseMenu(event.currentTarget as Element, props.block.id)
}

const toast = useToast()
const store = useContractEditorStore()

async function saveToLibrary(index: number) {
  const item = props.block.items[index]
  if (!item) return
  const text = htmlToInlineMiniMarkdown(item, (key) => store.placeholderValue(key)).trim()
  if (!text) {
    toast.error('Boş madde kitaplığa eklenemez')
    return
  }
  try {
    await contractClausesApi.create(text)
    toast.success('Madde kitaplığa eklendi')
  } catch (err) {
    toast.apiError(err, 'Kitaplığa eklenemedi')
  }
}
</script>

<template>
  <div>
    <div class="rce-list">
      <div v-for="(item, index) in block.items" :key="index" class="rce-list__item">
        <span class="rce-list__num">{{ index + 1 }}.</span>
        <EditableHtml
          :ref="(el) => (itemRefs[index] = el as InstanceType<typeof EditableHtml> | null)"
          class="rce-list__text"
          :model-value="item"
          :locked="locked"
          @update:model-value="(v: string) => updateItem(index, v)"
          @keydown-enter="(e: KeyboardEvent) => onEnter(index, e)"
          @keydown-backspace-empty="removeItem(index)"
        />
        <button
          v-if="!locked"
          type="button"
          class="rce-list__save"
          aria-label="Kitaplığa ekle"
          title="Kitaplığa ekle"
          @click="saveToLibrary(index)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; margin: 4px auto">
            <path d="M6 3h12v18l-6-4-6 4Z" />
          </svg>
        </button>
        <button
          v-if="!locked"
          type="button"
          class="rce-list__del"
          aria-label="Maddeyi sil"
          @click="removeItem(index)"
        >
          ×
        </button>
      </div>
    </div>
    <div v-if="!locked" class="rce-list__actions">
      <button type="button" class="rce-dashed-btn" @click="addItem()">+ Madde ekle</button>
      <button type="button" class="rce-dashed-btn" @click="onClauses">Kayıtlı maddelerden ekle</button>
    </div>
  </div>
</template>
