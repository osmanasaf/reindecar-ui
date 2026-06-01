<script setup lang="ts">
import type { ClaimStatus } from '@/types'
import { RcStatusPill } from '@/components/rc'

defineProps<{
  status: ClaimStatus
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <RcStatusPill :status="status" />
</template>
