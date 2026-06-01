<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="rc-empty">
    <div v-if="$slots.icon" class="rc-empty__icon">
      <slot name="icon" />
    </div>
    <p v-if="title" class="rc-empty__title">{{ title }}</p>
    <p v-if="description || $slots.default">
      <slot>{{ description }}</slot>
    </p>
    <div v-if="$slots.action">
      <slot name="action" />
    </div>
  </div>
</template>
