<script setup lang="ts">
defineProps<{ keys?: string }>()
</script>

<template>
  <kbd class="rc-kbd">
    <slot>{{ keys }}</slot>
  </kbd>
</template>
