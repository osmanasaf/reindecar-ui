<script setup lang="ts">
import type { PenaltyStatus } from '@/types'
import { RcStatusPill } from '@/components/rc'

defineProps<{
  status: PenaltyStatus
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <RcStatusPill :status="status" />
</template>
