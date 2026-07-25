<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useContractEditorStore } from '@/stores/contractEditor.store'
import { placeholderInfo } from '@/utils/placeholderLabels'
import { fieldSource } from '@/utils/contractSampleData'
import { editorUi, closeAllMenus } from './editorUi'
import { popoverStyle } from './popoverPosition'

const store = useContractEditorStore()
const { placeholders } = storeToRefs(store)

const style = computed(() => popoverStyle(editorUi.chipInfo.anchor, 250, 120))

const fieldKey = computed(() => editorUi.chipInfo.fieldKey ?? '')
const label = computed(() => placeholderInfo(fieldKey.value).label)
const value = computed(() => placeholders.value[fieldKey.value] ?? '')
const source = computed(() => fieldSource(fieldKey.value))
</script>

<template>
  <div
    v-if="editorUi.chipInfo.open"
    v-click-outside="closeAllMenus"
    class="rce-popover rce-chipinfo"
    :style="style"
  >
    <div class="rce-chipinfo__label">{{ label }}</div>
    <div class="rce-chipinfo__value" :class="{ 'rce-chipinfo__value--empty': !value }">
      {{ value || 'Değer boş — belgede "—" görünür' }}
    </div>
    <div class="rce-chipinfo__source">Kaynak: {{ source }}</div>
  </div>
</template>
