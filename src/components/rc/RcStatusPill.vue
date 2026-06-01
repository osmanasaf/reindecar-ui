<script setup lang="ts">
import { computed } from 'vue'
import { resolveStatus } from './statusConfig'

const props = defineProps<{ status: string }>()

const resolved = computed(() => resolveStatus(props.status))
</script>

<template>
  <span class="rc-status" :class="`rc-status--${resolved.variant}`">
    <span class="rc-dot" :class="`rc-dot--${resolved.dot}`" />
    {{ resolved.label }}
  </span>
</template>
