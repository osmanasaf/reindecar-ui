<script setup lang="ts">
import { computed } from 'vue'
import { RcIcon } from '@/components/icons'
import type { IconName } from '@/components/icons/iconPaths'
import { editorUi, closeAllMenus } from './editorUi'
import { popoverStyle } from './popoverPosition'

const emit = defineEmits<{
  pick: [type: 'text' | 'table' | 'list' | 'signature' | 'divider', index: number]
}>()

interface MenuItem {
  type: 'text' | 'table' | 'list' | 'signature' | 'divider'
  icon: IconName
  title: string
  desc: string
  disabled: boolean
}

const items = computed<MenuItem[]>(() => [
  { type: 'text', icon: 'textLines', title: 'Metin', desc: 'Paragraf, başlık, açıklama', disabled: false },
  { type: 'table', icon: 'tableGrid', title: 'Tablo', desc: 'Araç, adet, fiyat listesi', disabled: false },
  { type: 'list', icon: 'listOrdered', title: 'Madde listesi', desc: 'Numarası otomatik şartlar', disabled: false },
  { type: 'signature', icon: 'signature', title: 'İmza bloğu', desc: 'Taraf isimleri ve imza çizgisi', disabled: false },
  { type: 'divider', icon: 'minus', title: 'Ayraç', desc: 'İnce ayırıcı çizgi', disabled: false },
])

const style = computed(() => popoverStyle(editorUi.addMenu.anchor, 240, 300))

function pick(item: MenuItem) {
  if (item.disabled) return
  emit('pick', item.type, editorUi.addMenu.index)
  closeAllMenus()
}
</script>

<template>
  <div v-if="editorUi.addMenu.open" v-click-outside="closeAllMenus" class="rce-popover rce-addmenu" :style="style">
    <button
      v-for="item in items"
      :key="item.type"
      type="button"
      class="rce-addmenu__item"
      :disabled="item.disabled"
      @click="pick(item)"
    >
      <span class="rce-addmenu__icon">
        <RcIcon :name="item.icon" :size="14" />
      </span>
      <span>
        <b class="rce-addmenu__title">{{ item.title }}</b>
        <small class="rce-addmenu__desc">{{ item.desc }}</small>
      </span>
    </button>
  </div>
</template>
