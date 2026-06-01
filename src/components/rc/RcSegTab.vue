<script setup lang="ts">
const props = defineProps<{
  id: string
  active: string
  count?: number
}>()

const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <button
    type="button"
    class="rc-segtab"
    :class="{ 'rc-segtab--active': active === id }"
    @click="emit('select', id)"
  >
    <slot />
    <span v-if="count != null && count > 0" class="rc-segtab__count">{{ count }}</span>
  </button>
</template>
