<script setup lang="ts">
import { RcAntlerMark } from '@/components/icons'

withDefaults(defineProps<{
  showWordmark?: boolean
  suffix?: string
}>(), {
  showWordmark: true,
})
</script>

<template>
  <div class="rc-mark">
    <RcAntlerMark />
    <span v-if="showWordmark" class="rc-mark__wordmark">Reindecar</span>
    <span v-if="suffix" class="rc-badge rc-badge--accent">{{ suffix }}</span>
  </div>
</template>
