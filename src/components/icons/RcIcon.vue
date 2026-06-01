<script setup lang="ts">
import { computed } from 'vue'
import { ICON_PATHS, type IconName } from './iconPaths'

const props = withDefaults(defineProps<{
  name: IconName
  size?: number
  strokeWidth?: number
}>(), {
  size: 16,
  strokeWidth: 1.6,
})

const innerHtml = computed(() => ICON_PATHS[props.name])
</script>

<template>
  <svg
    class="rc-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="innerHtml"
  />
</template>
