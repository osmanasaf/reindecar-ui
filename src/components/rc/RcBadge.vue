<script setup lang="ts">
import { computed } from 'vue'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'purple' | 'solid'

const props = withDefaults(defineProps<{
  variant?: BadgeVariant
  dot?: boolean
}>(), {
  variant: 'default',
  dot: false,
})

const classes = computed(() => {
  const list = ['rc-badge']
  if (props.dot) list.push('rc-badge--dot')
  if (props.variant !== 'default') list.push(`rc-badge--${props.variant}`)
  return list
})
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
