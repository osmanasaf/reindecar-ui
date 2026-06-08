<script setup lang="ts">
import { computed } from 'vue'

type SkeletonVariant = 'block' | 'text' | 'circle'
type SkeletonRadius = 'sm' | 'md' | 'lg' | 'full'

const props = withDefaults(defineProps<{
  width?: string | number
  height?: string | number
  radius?: SkeletonRadius
  variant?: SkeletonVariant
}>(), {
  width: '100%',
  height: '16px',
  radius: 'md',
  variant: 'block',
})

const radiusMap: Record<SkeletonRadius, string> = {
  sm: 'var(--rc-r-4)',
  md: 'var(--rc-r-6)',
  lg: 'var(--rc-r-8)',
  full: 'var(--rc-r-full)',
}

const style = computed(() => {
  const w = typeof props.width === 'number' ? `${props.width}px` : props.width
  const h = typeof props.height === 'number' ? `${props.height}px` : props.height
  return {
    width: w,
    height: h,
    borderRadius: props.variant === 'circle' ? '50%' : radiusMap[props.radius],
  }
})

const classes = computed(() => {
  const list = ['rc-skeleton']
  if (props.variant === 'text') list.push('rc-skel-text')
  return list
})
</script>

<template>
  <div :class="classes" :style="style" aria-hidden="true" />
</template>
