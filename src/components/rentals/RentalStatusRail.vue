<script setup lang="ts">
import { computed } from 'vue'
import { RcIcon } from '@/components/icons'
import { RentalStatus } from '@/types/enums'
import { RcStatusPill } from '@/components/rc'

const props = defineProps<{
  status: RentalStatus | string
}>()

interface Step {
  id: string
  label: string
  danger?: boolean
}

const ORDER = [
  RentalStatus.DRAFT,
  RentalStatus.RESERVED,
  RentalStatus.ACTIVE,
  RentalStatus.OVERDUE,
  RentalStatus.RETURN_PENDING,
  RentalStatus.CLOSED,
  RentalStatus.CANCELLED,
]

const steps = computed((): Step[] => {
  if (props.status === RentalStatus.CANCELLED) {
    return [
      { id: RentalStatus.DRAFT, label: 'Taslak' },
      { id: RentalStatus.CANCELLED, label: 'İptal', danger: true },
    ]
  }
  return [
    { id: RentalStatus.DRAFT, label: 'Taslak' },
    { id: RentalStatus.RESERVED, label: 'Rezerve' },
    { id: RentalStatus.ACTIVE, label: 'Aktif' },
    { id: RentalStatus.RETURN_PENDING, label: 'İade' },
    { id: RentalStatus.CLOSED, label: 'Kapandı' },
  ]
})

const currentIdx = computed(() => ORDER.indexOf(props.status as RentalStatus))

function stepClass(step: Step, _idx: number): Record<string, boolean> {
  const isOverdueOnActive = props.status === RentalStatus.OVERDUE && step.id === RentalStatus.ACTIVE
  const stepOrderIdx = ORDER.indexOf(step.id as RentalStatus)
  const isCurrent =
    step.id === props.status ||
    isOverdueOnActive ||
    (props.status === RentalStatus.PENDING_PAYMENT && step.id === RentalStatus.RETURN_PENDING)
  const isDone = stepOrderIdx >= 0 && stepOrderIdx < currentIdx.value && !isCurrent
  return {
    'rc-status-step--done': isDone,
    'rc-status-step--current': isCurrent,
    'rc-status-step--danger': (isCurrent && (step.danger || isOverdueOnActive)) ?? false,
  }
}

function stepDotContent(step: Step, idx: number): string {
  const stepOrderIdx = ORDER.indexOf(step.id as RentalStatus)
  const isDone = stepOrderIdx >= 0 && stepOrderIdx < currentIdx.value
  return isDone ? '✓' : String(idx + 1)
}

function stepLabel(step: Step): string {
  if (props.status === RentalStatus.OVERDUE && step.id === RentalStatus.ACTIVE) {
    return `${step.label} · Gecikmiş`
  }
  if (props.status === RentalStatus.PENDING_PAYMENT && step.id === RentalStatus.RETURN_PENDING) {
    return `${step.label} · Ödeme`
  }
  return step.label
}
</script>

<template>
  <div class="rc-status-rail rcr-status-rail">
    <template v-for="(step, idx) in steps" :key="step.id">
      <div class="rc-status-step" :class="stepClass(step, idx)">
        <div class="rc-status-step__dot">{{ stepDotContent(step, idx) }}</div>
        {{ stepLabel(step) }}
      </div>
      <RcIcon
        v-if="idx < steps.length - 1"
        name="chevronRight"
        :size="14"
        class="rc-status-step__chev"
      />
    </template>
    <RcStatusPill :status="status" class="rcr-status-rail__pill" />
  </div>
</template>
