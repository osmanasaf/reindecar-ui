<script setup lang="ts">
import { watch, onBeforeUnmount, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { storeToRefs } from 'pinia'
import type { TextDocBlock } from '@/utils/contractBlocks'
import { useContractEditorStore } from '@/stores/contractEditor.store'
import { FieldChip } from './fieldChipExtension'
import { setTiptapTarget, openFieldPicker } from './editorUi'

const props = defineProps<{
  block: TextDocBlock
  locked: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

const store = useContractEditorStore()
const { placeholders, sampleNames, mode } = storeToRefs(store)

const roleClass = computed(() => `rce-text rce-text--${props.block.role}`)

const editor = useEditor({
  content: props.block.html,
  editable: !props.locked,
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      hardBreak: false,
      strike: false,
    }),
    FieldChip.configure({
      getContext: () => ({
        template: mode.value === 'template',
        sampleNames: sampleNames.value,
        values: placeholders.value,
      }),
    }),
  ],
  onUpdate: ({ editor: instance }) => {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.html = instance.getHTML()
    emit('change')
  },
  onFocus: ({ editor: instance }) => {
    setTiptapTarget(instance)
  },
})

watch(
  () => props.block.html,
  (value) => {
    if (!editor.value) return
    if (editor.value.getHTML() !== value) {
      editor.value.commands.setContent(value, { emitUpdate: false })
    }
  },
)

watch(
  () => props.locked,
  (value) => {
    editor.value?.setEditable(!value)
  },
)

function onFieldButton(event: MouseEvent) {
  if (!editor.value) return
  setTiptapTarget(editor.value)
  openFieldPicker(event.currentTarget as Element)
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div :class="roleClass">
    <span v-if="!locked" class="rce-block__tools">
      <button type="button" class="rce-tool-pill" @click.stop="onFieldButton">+ Alan ekle</button>
    </span>
    <EditorContent :editor="editor" />
  </div>
</template>
