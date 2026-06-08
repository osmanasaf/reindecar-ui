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
  loading?: boolean
}>(), {
  variant: 'default',
  size: 'default',
  icon: false,
  type: 'button',
  disabled: false,
  loading: false,
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
  <button
    :type="type"
    :class="[...classes, { 'rc-btn--loading': loading }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="rc-spin" aria-hidden="true" />
    <span class="rc-btn__inner" :class="{ 'rc-btn__inner--hidden': loading }">
      <slot />
    </span>
  </button>
</template>
