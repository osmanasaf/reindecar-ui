<script setup lang="ts">
import RcSkeleton from './RcSkeleton.vue'

withDefaults(defineProps<{
  lines?: number
  lastLineWidth?: string
}>(), {
  lines: 3,
  lastLineWidth: '60%',
})
</script>

<template>
  <div class="rc-skel-text-group">
    <RcSkeleton
      v-for="i in lines"
      :key="i"
      variant="text"
      :width="i === lines ? lastLineWidth : '100%'"
      height="14px"
    />
  </div>
</template>
