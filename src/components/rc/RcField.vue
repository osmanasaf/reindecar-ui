<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  hint?: string
}>(), {})
</script>

<template>
  <label class="rc-field">
    <span v-if="label" class="rc-field__label">{{ label }}</span>
    <slot />
    <span v-if="hint" class="rc-field__hint">{{ hint }}</span>
  </label>
</template>
