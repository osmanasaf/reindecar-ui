<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '@/utils/format'
import type { ReceivableStatus, PayableStatus } from '@/types'

interface Props {
  dueDate?: string
  status: ReceivableStatus | PayableStatus
  showIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: true
})

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

const statusClass = computed(() => {
  if (props.status === 'FULLY_PAID') return 'paid'
  if (isOverdue.value) return 'overdue'
  if (isUpcoming.value) return 'upcoming'
  return 'normal'
})

const statusIcon = computed(() => {
  if (props.status === 'FULLY_PAID') return '✓'
  if (isOverdue.value) return '!'
  if (isUpcoming.value) return '⚠'
  return '○'
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
  <div :class="['due-status', statusClass]">
    <span v-if="showIcon" class="status-icon">{{ statusIcon }}</span>
    <span class="status-text">{{ statusText }}</span>
  </div>
</template>

<style scoped>
.due-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-text {
  line-height: 1.25rem;
}

.due-status.paid {
  background: #d1fae5;
  color: #065f46;
}

.due-status.overdue {
  background: #fee2e2;
  color: #991b1b;
}

.due-status.upcoming {
  background: #fef3c7;
  color: #92400e;
}

.due-status.normal {
  background: #f3f4f6;
  color: #374151;
}
</style>
