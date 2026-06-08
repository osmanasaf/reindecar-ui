<script setup lang="ts">
import { RcAntlerMark } from '@/components/icons'

defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="rc-empty">
    <div class="rc-empty__icon">
      <slot name="icon">
        <RcAntlerMark :size="32" />
      </slot>
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
