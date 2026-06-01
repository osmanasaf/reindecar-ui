<script setup lang="ts">
import { computed } from 'vue'
import type { VehicleInsuranceResponse } from '@/types'
import { useEnumTranslations } from '@/composables'
import { RcButton, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'
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
  if (!ins.active) return { label: 'Pasif', badge: 'default' as const, accent: 'passive' as const }
  if (ins.isExpired) return { label: 'Süresi Doldu', badge: 'danger' as const, accent: 'expired' as const }
  if (ins.isExpiringSoon) return { label: 'Yakında Dolacak', badge: 'warning' as const, accent: 'soon' as const }
  return { label: 'Aktif', badge: 'success' as const, accent: 'ok' as const }
})
</script>

<template>
  <div
    class="rc-card rcv-insurance-card"
    :class="`rcv-insurance-card--${statusInfo.accent}`"
  >
    <div class="rc-card__body">
      <div class="rcv-insurance-card__head">
        <div class="rcv-insurance-card__brand">
          <div class="rcv-insurance-card__icon">
            <RcIcon name="shield" :size="18" />
          </div>
          <div>
            <h3 class="rcv-insurance-card__type">
              {{ translateInsuranceType(insurance.insuranceType) }}
            </h3>
            <p v-if="insurance.company" class="rcv-insurance-card__company">
              {{ insurance.company }}
            </p>
          </div>
        </div>
        <RcBadge :variant="statusInfo.badge">{{ statusInfo.label }}</RcBadge>
      </div>

      <div
        v-if="insurance.isExpiringSoon && !insurance.isExpired && insurance.active"
        class="rcv-insurance-card__warn"
      >
        <RcIcon name="warning" :size="14" />
        Poliçe yakında sona erecek
      </div>

      <div class="rcv-insurance-card__rows">
        <div class="rcv-insurance-card__row">
          <span class="rcv-insurance-card__row-label">Poliçe No</span>
          <span class="rcv-insurance-card__row-value rc-mono">
            {{ insurance.policyNumber || '—' }}
          </span>
        </div>
        <div class="rcv-insurance-card__row">
          <span class="rcv-insurance-card__row-label">Geçerlilik</span>
          <span class="rcv-insurance-card__row-value">
            {{ formatDate(insurance.startDate) }}
            <span style="color: var(--rc-text-muted); margin: 0 4px">→</span>
            <span
              :class="{ 'rcv-insurance-card__row-value--danger': insurance.isExpired }"
            >
              {{ formatDate(insurance.endDate) }}
            </span>
          </span>
        </div>
        <div v-if="insurance.contactPhone" class="rcv-insurance-card__row">
          <span class="rcv-insurance-card__row-label">İletişim</span>
          <span class="rcv-insurance-card__row-value">
            {{ formatPhoneInput(insurance.contactPhone) }}
          </span>
        </div>
      </div>

      <div v-if="insurance.coverage || insurance.premium" class="rcv-insurance-card__fin">
        <div v-if="insurance.coverage" class="rcv-insurance-card__fin-item">
          <span class="rcv-insurance-card__fin-label">Teminat</span>
          <span class="rcv-insurance-card__fin-value">
            {{ formatCurrency(insurance.coverage, insurance.coverageCurrency || 'TRY') }}
          </span>
        </div>
        <div v-if="insurance.premium" class="rcv-insurance-card__fin-item">
          <span class="rcv-insurance-card__fin-label">Prim</span>
          <span class="rcv-insurance-card__fin-value rcv-insurance-card__fin-value--muted">
            {{ formatCurrency(insurance.premium, insurance.premiumCurrency || 'TRY') }}
          </span>
        </div>
      </div>

      <p v-if="insurance.notes" class="rcv-insurance-card__notes">{{ insurance.notes }}</p>

      <div class="rcv-insurance-card__actions">
        <RcButton
          v-if="insurance.active"
          variant="ghost"
          size="xs"
          :disabled="disabled"
          @click="emit('deactivate', insurance.id)"
        >
          Pasife al
        </RcButton>
        <RcButton
          v-else
          variant="accent"
          size="xs"
          :disabled="disabled"
          @click="emit('activate', insurance.id)"
        >
          Aktife al
        </RcButton>
      </div>
    </div>
  </div>
</template>
