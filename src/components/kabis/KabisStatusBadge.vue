<script setup lang="ts">
import { computed } from 'vue'
import { RcBadge } from '@/components/rc'
import type { KabisNotificationStatus } from '@/types'

const props = defineProps<{
  status: KabisNotificationStatus
}>()

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
</script>

<template>
  <RcBadge :variant="meta.variant">{{ meta.label }}</RcBadge>
</template>
