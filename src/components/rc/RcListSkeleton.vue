<script setup lang="ts">
import RcSkeleton from './RcSkeleton.vue'

withDefaults(defineProps<{
  rows?: number
  showAvatar?: boolean
}>(), {
  rows: 6,
  showAvatar: true,
})
</script>

<template>
  <div class="rc-skel-list" aria-hidden="true">
    <div
      v-for="i in rows"
      :key="i"
      class="rc-skel-list__row"
    >
      <RcSkeleton
        v-if="showAvatar"
        variant="circle"
        :width="36"
        :height="36"
      />
      <div class="rc-skel-list__content">
        <RcSkeleton width="55%" height="14px" />
        <RcSkeleton width="35%" height="12px" />
      </div>
      <RcSkeleton width="64px" height="24px" radius="full" />
    </div>
  </div>
</template>
