<script setup lang="ts">
import RcSkeleton from './RcSkeleton.vue'

withDefaults(defineProps<{
  rows?: number
  cols?: number
  showHeader?: boolean
}>(), {
  rows: 8,
  cols: 5,
  showHeader: true,
})
</script>

<template>
  <div class="rc-skel-table" aria-hidden="true">
    <div v-if="showHeader" class="rc-skel-table__head">
      <RcSkeleton
        v-for="c in cols"
        :key="`h-${c}`"
        height="12px"
        :width="c === 1 ? '70%' : '55%'"
      />
    </div>
    <div
      v-for="r in rows"
      :key="`r-${r}`"
      class="rc-skel-table__row"
    >
      <RcSkeleton
        v-for="c in cols"
        :key="`c-${r}-${c}`"
        height="14px"
        :width="c === 1 ? '80%' : c === cols ? '40%' : '65%'"
      />
    </div>
  </div>
</template>
