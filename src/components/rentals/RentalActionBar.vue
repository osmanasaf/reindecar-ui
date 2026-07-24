<script setup lang="ts">
import { computed } from 'vue'
import { RcButton, RcStatusPill } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { IconName } from '@/components/icons/iconPaths'
import { RentalStatus } from '@/types/enums'
import type { Rental } from '@/types'
import { formatDate } from '@/utils/format'

export type RentalActionKind =
  | 'edit'
  | 'reserve'
  | 'activate'
  | 'return'
  | 'cancel'
  | 'payment'
  | 'damage'
  | 'penalty'
  | 'toll'
  | 'extend'
  | 'pdf'
  | 'offer-pdf'
  | 'close'
  | 'driver'

interface ActionDef {
  label: string
  icon: IconName
  kind: RentalActionKind
  danger?: boolean
}

const props = defineProps<{
  rental: Rental
  balance?: number
  canClose?: boolean
}>()

const emit = defineEmits<{ action: [kind: RentalActionKind] }>()

const primary = computed((): ActionDef | null => {
  switch (props.rental.status) {
    case RentalStatus.DRAFT:
      return { label: 'Rezerve et', icon: 'calendar', kind: 'reserve' }
    case RentalStatus.RESERVED:
      return { label: 'Aracı teslim et', icon: 'key', kind: 'activate' }
    case RentalStatus.ACTIVE:
      return { label: 'İade al', icon: 'arrowRight', kind: 'return' }
    case RentalStatus.OVERDUE:
      return { label: 'Acil iade al', icon: 'warning', kind: 'return' }
    case RentalStatus.RETURN_PENDING:
      return { label: 'İade işlemini tamamla', icon: 'check', kind: 'return' }
    case RentalStatus.PENDING_PAYMENT:
      return props.canClose
        ? { label: 'Kiralamayı kapat', icon: 'check', kind: 'close' }
        : { label: 'Ödeme al', icon: 'cash', kind: 'payment' }
    default:
      return null
  }
})

const secondary = computed((): ActionDef[] => {
  const s = props.rental.status
  if (s === RentalStatus.DRAFT) {
    return [
      { label: 'Düzenle', icon: 'edit', kind: 'edit' },
      { label: 'İptal', icon: 'close', kind: 'cancel', danger: true },
    ]
  }
  if (s === RentalStatus.RESERVED) {
    return [
      { label: 'Düzenle', icon: 'edit', kind: 'edit' },
      { label: 'İptal et', icon: 'close', kind: 'cancel', danger: true },
    ]
  }
  if (s === RentalStatus.ACTIVE) {
    const actions: ActionDef[] = [
      { label: 'Ödeme al', icon: 'cash', kind: 'payment' },
      { label: 'Hasar bildir', icon: 'wrench', kind: 'damage' },
      { label: 'Ceza ekle', icon: 'tag', kind: 'penalty' },
    ]
    if (props.rental.openEnded) {
      actions.unshift({ label: 'Bitiş belirle', icon: 'calendar', kind: 'edit' })
    }
    return actions
  }
  if (s === RentalStatus.OVERDUE) {
    return [
      { label: 'Uzat', icon: 'plus', kind: 'extend' },
      { label: 'Ödeme al', icon: 'cash', kind: 'payment' },
    ]
  }
  if (s === RentalStatus.RETURN_PENDING) {
    return [
      { label: 'Ödeme al', icon: 'cash', kind: 'payment' },
      { label: 'Hasar ekle', icon: 'wrench', kind: 'damage' },
      { label: 'Teslim tutanağı', icon: 'download', kind: 'pdf' },
    ]
  }
  if (s === RentalStatus.PENDING_PAYMENT) {
    return [
      { label: 'Ödeme al', icon: 'cash', kind: 'payment' },
      { label: 'Hasar ekle', icon: 'wrench', kind: 'damage' },
      { label: 'Teslim tutanağı', icon: 'download', kind: 'pdf' },
    ]
  }
  if (s === RentalStatus.CLOSED) {
    return [{ label: 'Teslim tutanağı', icon: 'download', kind: 'pdf' }]
  }
  return []
})

const nextLabel = computed((): string => {
  const r = props.rental
  switch (r.status) {
    case RentalStatus.DRAFT:
      return 'Müşteri onayı bekleniyor'
    case RentalStatus.RESERVED:
      return `Teslimat planı: ${formatDate(r.startDate)}`
    case RentalStatus.ACTIVE:
      return `İade planı: ${formatDate(r.endDate)}`
    case RentalStatus.OVERDUE:
      return `${r.overdueDays || 1} gün gecikmiş — derhal müdahale`
    case RentalStatus.RETURN_PENDING:
      return 'Son ödeme ve belge işlemleri'
    case RentalStatus.PENDING_PAYMENT:
      return (props.balance ?? 0) > 0 ? 'Tahsilat tamamlanmalı' : 'Kapatmaya hazır'
    case RentalStatus.CLOSED:
      return 'Kiralama tamamlandı'
    case RentalStatus.CANCELLED:
      return 'İptal edildi · geçmiş kayıt'
    default:
      return ''
  }
})

const primaryVariant = computed(() =>
  props.rental.status === RentalStatus.OVERDUE ? 'danger' : 'accent',
)
</script>

<template>
  <div class="rc-action-bar rcr-action-bar">
    <div class="rc-action-bar__status">
      <span class="rc-action-bar__label">Durum</span>
      <span class="rc-action-bar__state">
        <RcStatusPill :status="rental.status" />
      </span>
    </div>
    <div class="rc-action-bar__next">
      <RcIcon name="arrowRight" :size="14" style="color: var(--rc-text-faint); flex-shrink: 0" />
      <span>Sıradaki: <b>{{ nextLabel }}</b></span>
    </div>
    <div class="rc-action-bar__actions">
      <RcButton
        v-for="(act, i) in secondary"
        :key="`${act.kind}-${i}`"
        variant="ghost"
        size="sm"
        :style="act.danger ? { color: 'var(--rc-danger-700)' } : undefined"
        @click="emit('action', act.kind)"
      >
        <RcIcon :name="act.icon" :size="14" />
        {{ act.label }}
      </RcButton>
      <RcButton
        v-if="primary"
        :variant="primaryVariant"
        size="sm"
        @click="emit('action', primary.kind)"
      >
        <RcIcon :name="primary.icon" :size="14" />
        {{ primary.label }}
      </RcButton>
    </div>
  </div>
</template>
