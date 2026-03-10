<script setup lang="ts">
import { computed } from 'vue'
import type { VehicleInsuranceResponse } from '@/types'
import { useEnumTranslations } from '@/composables'
import { formatCurrency, formatDate } from '@/utils/format'
import { formatPhoneInput } from '@/utils/phone'

const props = withDefaults(
  defineProps<{
    insurance: VehicleInsuranceResponse
    disabled?: boolean
  }>(),
  { disabled: false }
)

const emit = defineEmits<{
  activate: [id: number]
  deactivate: [id: number]
}>()

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
        <div class="type-icon" :class="`icon-${statusInfo.color}`">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h3 class="insurance-type">{{ translateInsuranceType(insurance.insuranceType) }}</h3>
          <p v-if="insurance.company" class="company-name">{{ insurance.company }}</p>
        </div>
      </div>
      <span class="status-badge" :class="`status-${statusInfo.color}`">
        {{ statusInfo.label }}
      </span>
    </div>

    <div v-if="insurance.isExpiringSoon && !insurance.isExpired && insurance.active" class="expiry-warning">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="warning-icon">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Poliçe yakında sona erecek
    </div>

    <div class="card-body">
      <div class="info-row">
        <span class="label">Poliçe No</span>
        <span class="value">{{ insurance.policyNumber || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="label">Geçerlilik</span>
        <span class="value date-range">
          <span>{{ formatDate(insurance.startDate) }}</span>
          <span class="date-sep">→</span>
          <span :class="{ 'text-danger': insurance.isExpired }">{{ formatDate(insurance.endDate) }}</span>
        </span>
      </div>
      
      <div v-if="insurance.coverage || insurance.premium" class="financial-row">
        <div v-if="insurance.coverage" class="financial-item">
          <span class="fin-label">Teminat</span>
          <span class="fin-value">
            {{ formatCurrency(insurance.coverage, insurance.coverageCurrency || 'TRY') }}
          </span>
        </div>
        <div v-if="insurance.premium" class="financial-item">
          <span class="fin-label">Prim</span>
          <span class="fin-value secondary">
            {{ formatCurrency(insurance.premium, insurance.premiumCurrency || 'TRY') }}
          </span>
        </div>
      </div>

      <div v-if="insurance.contactPhone" class="info-row">
        <span class="label">İletişim</span>
        <span class="value">{{ formatPhoneInput(insurance.contactPhone) }}</span>
      </div>

      <div v-if="insurance.notes" class="notes-row">
        <span class="notes-text">{{ insurance.notes }}</span>
      </div>

      <div class="card-actions">
        <button
          v-if="insurance.active"
          type="button"
          class="btn btn-outline btn-sm"
          :disabled="disabled"
          @click="emit('deactivate', insurance.id)"
        >
          Pasife al
        </button>
        <button
          v-else
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="disabled"
          @click="emit('activate', insurance.id)"
        >
          Aktife al
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.insurance-card {
  background: var(--color-surface, white);
  border: 1px solid var(--color-border, #e5e7eb);
  border-left-width: 4px;
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.insurance-card:hover {
  box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.type-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

.icon-green { background: #dcfce7; color: #15803d; }
.icon-orange { background: #ffedd5; color: #c2410c; }
.icon-red { background: #fee2e2; color: #b91c1c; }
.icon-gray { background: #f3f4f6; color: #374151; }

.insurance-type {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0 0 0.125rem 0;
}

.company-name {
  font-size: 0.8125rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-green { background: #dcfce7; color: #166534; }
.status-orange { background: #ffedd5; color: #9a3412; }
.status-red { background: #fee2e2; color: #991b1b; }
.status-gray { background: #f3f4f6; color: #4b5563; }

.expiry-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: #92400e;
  margin-bottom: 0.875rem;
}

.warning-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: #f59e0b;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  gap: 0.5rem;
}

.info-row .label {
  color: var(--color-text-secondary, #6b7280);
  flex-shrink: 0;
}

.info-row .value {
  font-weight: 500;
  color: var(--color-text, #111827);
  text-align: right;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.date-sep {
  color: var(--color-text-secondary, #9ca3af);
  font-size: 0.75rem;
}

.text-danger {
  color: #dc2626;
}

.financial-row {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--color-border, #e5e7eb);
}

.financial-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
}

.fin-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.fin-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary, #2563eb);
}

.fin-value.secondary {
  font-size: 0.875rem;
  color: var(--color-text, #374151);
}

.notes-row {
  margin-top: 0.375rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.notes-text {
  font-size: 0.8125rem;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.5;
  font-style: italic;
}

.card-actions {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border, #e5e7eb);
  color: var(--color-text, #374151);
}

.btn-outline:hover {
  background: var(--color-bg-secondary, #f3f4f6);
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover, #1d4ed8);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
