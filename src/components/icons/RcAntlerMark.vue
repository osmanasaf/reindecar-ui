<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 22 })
</script>

<template>
  <svg
    class="rc-mark__glyph"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M12 21V11" />
    <path d="M12 11 L8 7 M8 7 L4 7 M8 7 L8 3" />
    <path d="M12 11 L16 7 M16 7 L20 7 M16 7 L16 3" />
  </svg>
</template>
