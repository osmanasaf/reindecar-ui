<script setup lang="ts">
import { computed } from 'vue'
import type { ClaimStatus } from '@/types'
import { useEnumTranslations } from '@/composables'
import { getClaimStatusColor } from '@/utils/accounting'

interface Props {
  status: ClaimStatus
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const { translateClaimStatus } = useEnumTranslations()

const badgeColor = computed(() => getClaimStatusColor(props.status))
const statusText = computed(() => translateClaimStatus(props.status))
</script>

<template>
  <span :class="['badge', `badge-${size}`, `badge-${badgeColor}`]">
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

.badge-gray {
  background-color: #f9fafb;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.badge-blue {
  background-color: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.badge-orange {
  background-color: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.badge-green {
  background-color: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.badge-red {
  background-color: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.badge-teal {
  background-color: #f0fdfa;
  color: #115e59;
  border: 1px solid #99f6e4;
}

.badge-darkgreen {
  background-color: #f0fdf4;
  color: #14532d;
  border: 1px solid #bbf7d0;
}
</style>
