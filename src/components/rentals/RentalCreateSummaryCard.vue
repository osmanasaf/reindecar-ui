<script setup lang="ts">
import { computed } from 'vue'
import { RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { fmtTRY } from '@/utils/format'
import { formatIncludedKmDisplay } from '@/utils/km'
import type { RentalType, KmPackage } from '@/types'

const props = defineProps<{
  currentStep: number
  rentalType: RentalType
  typeLabel: string
  startDate: string
  endDate: string
  totalDays: number
  termMonths?: number
  isLeasing: boolean
  customerSelected: boolean
  customerLabel?: string
  vehicleSelected: boolean
  vehicleLabel?: string
  kmPackage: KmPackage | null
  extraItemsCount: number
  baseTotal: number
  extrasTotal: number
  discountAmount: number
  finalTotal: number
}>()

interface SumRow {
  label: string
  value: string
  sub?: string
  done: boolean
}

const rows = computed((): SumRow[] => {
  const duration = props.isLeasing
    ? `${props.termMonths ?? 12} ay`
    : props.totalDays > 0
      ? `${props.totalDays} gün`
      : undefined
  return [
    { label: 'Tip', value: props.typeLabel, done: props.currentStep >= 1 && !!props.rentalType },
    {
      label: 'Tarih',
      value: props.startDate && props.endDate ? `${props.startDate} → ${props.endDate}` : '—',
      sub: duration,
      done: props.currentStep >= 2 && !!props.startDate && !!props.endDate,
    },
    {
      label: 'Araç',
      value: props.vehicleLabel || (props.vehicleSelected ? 'Seçildi' : '—'),
      done: props.currentStep >= 3 && props.vehicleSelected,
    },
    {
      label: 'Müşteri',
      value: props.customerLabel || (props.customerSelected ? 'Seçildi' : '—'),
      done: props.currentStep >= 4 && props.customerSelected,
    },
    {
      label: 'KM paketi',
      value: props.kmPackage?.name || '—',
      sub: props.kmPackage && !props.kmPackage.unlimited
        ? formatIncludedKmDisplay(
            props.rentalType,
            props.kmPackage.includedKm,
            props.totalDays,
            props.kmPackage.unlimited,
          )
        : props.kmPackage?.unlimited
          ? 'Sınırsız KM'
          : undefined,
      done: props.currentStep >= 5,
    },
    {
      label: 'Ek kalemler',
      value: props.extraItemsCount === 0 ? 'Yok' : `${props.extraItemsCount} adet`,
      done: props.currentStep >= 6,
    },
  ]
})
</script>

<template>
  <div class="rc-card rcr-create-summary">
    <div class="rc-card__head">
      <div class="rc-card__title">Canlı özet</div>
      <RcBadge variant="accent">Taslak</RcBadge>
    </div>
    <div class="rcr-create-summary__rows">
      <div v-for="(row, i) in rows" :key="i" class="rcr-create-summary__row">
        <span class="rcr-create-summary__check">
          <RcIcon v-if="row.done" name="check" :size="14" style="color: var(--rc-success-500)" />
          <span v-else class="rcr-create-summary__pending" />
        </span>
        <div class="rcr-create-summary__row-body">
          <div class="rcr-create-summary__row-label">{{ row.label }}</div>
          <div class="rcr-create-summary__row-value" :class="{ 'rcr-create-summary__row-value--done': row.done }">
            {{ row.value }}
          </div>
          <div v-if="row.sub" class="rcr-create-summary__row-sub">{{ row.sub }}</div>
        </div>
      </div>
    </div>
    <hr class="rc-hr" style="margin: 0" />
    <div class="rcr-create-summary__pricing">
      <div class="rcr-price-line">
        <span>Kira</span>
        <span class="rc-num">{{ fmtTRY(baseTotal) }}</span>
      </div>
      <div v-if="extrasTotal > 0" class="rcr-price-line">
        <span>Ek kalemler</span>
        <span class="rc-num">{{ fmtTRY(extrasTotal) }}</span>
      </div>
      <div v-if="discountAmount > 0" class="rcr-price-line rcr-price-line--discount">
        <span>İndirim</span>
        <span class="rc-num">−{{ fmtTRY(discountAmount) }}</span>
      </div>
      <div class="rcr-create-summary__total">
        <span>Toplam</span>
        <span class="rc-num">{{ fmtTRY(finalTotal) }}</span>
      </div>
    </div>
  </div>
</template>
