<script setup lang="ts">
import { computed } from 'vue'
import type { PayableStatus } from '@/types'
import { useEnumTranslations } from '@/composables'

interface Props {
  status: PayableStatus
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const { translatePayableStatus } = useEnumTranslations()

const statusText = computed(() => translatePayableStatus(props.status))

const statusColors = computed(() => {
  const colors: Record<PayableStatus, { bg: string; text: string }> = {
    PENDING: { bg: '#fef3c7', text: '#92400e' },
    PARTIAL_PAID: { bg: '#dbeafe', text: '#1e40af' },
    FULLY_PAID: { bg: '#d1fae5', text: '#065f46' },
    OVERDUE: { bg: '#fee2e2', text: '#991b1b' },
    CANCELLED: { bg: '#f3f4f6', text: '#1f2937' }
  }
  return colors[props.status] || colors.PENDING
})
</script>

<template>
  <span 
    :class="['badge', `badge-${size}`]"
    :style="{
      backgroundColor: statusColors.bg,
      color: statusColors.text
    }"
  >
    {{ statusText }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.25rem;
  white-space: nowrap;
}

.badge-sm {
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
}

.badge-lg {
  padding: 0.375rem 1rem;
  font-size: 1rem;
}
</style>
