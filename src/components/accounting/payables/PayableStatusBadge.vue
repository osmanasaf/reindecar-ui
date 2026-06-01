<script setup lang="ts">
import type { PayableStatus } from '@/types'
import { RcStatusPill } from '@/components/rc'

defineProps<{
  status: PayableStatus
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <RcStatusPill :status="status" />
</template>
