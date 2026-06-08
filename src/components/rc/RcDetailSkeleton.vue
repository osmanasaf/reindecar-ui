<script setup lang="ts">
import RcSkeleton from './RcSkeleton.vue'
import RcSkeletonText from './RcSkeletonText.vue'

withDefaults(defineProps<{
  sections?: number
}>(), {
  sections: 2,
})
</script>

<template>
  <div class="rc-skel-detail" aria-hidden="true">
    <div class="rc-skel-detail__header">
      <RcSkeleton width="240px" height="28px" radius="lg" />
      <div class="rc-skel-detail__meta">
        <RcSkeleton width="120px" height="14px" />
        <RcSkeleton width="90px" height="14px" />
        <RcSkeleton width="100px" height="24px" radius="full" />
      </div>
    </div>

    <div class="rc-skel-detail__tabs">
      <RcSkeleton v-for="i in 4" :key="i" width="72px" height="32px" />
    </div>

    <div
      v-for="s in sections"
      :key="s"
      class="rc-skel-detail__section"
    >
      <RcSkeleton width="160px" height="18px" />
      <RcSkeletonText :lines="3" />
      <RcSkeleton width="100%" height="120px" radius="lg" />
    </div>
  </div>
</template>
