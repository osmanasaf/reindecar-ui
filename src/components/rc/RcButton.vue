<script setup lang="ts">
import { computed } from 'vue'

type ButtonVariant = 'default' | 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'default' | 'xs' | 'sm' | 'lg'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: boolean
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}>(), {
  variant: 'default',
  size: 'default',
  icon: false,
  type: 'button',
  disabled: false,
})

const classes = computed(() => {
  const list = ['rc-btn']
  if (props.variant !== 'default') list.push(`rc-btn--${props.variant}`)
  if (props.size === 'xs') list.push('rc-btn--xs')
  if (props.size === 'sm') list.push('rc-btn--sm')
  if (props.size === 'lg') list.push('rc-btn--lg')
  if (props.icon) list.push('rc-btn--icon')
  return list
})
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled">
    <slot />
  </button>
</template>
