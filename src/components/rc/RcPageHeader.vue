<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="rc-page__head">
    <div class="rc-page__headline">
      <h1 class="rc-page__title">{{ title }}</h1>
      <div v-if="subtitle" class="rc-page__subtitle">{{ subtitle }}</div>
    </div>
    <div v-if="$slots.actions" class="rc-page__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
