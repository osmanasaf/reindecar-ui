<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { rentalsApi } from '@/api'
import { RcModal, RcButton, RcBadge, RcAvatar, RcStatusPill } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { fmtTRY, formatDate } from '@/utils/format'
import { RentalStatus, RentalType } from '@/types/enums'
import type { Rental, RentalDriver, CustomerType } from '@/types'

const props = defineProps<{
  open: boolean
  rental: Rental | null
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const loading = ref(false)
const totalPaid = ref(0)
const primaryDriver = ref<RentalDriver | null>(null)

const typeLabels: Record<RentalType, string> = {
  DAILY: 'Günlük',
  WEEKLY: 'Haftalık',
  MONTHLY: 'Aylık',
  LEASING: 'Leasing',
}

const lifecycleStages = [
  { key: RentalStatus.DRAFT, label: 'Taslak' },
  { key: RentalStatus.RESERVED, label: 'Rezerve' },
  { key: RentalStatus.ACTIVE, label: 'Aktif' },
  { key: RentalStatus.RETURN_PENDING, label: 'İade' },
  { key: RentalStatus.CLOSED, label: 'Tamamlandı' },
] as const

const customerName = computed(() => {
  if (!props.rental) return '—'
  return props.rental.customerName || props.rental.customer?.displayName || '—'
})

const vehicleLabel = computed(() => {
  if (!props.rental) return '—'
  return (
    props.rental.vehicleName ||
    (props.rental.vehicle ? `${props.rental.vehicle.brand} ${props.rental.vehicle.model}` : '—')
  )
})

const plate = computed(() => {
  if (!props.rental) return '—'
  return props.rental.vehiclePlate || props.rental.vehicle?.plateNumber || '—'
})

const customerType = computed((): CustomerType | undefined => props.rental?.customer?.customerType)

const grandTotal = computed(() => props.rental?.grandTotal ?? 0)
const balance = computed(() => Math.max(0, grandTotal.value - totalPaid.value))
const paidPct = computed(() => {
  if (!grandTotal.value) return 0
  return Math.round((totalPaid.value / grandTotal.value) * 100)
})

const isAlertStatus = computed(
  () =>
    props.rental?.status === RentalStatus.OVERDUE ||
    props.rental?.isOverdue === true,
)

const currentStageIdx = computed(() => {
  if (!props.rental) return -1
  const status = props.rental.status
  if (status === RentalStatus.OVERDUE) {
    return lifecycleStages.findIndex((s) => s.key === RentalStatus.ACTIVE)
  }
  if (status === RentalStatus.PENDING_PAYMENT) {
    return lifecycleStages.findIndex((s) => s.key === RentalStatus.RETURN_PENDING)
  }
  if (status === RentalStatus.CANCELLED) return -1
  return lifecycleStages.findIndex((s) => s.key === status)
})

const factCards = computed(() => {
  if (!props.rental) return []
  return [
    {
      label: 'Süre',
      value: `${props.rental.totalDays} gün`,
      sub: `${formatDate(props.rental.startDate)} → ${formatDate(props.rental.endDate)}`,
    },
    {
      label: 'Toplam',
      value: fmtTRY(grandTotal.value),
      sub: typeLabels[props.rental.rentalType] || props.rental.rentalType,
    },
    {
      label: 'Ödenen',
      value: fmtTRY(totalPaid.value),
      sub: `%${paidPct.value} tahsil edildi`,
      tone: paidPct.value === 100 ? 'success' : undefined,
    },
    {
      label: 'Bakiye',
      value: balance.value > 0 ? fmtTRY(balance.value) : '₺0',
      sub: balance.value > 0 ? 'tahsil bekliyor' : 'borç yok',
      tone: balance.value > 0 ? 'warn' : 'success',
    },
  ] 
})

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function stageClass(idx: number): Record<string, boolean> {
  const current = currentStageIdx.value
  const done = current >= 0 && idx < current
  const isCurrent = idx === current
  return {
    'rc-status-step--done': done,
    'rc-status-step--current': isCurrent,
    'rc-status-step--danger': isCurrent && isAlertStatus.value,
  }
}

async function loadPreviewData(id: number) {
  loading.value = true
  totalPaid.value = 0
  primaryDriver.value = null
  try {
    const [summary, drivers] = await Promise.all([
      rentalsApi.getPaymentSummary(id),
      rentalsApi.getDrivers(id),
    ])
    totalPaid.value = summary.totalPaid ?? 0
    primaryDriver.value = drivers.find((d) => d.primary) ?? drivers[0] ?? null
  } catch {
    totalPaid.value = 0
  } finally {
    loading.value = false
  }
}

function openFullDetail() {
  if (!props.rental) return
  emit('close')
  router.push(`/rentals/${props.rental.id}`)
}

function startReturn() {
  openFullDetail()
}

watch(
  () => [props.open, props.rental?.id] as const,
  ([isOpen, id]) => {
    if (isOpen && id) loadPreviewData(id)
  },
)
</script>

<template>
  <RcModal
    :open="open && !!rental"
    wide
    class="rc-rental-quick"
    @close="emit('close')"
  >
    <div v-if="rental" class="rc-rental-quick__head">
      <RcAvatar size="lg" class="rc-rental-quick__avatar">
        {{ initials(customerName) }}
      </RcAvatar>
      <div class="rc-rental-quick__identity">
        <div class="rc-rental-quick__badges">
          <span class="rc-rental-quick__rental-no">{{ rental.rentalNumber || `#${rental.id}` }}</span>
          <RcStatusPill :status="rental.status" />
          <RcBadge>{{ typeLabels[rental.rentalType] || rental.rentalType }}</RcBadge>
          <RcBadge v-if="customerType === 'COMPANY'" variant="purple">Kurumsal</RcBadge>
        </div>
        <h2 class="rc-rental-quick__title">
          {{ customerName }}
          <span class="rc-rental-quick__title-muted">· {{ vehicleLabel }}</span>
        </h2>
        <p class="rc-rental-quick__sub">
          {{ plate }}
          <span v-if="rental.branchName"> · {{ rental.branchName }}</span>
          <span v-if="rental.returnBranchName"> → {{ rental.returnBranchName }}</span>
        </p>
      </div>
      <button type="button" class="rc-modal__close" aria-label="Kapat" @click="emit('close')">
        <RcIcon name="close" />
      </button>
    </div>

    <div v-if="rental && isAlertStatus" class="rc-alert rc-alert--danger rc-rental-quick__alert">
      <RcIcon name="warning" :size="16" />
      <span>
        <strong>{{ rental.overdueDays || 1 }} gün gecikmiş.</strong>
        Müşteriyle iletişime geç ya da iade işlemini başlat.
      </span>
    </div>

    <div v-if="rental && currentStageIdx >= 0" class="rc-rental-quick__rail-wrap">
      <div class="rc-status-rail">
        <template v-for="(stage, idx) in lifecycleStages" :key="stage.key">
          <div class="rc-status-step" :class="stageClass(idx)">
            <div class="rc-status-step__dot">
              {{ idx < currentStageIdx ? '✓' : idx + 1 }}
            </div>
            {{ stage.label }}
          </div>
          <RcIcon
            v-if="idx < lifecycleStages.length - 1"
            name="chevronRight"
            :size="14"
            class="rc-status-step__chev"
          />
        </template>
      </div>
    </div>

    <div v-if="loading" class="rc-skeleton" style="height: 120px; margin: 16px 20px" />

    <div v-else-if="rental && factCards.length" class="rc-rental-quick__facts">
      <div v-for="(fact, i) in factCards" :key="i" class="rc-rental-quick__fact">
        <div class="rc-rental-quick__fact-label">{{ fact.label }}</div>
        <div
          class="rc-rental-quick__fact-value rc-num"
          :class="{
            'rc-rental-quick__fact-value--success': fact.tone === 'success',
            'rc-rental-quick__fact-value--warn': fact.tone === 'warn',
          }"
        >
          {{ fact.value }}
        </div>
        <div class="rc-rental-quick__fact-sub">{{ fact.sub }}</div>
      </div>
    </div>

    <div v-if="rental" class="rc-rental-quick__meta">
      <div class="rc-rental-quick__meta-col">
        <div class="rc-rental-quick__section-title">Sürücü</div>
        <div v-if="primaryDriver" class="rc-rental-quick__driver">
          <RcAvatar size="sm">{{ initials(primaryDriver.driverName) }}</RcAvatar>
          <div class="rc-rental-quick__driver-info">
            <div class="rc-rental-quick__driver-name">{{ primaryDriver.driverName }}</div>
            <div v-if="primaryDriver.licenseNumber" class="rc-rental-quick__driver-sub">
              {{ primaryDriver.licenseNumber }}
            </div>
          </div>
        </div>
        <div v-else class="rc-rental-quick__empty">Sürücü atanmadı</div>
      </div>
      <div class="rc-rental-quick__meta-col">
        <div class="rc-rental-quick__section-title">KM</div>
        <div class="rc-rental-quick__driver-name rc-num">
          {{ rental.startKm?.toLocaleString('tr-TR') ?? '—' }} km
          <span style="font-weight: 400; color: var(--rc-text-muted); font-size: 12px"> başlangıç</span>
        </div>
        <div v-if="rental.totalKm" class="rc-rental-quick__driver-sub">
          Toplam {{ rental.totalKm.toLocaleString('tr-TR') }} km
        </div>
      </div>
    </div>

    <div v-if="rental" class="rc-rental-quick__actions">
      <RcButton
        v-if="rental.status === RentalStatus.ACTIVE || rental.status === RentalStatus.OVERDUE"
        variant="ghost"
        size="sm"
        style="color: var(--rc-success-700)"
        @click="startReturn"
      >
        <RcIcon name="check" :size="14" />
        İade al
      </RcButton>
      <RcButton
        v-if="balance > 0"
        variant="ghost"
        size="sm"
        style="color: var(--rc-blue-700)"
        @click="openFullDetail"
      >
        <RcIcon name="cash" :size="14" />
        Tahsilat al
      </RcButton>
    </div>

    <template #footer>
      <div class="rc-rental-quick__foot">
        <RcButton variant="ghost" @click="emit('close')">Kapat</RcButton>
        <span class="rc-spacer" />
        <RcButton variant="accent" @click="openFullDetail">
          Tam detaya git
          <RcIcon name="arrowRight" :size="14" />
        </RcButton>
      </div>
    </template>
  </RcModal>
</template>
