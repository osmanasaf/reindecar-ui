<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RcSparkline, RcRevenueBars, RcFleetDonut } from '@/components/charts'
import ReturnCompleteModal from '@/components/rentals/ReturnCompleteModal.vue'
import { RcIcon } from '@/components/icons'
import {
  RcPageHeader,
  RcButton,
  RcBadge,
  RcAvatar,
  RcEmpty,
  RcTabs,
  RcKpiSkeleton,
  RcSkeleton,
  RcTableSkeleton,
  RcListSkeleton,
  RcError,
} from '@/components/rc'
import { useDashboardStats, useToast, usePermissions } from '@/composables'
import { useAuthStore } from '@/stores'
import { receivablesApi, payablesApi } from '@/api'
import { fmtTRY, formatDate } from '@/utils/format'
import type { UpcomingReturn } from '@/api'
import type { Rental, ReceivableResponse, PayableResponse } from '@/types'
import type { IconName } from '@/components/icons/iconPaths'

const REVENUE_PERIOD_OPTIONS = [
  { label: '6A', months: 6 },
  { label: '12A', months: 12 },
] as const
type RevenuePeriodMonths = (typeof REVENUE_PERIOD_OPTIONS)[number]['months']

const FLEET_COLORS = {
  available: 'var(--rc-success-500)',
  rented: 'var(--rc-blue-500)',
  reserved: 'var(--rc-purple-500)',
  maintenance: 'var(--rc-warning-500)',
  damaged: 'var(--rc-danger-500)',
} as const

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const { canViewRevenue } = usePermissions()
const {
  stats,
  revenue,
  vehicleStatus,
  upcomingReturns,
  accounting,
  loading,
  error,
  fetchAll,
  fetchRevenue,
} = useDashboardStats()

const revenuePeriod = ref<RevenuePeriodMonths>(6)
const returnsTab = ref('all')
const showReturnModal = ref(false)
const selectedRentalId = ref<number | null>(null)
const receivableRows = ref<ReceivableResponse[]>([])
const payableRows = ref<PayableResponse[]>([])
const accountingRowsLoading = ref(false)

interface KpiCard {
  id: string
  label: string
  value: string
  sub: string
  icon: IconName
  alert?: boolean
  route?: string
  spark?: number[]
  sparkColor?: string
}

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function formatCompactTRY(amount: unknown): string {
  const n = safeNum(amount)
  if (n >= 1_000_000) return `₺${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₺${Math.round(n / 1_000)}K`
  return fmtTRY(n)
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function returnWhenLabel(item: UpcomingReturn): string {
  if (item.daysUntilReturn < 0) return `${Math.abs(item.daysUntilReturn)}g`
  if (item.daysUntilReturn === 0) return 'Bugün'
  if (item.daysUntilReturn === 1) return 'Yarın'
  return `${item.daysUntilReturn}g`
}

function returnBadgeVariant(item: UpcomingReturn): 'warning' | 'danger' | 'default' {
  if (item.isOverdue) return 'danger'
  if (item.daysUntilReturn <= 1) return 'warning'
  return 'default'
}

function receivableDueLabel(row: ReceivableResponse): { text: string; variant?: 'danger' | 'default' } {
  if (row.status === 'OVERDUE') {
    const days = Math.max(0, Math.floor((Date.now() - new Date(row.dueDate).getTime()) / 86400000))
    return { text: `${days} gün geç`, variant: 'danger' }
  }
  return { text: formatDate(row.dueDate), variant: 'default' }
}

function payableDueLabel(row: PayableResponse): { text: string; variant?: 'danger' | 'warning' | 'default' } {
  if (row.status === 'OVERDUE') return { text: 'Geç', variant: 'danger' }
  const due = new Date(row.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  if (due.getTime() === today.getTime()) return { text: 'Bugün', variant: 'warning' }
  return { text: formatDate(row.dueDate), variant: 'default' }
}

const greeting = computed(() => {
  const name = authStore.userFullName?.split(' ')[0] || 'Operatör'
  const hour = new Date().getHours()
  const salutation = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'
  return `${salutation}, ${name}.`
})

const pageSubtitle = computed(() => {
  if (!stats.value) return 'Operasyonel ve finansal özet'
  const parts: string[] = []
  if (stats.value.todayReturns > 0) {
    parts.push(`Bugün ${stats.value.todayReturns} araç teslim alınacak.`)
  }
  if (stats.value.overdueRentals > 0) {
    parts.push(`${stats.value.overdueRentals} kiralama gecikmiş durumda.`)
  }
  return parts.join(' ') || 'Operasyonel ve finansal özet'
})

const kpiCards = computed<KpiCard[]>(() => {
  if (!stats.value) return []
  const s = stats.value
  const a = accounting.value
  const revValues = revenue.value?.values ?? []

  return [
    {
      id: 'active',
      label: 'Aktif kiralama',
      value: String(safeNum(s.activeRentals)),
      sub: `${safeNum(s.totalRentals)} toplam`,
      icon: 'key',
      alert: s.overdueRentals > 0,
      route: '/rentals',
      spark: revValues.length >= 2 ? revValues.slice(-8) : [60, 64, 71, 68, 74, 78, 80, 84],
      sparkColor: 'var(--rc-blue-500)',
    },
    {
      id: 'vehicles',
      label: 'Müsait araç',
      value: String(safeNum(s.availableVehicles)),
      sub: `${safeNum(s.totalVehicles)} toplam filo`,
      icon: 'car',
      route: '/vehicles',
    },
    {
      id: 'customers',
      label: 'Müşteriler',
      value: String(safeNum(s.totalCustomers)),
      sub: 'kayıtlı müşteri',
      icon: 'users',
      route: '/customers',
    },
    {
      id: 'returns',
      label: 'Bugün iade',
      value: String(safeNum(s.todayReturns)),
      sub: `${safeNum(s.tomorrowReturns)} yarın`,
      icon: 'calendar',
    },
    {
      id: 'net',
      label: 'Net pozisyon',
      value: a ? formatCompactTRY(a.netPosition) : '—',
      sub: a ? (a.netPositive ? 'Pozitif bakiye' : 'Negatif bakiye') : '—',
      icon: 'trend',
      spark: revValues.length >= 2 ? revValues.slice(-8) : undefined,
      sparkColor: a?.netPositive ? 'var(--rc-success-500)' : 'var(--rc-danger-500)',
    },
  ]
})

// Redesign (data.jsx / page-dashboard.jsx): tüm kategoriler her zaman gösterilir; 0 sayılı satırlar da legend'da kalır.
const fleetItems = computed(() => {
  if (!vehicleStatus.value) return []
  const v = vehicleStatus.value
  return [
    { key: 'available', label: 'Müsait', count: safeNum(v.available), color: FLEET_COLORS.available },
    { key: 'rented', label: 'Kirada', count: safeNum(v.rented), color: FLEET_COLORS.rented },
    { key: 'reserved', label: 'Rezerve', count: safeNum(v.reserved), color: FLEET_COLORS.reserved },
    { key: 'maintenance', label: 'Bakımda', count: safeNum(v.maintenance), color: FLEET_COLORS.maintenance },
    { key: 'damaged', label: 'Hasarlı', count: safeNum(v.damaged), color: FLEET_COLORS.damaged },
  ]
})

const hasFleetData = computed(() => safeNum(stats.value?.totalVehicles) > 0)

const fleetHint = computed(() => {
  if (!vehicleStatus.value) return ''
  const m = safeNum(vehicleStatus.value.maintenance)
  const d = safeNum(vehicleStatus.value.damaged)
  if (!m && !d) return 'Filo operasyonel durumda.'
  const parts: string[] = []
  if (m) parts.push(`${m} araç bakımda`)
  if (d) parts.push(`${d} araç hasar onarımında`)
  return parts.join(', ') + '.'
})

const sortedReturns = computed<UpcomingReturn[]>(() =>
  [...(upcomingReturns.value ?? [])].sort((a, b) => a.daysUntilReturn - b.daysUntilReturn),
)

const filteredReturns = computed(() => {
  if (returnsTab.value === 'today') {
    return sortedReturns.value.filter((r) => r.daysUntilReturn === 0)
  }
  if (returnsTab.value === 'overdue') {
    return sortedReturns.value.filter((r) => r.isOverdue)
  }
  return sortedReturns.value
})

const returnsTabOptions = computed(() => [
  { id: 'all', label: 'Hepsi', count: sortedReturns.value.length },
  { id: 'today', label: 'Bugün', count: sortedReturns.value.filter((r) => r.daysUntilReturn === 0).length },
  { id: 'overdue', label: 'Gecikmiş', count: sortedReturns.value.filter((r) => r.isOverdue).length },
])

const activityItems = computed(() =>
  sortedReturns.value.slice(0, 6).map((r) => ({
    when: returnWhenLabel(r),
    text: `${r.plateNumber} iadesi — ${r.customerName}`,
    actor: r.rentalNumber,
  })),
)

async function fetchAccountingRows(): Promise<void> {
  accountingRowsLoading.value = true
  try {
    const [rec, pay] = await Promise.all([
      receivablesApi.getOutstanding({ size: 4, page: 0 }),
      payablesApi.getOutstanding({ size: 4, page: 0 }),
    ])
    receivableRows.value = rec.content ?? []
    payableRows.value = pay.content ?? []
  } catch {
    receivableRows.value = []
    payableRows.value = []
  } finally {
    accountingRowsLoading.value = false
  }
}

function openReturnModal(rentalId: number): void {
  selectedRentalId.value = rentalId
  showReturnModal.value = true
}

function handleReturnCompleted(rental: Rental): void {
  toast.success(`Kiralama #${rental.rentalNumber} tamamlandı`)
  fetchAll(revenuePeriod.value)
  fetchAccountingRows()
}

function go(route?: string): void {
  if (route) router.push(route)
}

watch(revenuePeriod, (months) => fetchRevenue(months))

onMounted(async () => {
  await fetchAll(revenuePeriod.value)
  fetchAccountingRows()
})
</script>

<template>
  <div class="rc-page">
    <RcPageHeader :title="greeting" :subtitle="pageSubtitle">
      <template #actions>
        <RcButton variant="secondary" :disabled="loading" @click="fetchAll(revenuePeriod)">
          <RcIcon name="sparkle" :size="16" />
          {{ loading ? 'Yükleniyor…' : 'Yenile' }}
        </RcButton>
        <RcButton variant="accent" @click="go('/rentals/create')">
          <RcIcon name="plus" :size="16" />
          Kiralama oluştur
        </RcButton>
      </template>
    </RcPageHeader>

    <RcError
      v-if="error"
      :message="error"
      @retry="fetchAll(revenuePeriod)"
    />

    <!-- KPI -->
    <RcKpiSkeleton v-if="loading && !stats" :count="5" />
    <div v-else class="rc-kpi-grid">
      <div
        v-for="card in kpiCards"
        :key="card.id"
        class="rc-kpi"
        :class="{ 'rc-kpi--link': !!card.route }"
        @click="go(card.route)"
      >
        <div class="rc-kpi__label">
          <RcIcon :name="card.icon" :size="14" />
          {{ card.label }}
        </div>
        <div class="rc-kpi__value">{{ card.value }}</div>
        <div class="rc-kpi__sub">
          <span>{{ card.sub }}</span>
          <span
            v-if="card.id === 'active' && stats?.overdueRentals"
            class="rc-kpi__delta rc-kpi__delta--down"
          >
            {{ stats.overdueRentals }} gecikmiş
          </span>
        </div>
        <div v-if="card.spark?.length" class="rc-kpi__spark">
          <RcSparkline :data="card.spark" :color="card.sparkColor" />
        </div>
        <span v-if="card.alert" class="rc-kpi__alert-dot" aria-label="Dikkat gerektiren kayıt" />
      </div>
    </div>

    <!-- Revenue + Fleet -->
    <div class="rc-two">
      <div v-if="canViewRevenue" class="rc-card">
        <div class="rc-card__head">
          <div>
            <div class="rc-card__title">Aylık ciro</div>
            <div style="font-size: 12px; color: var(--rc-text-muted); margin-top: 2px">
              Son {{ revenuePeriod }} ay
            </div>
          </div>
          <div class="rc-tabs">
            <button
              v-for="opt in REVENUE_PERIOD_OPTIONS"
              :key="opt.months"
              type="button"
              class="rc-tab"
              :class="{ 'rc-tab--active': revenuePeriod === opt.months }"
              @click="revenuePeriod = opt.months"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="rc-card__body" style="padding-top: 8px">
          <RcSkeleton v-if="loading" height="220px" radius="lg" />
          <template v-else-if="revenue?.values.length">
            <div class="rc-dashboard-revenue-head">
              <span class="rc-dashboard-revenue-total">{{ formatCompactTRY(revenue.total) }}</span>
              <RcBadge variant="success" dot>Toplam dönem</RcBadge>
              <span class="rc-dashboard-revenue-meta">{{ revenuePeriod }} aylık ciro</span>
            </div>
            <RcRevenueBars :data="[...revenue.values]" :labels="[...revenue.labels]" />
          </template>
          <RcEmpty v-else title="Ciro verisi yok" description="Seçilen dönemde kayıt bulunamadı." />
        </div>
      </div>

      <div class="rc-card">
        <div class="rc-card__head">
          <div class="rc-card__title">Filo durumu</div>
          <RcButton variant="ghost" size="sm" @click="go('/vehicles')">
            Detay
            <RcIcon name="arrowRight" :size="14" />
          </RcButton>
        </div>
        <div class="rc-card__body">
          <RcSkeleton v-if="loading" height="220px" radius="lg" />
          <template v-else-if="hasFleetData">
            <RcFleetDonut :items="fleetItems" />
            <hr class="rc-hr">
            <div style="display: flex; gap: 8px; font-size: 12px; color: var(--rc-text-muted)">
              <RcIcon name="info" :size="14" style="margin-top: 2px; flex-shrink: 0" />
              <span>{{ fleetHint }}</span>
            </div>
          </template>
          <RcEmpty v-else title="Araç verisi yok" description="Henüz filoya kayıtlı araç bulunmuyor." />
        </div>
      </div>
    </div>

    <!-- Returns + Activity -->
    <div class="rc-two">
      <div class="rc-card">
        <div class="rc-card__head">
          <div>
            <div class="rc-card__title">Yaklaşan iadeler</div>
            <div style="font-size: 12px; color: var(--rc-text-muted); margin-top: 2px">Sonraki 7 gün</div>
          </div>
          <RcTabs v-model="returnsTab" :tabs="returnsTabOptions" />
        </div>
        <div v-if="loading" style="margin: 16px">
          <RcTableSkeleton :rows="5" :cols="4" />
        </div>
        <RcEmpty
          v-else-if="!filteredReturns.length"
          title="Yaklaşan iade yok"
          description="Seçilen filtreye uygun kayıt bulunamadı."
        />
        <table v-else class="rc-table">
          <thead>
            <tr>
              <th>Müşteri</th>
              <th>Plaka · Araç</th>
              <th>Zaman</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredReturns" :key="item.rentalId">
              <td>
                <div style="display: flex; align-items: center; gap: 8px">
                  <RcAvatar size="sm">{{ initials(item.customerName) }}</RcAvatar>
                  <div style="display: flex; flex-direction: column; line-height: 1.2">
                    <span style="font-weight: 500">{{ item.customerName }}</span>
                    <small style="color: var(--rc-text-muted); font-family: var(--rc-font-mono); font-size: 11px">
                      {{ item.rentalNumber }}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <div style="display: flex; flex-direction: column; line-height: 1.2">
                  <span style="font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.02em">
                    {{ item.plateNumber }}
                  </span>
                  <small v-if="item.primaryDriverName" style="color: var(--rc-text-muted)">
                    {{ item.primaryDriverName }}
                  </small>
                </div>
              </td>
              <td>
                <RcBadge :variant="returnBadgeVariant(item)" dot>
                  {{ returnWhenLabel(item) }}
                </RcBadge>
              </td>
              <td class="rc-right">
                <RcButton variant="ghost" size="sm" @click="openReturnModal(item.rentalId)">
                  İade al
                  <RcIcon name="arrowRight" :size="14" />
                </RcButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="rc-card">
        <div class="rc-card__head">
          <div class="rc-card__title">Etkinlik akışı</div>
        </div>
        <RcListSkeleton v-if="loading" :rows="5" :show-avatar="false" />
        <RcEmpty v-else-if="!activityItems.length" title="Henüz etkinlik yok" />
        <div v-else>
          <div v-for="(item, i) in activityItems" :key="i" class="rc-activity">
            <span class="rc-activity__when">{{ item.when }}</span>
            <span class="rc-activity__body">
              {{ item.text }}
              <span class="rc-activity__actor">· {{ item.actor }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Receivables + Payables -->
    <div class="rc-two">
      <div class="rc-card">
        <div class="rc-card__head">
          <div class="rc-card__title">Alacaklar (özet)</div>
          <RcButton variant="ghost" size="sm" @click="go('/accounting/finance')">
            Tümü
            <RcIcon name="arrowRight" :size="14" />
          </RcButton>
        </div>
        <div v-if="accountingRowsLoading" style="margin: 16px">
          <RcTableSkeleton :rows="4" :cols="4" />
        </div>
        <RcEmpty v-else-if="!receivableRows.length" title="Açık alacak yok" />
        <table v-else class="rc-table">
          <thead>
            <tr>
              <th>Müşteri</th>
              <th>Tip</th>
              <th>Vade</th>
              <th class="rc-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in receivableRows" :key="row.id">
              <td><span style="font-weight: 500">{{ row.customerName || row.description }}</span></td>
              <td><span style="color: var(--rc-text-muted)">{{ row.type }}</span></td>
              <td>
                <RcBadge
                  v-if="receivableDueLabel(row).variant === 'danger'"
                  variant="danger"
                >
                  {{ receivableDueLabel(row).text }}
                </RcBadge>
                <span
                  v-else
                  style="color: var(--rc-text-muted); font-family: var(--rc-font-mono); font-size: 12px"
                >
                  {{ receivableDueLabel(row).text }}
                </span>
              </td>
              <td class="rc-right rc-num" style="font-weight: 500">{{ fmtTRY(row.remainingAmount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="rc-card">
        <div class="rc-card__head">
          <div class="rc-card__title">Verecekler (özet)</div>
          <RcButton variant="ghost" size="sm" @click="go('/accounting/payables')">
            Tümü
            <RcIcon name="arrowRight" :size="14" />
          </RcButton>
        </div>
        <div v-if="accountingRowsLoading" style="margin: 16px">
          <RcTableSkeleton :rows="4" :cols="3" />
        </div>
        <RcEmpty v-else-if="!payableRows.length" title="Açık verecek yok" />
        <table v-else class="rc-table">
          <thead>
            <tr>
              <th>Tedarikçi</th>
              <th>Vade</th>
              <th class="rc-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in payableRows" :key="row.id">
              <td><span style="font-weight: 500">{{ row.serviceProviderName || row.description }}</span></td>
              <td>
                <RcBadge
                  v-if="payableDueLabel(row).variant"
                  :variant="payableDueLabel(row).variant!"
                >
                  {{ payableDueLabel(row).text }}
                </RcBadge>
                <span
                  v-else
                  style="color: var(--rc-text-muted); font-family: var(--rc-font-mono); font-size: 12px"
                >
                  {{ payableDueLabel(row).text }}
                </span>
              </td>
              <td class="rc-right rc-num" style="font-weight: 500">{{ fmtTRY(row.remainingAmount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ReturnCompleteModal
      :visible="showReturnModal"
      :rental-id="selectedRentalId"
      @close="showReturnModal = false"
      @completed="handleReturnCompleted"
    />
  </div>
</template>

<style scoped>
.rc-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
