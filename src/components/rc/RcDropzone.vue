<script setup lang="ts">
import { ref } from 'vue'
import { RcIcon, type IconName } from '@/components/icons'

const props = withDefaults(
  defineProps<{
    accept?: string
    title?: string
    hint?: string
    icon?: IconName
    busy?: boolean
    busyLabel?: string
    disabled?: boolean
    multiple?: boolean
    compact?: boolean
  }>(),
  {
    title: 'Dosyayı buraya sürükle veya seç',
    icon: 'upload',
    busy: false,
    busyLabel: 'Dosya işleniyor…',
    disabled: false,
    multiple: false,
    compact: false,
  },
)

const emit = defineEmits<{ select: [files: File[]] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)

function openPicker() {
  if (props.busy || props.disabled) return
  fileInput.value?.click()
}

function emitFiles(list: FileList | null | undefined) {
  const files = Array.from(list ?? [])
  if (files.length === 0) return
  emit('select', props.multiple ? files : [files[0] as File])
}

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  emitFiles(input.files)
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  if (props.busy || props.disabled) return
  emitFiles(event.dataTransfer?.files)
}
</script>

<template>
  <div
    class="rc-dropzone"
    :class="{
      'rc-dropzone--over': dragOver,
      'rc-dropzone--busy': busy,
      'rc-dropzone--disabled': disabled,
      'rc-dropzone--sm': compact,
    }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled || undefined"
    :aria-busy="busy || undefined"
    @click="openPicker"
    @keydown.enter.prevent="openPicker"
    @keydown.space.prevent="openPicker"
    @dragover.prevent="dragOver = !disabled && !busy"
    @dragleave.prevent="dragOver = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      class="rc-dropzone__input"
      tabindex="-1"
      @change="onInput"
    />
    <span class="rc-dropzone__icon">
      <RcIcon :name="busy ? 'clock' : icon" :size="compact ? 16 : 20" />
    </span>
    <div class="rc-dropzone__text">
      <div class="rc-dropzone__title">{{ busy ? busyLabel : title }}</div>
      <div v-if="hint" class="rc-dropzone__hint">{{ hint }}</div>
    </div>
  </div>
</template>

<style scoped>
.rc-dropzone__input {
  display: none;
}
</style>
