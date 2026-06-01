<script setup lang="ts">
withDefaults(defineProps<{ size?: 'sm' | 'default' | 'lg' }>(), { size: 'default' })
</script>

<template>
  <span
    class="rc-avatar"
    :class="{ 'rc-avatar--sm': size === 'sm', 'rc-avatar--lg': size === 'lg' }"
  >
    <slot />
  </span>
</template>
