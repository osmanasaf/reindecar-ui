<script setup lang="ts">
import { computed } from 'vue'
import { RcBadge } from '@/components/rc'
import type { KabisNotificationStatus } from '@/types'

const props = withDefaults(defineProps<{
  status: KabisNotificationStatus
  /** Force the live-pulse dot. Defaults to true for the "Bekliyor" state. */
  pulse?: boolean
}>(), {
  pulse: undefined,
})

const meta = computed(() => {
  switch (props.status) {
    case 'PENDING':
      return { label: 'Bekliyor', variant: 'warning' as const }
    case 'SENT':
      return { label: 'Gönderildi', variant: 'success' as const }
    case 'ACKED':
      return { label: 'Onaylandı', variant: 'info' as const }
    case 'FAILED':
      return { label: 'Başarısız', variant: 'danger' as const }
    default:
      return { label: props.status, variant: 'default' as const }
  }
})

const isPulsing = computed(() => props.pulse ?? props.status === 'PENDING')
</script>

<template>
  <RcBadge :variant="meta.variant">
    <span class="kbadge-dot" :class="{ 'rc-pulse': isPulsing }" aria-hidden="true" />
    {{ meta.label }}
  </RcBadge>
</template>

<style scoped>
.kbadge-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--rc-r-full);
  background: currentColor;
  flex-shrink: 0;
}
</style>
