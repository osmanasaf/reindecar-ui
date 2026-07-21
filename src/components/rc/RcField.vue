<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  hint?: string
  required?: boolean
  error?: string
}>(), {})
</script>

<template>
  <label class="rc-field" :class="{ 'rc-field--error': !!error }">
    <span v-if="label" class="rc-field__label">
      {{ label }}<span v-if="required" class="rc-field__required" aria-hidden="true">*</span>
    </span>
    <slot />
    <span v-if="error" class="rc-field__error">{{ error }}</span>
    <span v-else-if="hint" class="rc-field__hint">{{ hint }}</span>
  </label>
</template>
