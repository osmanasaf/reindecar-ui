<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '@/utils/format'
import { RcBadge } from '@/components/rc'
import type { ReceivableStatus, PayableStatus } from '@/types'

interface Props {
  dueDate?: string
  status: ReceivableStatus | PayableStatus
}

const props = defineProps<Props>()

const isOverdue = computed(() => {
  if (!props.dueDate) return false
  const due = new Date(props.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today && props.status !== 'FULLY_PAID' && props.status !== 'CANCELLED'
})

const isUpcoming = computed(() => {
  if (!props.dueDate) return false
  const due = new Date(props.dueDate)
  const today = new Date()
  const weekLater = new Date()
  weekLater.setDate(today.getDate() + 7)
  return due >= today && due <= weekLater && props.status !== 'FULLY_PAID' && props.status !== 'CANCELLED'
})

const statusText = computed(() => {
  if (!props.dueDate) return 'Vade yok'
  if (props.status === 'FULLY_PAID') return 'Ödendi'
  if (isOverdue.value) return `Vadesi geçti: ${formatDate(props.dueDate)}`
  if (isUpcoming.value) return `Yakında: ${formatDate(props.dueDate)}`
  return `Vade: ${formatDate(props.dueDate)}`
})
</script>

<template>
  <RcBadge>{{ statusText }}</RcBadge>
</template>
