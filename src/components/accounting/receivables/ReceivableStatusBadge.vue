<script setup lang="ts">
import type { ReceivableStatus } from '@/types'
import { RcStatusPill } from '@/components/rc'

defineProps<{
  status: ReceivableStatus
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <RcStatusPill :status="status" />
</template>
