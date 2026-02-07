<script setup lang="ts">
import { computed } from 'vue'
import type { ClaimStatus } from '@/types'
import { useEnumTranslations } from '@/composables'

interface Props {
  status: ClaimStatus
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const { translateClaimStatus } = useEnumTranslations()

const statusText = computed(() => translateClaimStatus(props.status))

const statusColors = computed(() => {
  const colors: Record<ClaimStatus, { bg: string; text: string; border: string }> = {
    DRAFT: {
      bg: '#F5F5F5',
      text: '#757575',
      border: '#BDBDBD'
    },
    SUBMITTED: {
      bg: '#E3F2FD',
      text: '#1565C0',
      border: '#64B5F6'
    },
    UNDER_REVIEW: {
      bg: '#FFF3E0',
      text: '#E65100',
      border: '#FFB74D'
    },
    APPROVED: {
      bg: '#E8F5E9',
      text: '#2E7D32',
      border: '#81C784'
    },
    REJECTED: {
      bg: '#FFEBEE',
      text: '#C62828',
      border: '#E57373'
    },
    PARTIAL_PAID: {
      bg: '#E0F7FA',
      text: '#00838F',
      border: '#4DD0E1'
    },
    FULLY_PAID: {
      bg: '#E8F5E9',
      text: '#1B5E20',
      border: '#4CAF50'
    }
  }
  return colors[props.status] || colors.DRAFT
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
