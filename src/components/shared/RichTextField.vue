<script setup lang="ts">
import { watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { htmlToMiniMarkdown, miniMarkdownToHtml } from '@/utils/miniMarkdown'

const props = defineProps<{
  modelValue: string
  minHeight?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = useEditor({
  content: miniMarkdownToHtml(props.modelValue),
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      hardBreak: false,
      strike: false,
    }),
  ],
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', htmlToMiniMarkdown(instance.getHTML()))
  },
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return
    const currentAsMarkdown = htmlToMiniMarkdown(editor.value.getHTML())
    if (currentAsMarkdown !== value) {
      editor.value.commands.setContent(miniMarkdownToHtml(value), { emitUpdate: false })
    }
  },
)
</script>

<template>
  <div class="rc-rich-text">
    <div v-if="editor" class="rc-rich-text__toolbar">
      <button
        type="button"
        class="rc-rich-text__btn"
        :class="{ 'rc-rich-text__btn--active': editor.isActive('bold') }"
        title="Kalın"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <strong>K</strong>
      </button>
      <button
        type="button"
        class="rc-rich-text__btn"
        :class="{ 'rc-rich-text__btn--active': editor.isActive('italic') }"
        title="İtalik"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <em>İ</em>
      </button>
      <button
        type="button"
        class="rc-rich-text__btn"
        :class="{ 'rc-rich-text__btn--active': editor.isActive('bulletList') }"
        title="Madde listesi"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        •
      </button>
      <button
        type="button"
        class="rc-rich-text__btn"
        :class="{ 'rc-rich-text__btn--active': editor.isActive('orderedList') }"
        title="Numaralı liste"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        1.
      </button>
    </div>
    <EditorContent :editor="editor" class="rc-rich-text__content" :style="{ minHeight: `${minHeight ?? 120}px` }" />
  </div>
</template>

<style scoped>
.rc-rich-text {
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-md);
  overflow: hidden;
}

.rc-rich-text__toolbar {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--rc-border);
  background: var(--rc-surface-muted);
}

.rc-rich-text__btn {
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--rc-text);
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.rc-rich-text__btn:hover {
  background: var(--rc-surface);
}

.rc-rich-text__btn--active {
  border-color: var(--rc-blue-600);
  color: var(--rc-blue-600);
}

.rc-rich-text__content {
  padding: 10px 12px;
  font-size: 13.5px;
  line-height: 1.5;
}

.rc-rich-text__content :deep(.tiptap) {
  outline: none;
  min-height: inherit;
}

.rc-rich-text__content :deep(ul) {
  padding-left: 20px;
}

.rc-rich-text__content :deep(p) {
  margin: 0 0 6px;
}
</style>
