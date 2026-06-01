<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  data: number[]
  color?: string
  width?: number
  height?: number
}>(), {
  color: 'var(--rc-blue-500)',
  width: 80,
  height: 28,
})

const points = computed(() => {
  if (props.data.length < 2) return ''
  const max = Math.max(...props.data)
  const min = Math.min(...props.data)
  const span = max - min || 1
  const step = props.width / (props.data.length - 1)
  return props.data
    .map((v, i) => {
      const x = (i * step).toFixed(1)
      const y = (props.height - ((v - min) / span) * props.height).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')
})
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    role="img"
    aria-hidden="true"
  >
    <polyline
      :points="points"
      fill="none"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
