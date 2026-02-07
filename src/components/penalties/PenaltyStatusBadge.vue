<script setup lang="ts">
import { computed } from 'vue'
import type { PenaltyStatus } from '@/types'
import { useEnumTranslations } from '@/composables'

interface Props {
  status: PenaltyStatus
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const { translatePenaltyStatus } = useEnumTranslations()

const statusText = computed(() => translatePenaltyStatus(props.status))

const statusColors = computed(() => {
  const colors: Record<PenaltyStatus, { bg: string; text: string; border: string }> = {
    PENDING: {
      bg: '#F5F5F5',
      text: '#757575',
      border: '#BDBDBD'
    },
    NOTIFIED: {
      bg: '#FFF3E0',
      text: '#E65100',
      border: '#FFB74D'
    },
    DISPUTED: {
      bg: '#E3F2FD',
      text: '#1565C0',
      border: '#64B5F6'
    },
    PAID_BY_CUSTOMER: {
      bg: '#E8F5E9',
      text: '#2E7D32',
      border: '#81C784'
    },
    PAID_BY_COMPANY: {
      bg: '#E0F7FA',
      text: '#00838F',
      border: '#4DD0E1'
    },
    CANCELLED: {
      bg: '#FFEBEE',
      text: '#C62828',
      border: '#E57373'
    },
    WRITTEN_OFF: {
      bg: '#EFEBE9',
      text: '#5D4037',
      border: '#A1887F'
    }
  }
  return colors[props.status] || colors.PENDING
})
</script>

<template>
  <span 
    :class="['badge', `badge-${size}`]"
    :style="{
      backgroundColor: statusColors.bg,
      color: statusColors.text,
      borderColor: statusColors.border
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
  border: 1px solid;
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
