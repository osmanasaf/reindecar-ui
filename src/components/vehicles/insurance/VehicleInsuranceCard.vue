<script setup lang="ts">
import { computed } from 'vue'
import type { VehicleInsuranceResponse } from '@/types'
import { useEnumTranslations } from '@/composables'
import { formatCurrency, formatDate } from '@/utils/format'

interface Props {
  insurance: VehicleInsuranceResponse
}

const props = defineProps<Props>()

const { translateInsuranceType } = useEnumTranslations()

const statusInfo = computed(() => {
  const ins = props.insurance
  if (!ins.active) {
    return { label: 'Pasif', color: 'gray' }
  }
  if (ins.isExpired) {
    return { label: 'Süresi Doldu', color: 'red' }
  }
  if (ins.isExpiringSoon) {
    return { label: 'Yakında Dolacak', color: 'orange' }
  }
  return { label: 'Aktif', color: 'green' }
})

const borderColor = computed(() => {
  switch (statusInfo.value.color) {
    case 'red': return '#ef4444'
    case 'orange': return '#f97316'
    case 'green': return '#22c55e'
    default: return '#9ca3af'
  }
})
</script>

<template>
  <div class="insurance-card" :style="{ borderLeftColor: borderColor }">
    <div class="card-header">
      <div class="header-left">
        <h3 class="insurance-type">{{ translateInsuranceType(insurance.insuranceType) }}</h3>
        <span class="status-badge" :class="`status-${statusInfo.color}`">
          {{ statusInfo.label }}
        </span>
      </div>
    </div>

    <div class="card-body">
      <div class="info-row">
        <span class="label">Poliçe No:</span>
        <span class="value">{{ insurance.policyNumber || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="label">Şirket:</span>
        <span class="value">{{ insurance.company || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="label">Süre:</span>
        <span class="value">
          {{ formatDate(insurance.startDate) }} - {{ formatDate(insurance.endDate) }}
        </span>
      </div>
      
      <div v-if="insurance.coverage" class="coverage-info">
        <span class="label">Teminat:</span>
        <span class="value-highlight">
          {{ formatCurrency(insurance.coverage, insurance.coverageCurrency || 'TRY') }}
        </span>
      </div>
      
      <div v-if="insurance.premium" class="info-row">
        <span class="label">Prim:</span>
        <span class="value">
          {{ formatCurrency(insurance.premium, insurance.premiumCurrency || 'TRY') }}
        </span>
      </div>

      <div v-if="insurance.contactPhone" class="info-row">
        <span class="label">İletişim:</span>
        <span class="value">{{ insurance.contactPhone }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.insurance-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-left-width: 4px;
  border-radius: 0.5rem;
  padding: 1.25rem;
  transition: all 0.2s;
}

.insurance-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.insurance-type {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.status-badge {
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-green {
  background: #dcfce7;
  color: #166534;
}

.status-orange {
  background: #ffedd5;
  color: #9a3412;
}

.status-red {
  background: #fee2e2;
  color: #991b1b;
}

.status-gray {
  background: #f3f4f6;
  color: #4b5563;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.info-row .label {
  color: var(--color-text-secondary, #6b7280);
}

.info-row .value {
  font-weight: 500;
  color: var(--color-text, #111827);
  text-align: right;
}

.coverage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--color-border, #e5e7eb);
}

.coverage-info .label {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.value-highlight {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary, #2563eb);
}
</style>
