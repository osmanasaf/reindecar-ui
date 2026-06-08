<script setup lang="ts">
import RcSkeleton from './RcSkeleton.vue'

withDefaults(defineProps<{
  count?: number
}>(), {
  count: 5,
})
</script>

<template>
  <div class="rc-skel-kpi-grid" aria-hidden="true">
    <div
      v-for="i in count"
      :key="i"
      class="rc-skel-kpi-card"
    >
      <RcSkeleton width="60%" height="12px" />
      <RcSkeleton width="45%" height="28px" radius="lg" />
      <RcSkeleton width="80%" height="10px" />
    </div>
  </div>
</template>
