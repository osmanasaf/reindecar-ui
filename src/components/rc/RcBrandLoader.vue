<script setup lang="ts">
import { RcAntlerMark } from '@/components/icons'

withDefaults(defineProps<{
  size?: number
  mode?: 'stroke-draw' | 'pulse'
  label?: string
  fullscreen?: boolean
  pane?: boolean
}>(), {
  size: 40,
  mode: 'stroke-draw',
  label: '',
  fullscreen: false,
  pane: false,
})
</script>

<template>
  <div
    class="rc-brand-loader"
    :class="{
      'rc-brand-loader--fullscreen': fullscreen,
      'rc-brand-loader--pane': pane,
      [`rc-brand-loader--${mode}`]: true,
    }"
    role="status"
    :aria-label="label || 'Yükleniyor'"
  >
    <RcAntlerMark :size="size" class="rc-brand-loader__mark" />
    <p v-if="label" class="rc-brand-loader__label">{{ label }}</p>
  </div>
</template>
