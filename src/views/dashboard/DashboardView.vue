<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { LineChart } from '@/components/charts'
import ReturnCompleteModal from '@/components/rentals/ReturnCompleteModal.vue'
import { useDashboardStats, useToast } from '@/composables'
import type { UpcomingReturn } from '@/api'
import type { Rental } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const REVENUE_PERIOD_OPTIONS = [
    { label: '6 Ay', months: 6 },
    { label: '12 Ay', months: 12 },
] as const
type RevenuePeriodMonths = typeof REVENUE_PERIOD_OPTIONS[number]['months']

const VEHICLE_STATUS_CONFIG = [
    { key: 'available',   label: 'Müsait',   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { key: 'rented',      label: 'Kirada',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { key: 'reserved',    label: 'Rezerve',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { key: 'maintenance', label: 'Bakımda',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { key: 'damaged',     label: 'Hasarlı',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
] as const

const VEHICLE_TABLE_TABS = ['Kirada', 'Bakım & Hasar'] as const
type VehicleTab = typeof VEHICLE_TABLE_TABS[number]

// ─── Composables ──────────────────────────────────────────────────────────────

const router = useRouter()
const toast = useToast()
const {
    stats,
    revenue,
    vehicleStatus,
    upcomingReturns,
    accounting,
    activeRentals,
    loading,
    error,
    fetchAll,
    fetchRevenue,
} = useDashboardStats()

// ─── State ────────────────────────────────────────────────────────────────────

const revenuePeriod  = ref<RevenuePeriodMonths>(6)
const vehicleTab     = ref<VehicleTab>('Kirada')
const showReturnModal = ref(false)
const selectedRentalId = ref<number | null>(null)

// ─── Utilities ────────────────────────────────────────────────────────────────

function safeNum(v: unknown, fallback = 0): number {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
}

function formatCurrency(amount: unknown): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
    }).format(safeNum(amount))
}

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-')
    return year && month && day ? `${day}.${month}.${year}` : dateStr
}

function netPositionLabel(netPositive: boolean): string {
    return netPositive ? 'Pozitif bakiye' : 'Negatif bakiye'
}

function formatReturnBadge(item: UpcomingReturn): { text: string; cls: string } {
    if (item.daysUntilReturn < 0)  return { text: `${Math.abs(item.daysUntilReturn)} gün gecikti`, cls: 'badge-danger' }
    if (item.daysUntilReturn === 0) return { text: 'Bugün',  cls: 'badge-warning' }
    if (item.daysUntilReturn === 1) return { text: 'Yarın',  cls: 'badge-warning' }
    return { text: `${item.daysUntilReturn} gün`, cls: 'badge-neutral' }
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────

interface StatCard {
    id: string
    label: string
    value: string
    sub: string
    icon: string
    color: string
    alert?: string
    route?: string
}

const statCards = computed<StatCard[]>(() => {
    if (!stats.value) return []
    const s = stats.value
    const a = accounting.value

    return [
        {
            id: 'active',
            label: 'Aktif Kiralama',
            value: String(safeNum(s.activeRentals)),
            sub: `${safeNum(s.totalRentals)} toplam`,
            icon: '🔑',
            color: '#3b82f6',
            alert: s.overdueRentals > 0 ? `${s.overdueRentals} gecikmiş` : undefined,
            route: '/rentals',
        },
        {
            id: 'vehicles',
            label: 'Müsait Araç',
            value: String(safeNum(s.availableVehicles)),
            sub: `${safeNum(s.totalVehicles)} toplam araç`,
            icon: '🚗',
            color: '#10b981',
            route: '/vehicles',
        },
        {
            id: 'customers',
            label: 'Müşteriler',
            value: String(safeNum(s.totalCustomers)),
            sub: 'kayıtlı müşteri',
            icon: '👥',
            color: '#06b6d4',
            route: '/customers',
        },
        {
            id: 'returns',
            label: 'Bugün İade',
            value: String(safeNum(s.todayReturns)),
            sub: `${safeNum(s.tomorrowReturns)} yarın`,
            icon: '📅',
            color: '#f59e0b',
        },
        {
            id: 'net',
            label: 'Net Pozisyon',
            value: a ? formatCurrency(a.netPosition) : '—',
            sub: a ? netPositionLabel(a.netPositive) : 'Yükleniyor...',
            icon: '📊',
            color: a?.netPositive ? '#10b981' : '#ef4444',
        },
    ]
})

// ─── Revenue Chart ────────────────────────────────────────────────────────────

const revenueChartData = computed(() => ({
    labels: revenue.value?.labels ?? [],
    datasets: [{
        label: 'Ciro (₺)',
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderColor: '#3b82f6',
        borderWidth: 2.5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#3b82f6',
        pointBorderWidth: 2,
        pointRadius: 5,
        data: revenue.value?.values ?? [],
        tension: 0.4,
        fill: true,
    }],
}))

const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
                callback: (v: unknown) =>
                    new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(Number(v)) + ' ₺',
            },
        },
        x: { grid: { display: false } },
    },
}

// ─── Vehicle Status ───────────────────────────────────────────────────────────

const vehicleStatusCounts = computed(() => {
    if (!vehicleStatus.value) return {}
    return {
        available:   safeNum(vehicleStatus.value.available),
        rented:      safeNum(vehicleStatus.value.rented),
        reserved:    safeNum(vehicleStatus.value.reserved),
        maintenance: safeNum(vehicleStatus.value.maintenance),
        damaged:     safeNum(vehicleStatus.value.damaged),
    }
})

const totalVehiclesFromStatus = computed(() =>
    Object.values(vehicleStatusCounts.value).reduce((a, b) => a + b, 0)
)

// ─── Active Rentals Table ─────────────────────────────────────────────────────

const rentedVehicles = computed<Rental[]>(() =>
    (activeRentals.value ?? []).filter(r => !r.isOverdue)
)

const overdueVehicles = computed<Rental[]>(() =>
    (activeRentals.value ?? []).filter(r => r.isOverdue)
)

const maintenanceDamagedRentals = computed<Rental[]>(() => {
    // Bu tab için gerçek bakım/hasar araçları vehicle status'tan gelir
    // Aktif kiralama listesinde bu durum yoktur; placeholder olarak boş
    return []
})

const vehicleTabCount = computed(() => ({
    'Kirada': rentedVehicles.value.length + overdueVehicles.value.length,
    'Bakım & Hasar': safeNum(vehicleStatusCounts.value.maintenance) + safeNum(vehicleStatusCounts.value.damaged),
}))

// ─── Upcoming Returns ─────────────────────────────────────────────────────────

const sortedReturns = computed<UpcomingReturn[]>(() =>
    [...(upcomingReturns.value ?? [])].sort((a, b) => a.daysUntilReturn - b.daysUntilReturn)
)

// ─── Accounting ───────────────────────────────────────────────────────────────

const receivableCollectionRate = computed(() => {
    if (!accounting.value) return 0
    const { totalReceivable, remainingReceivable } = accounting.value
    if (totalReceivable === 0) return 0
    if (remainingReceivable > 0 && remainingReceivable < totalReceivable) {
        const rate = ((totalReceivable - remainingReceivable) / totalReceivable) * 100
        const floored = Math.floor(rate * 10) / 10
        return Math.min(99.9, Math.max(0, floored))
    }
    if (remainingReceivable <= 0) return 100
    return 0
})

// ─── Actions ──────────────────────────────────────────────────────────────────

function openReturnModal(rentalId: number): void {
    selectedRentalId.value = rentalId
    showReturnModal.value = true
}

function handleReturnCompleted(rental: Rental): void {
    toast.success(`Kiralama #${rental.rentalNumber} tamamlandı`)
    fetchAll(revenuePeriod.value)
}

function go(route?: string): void {
    if (route) router.push(route)
}

// ─── Watchers & Lifecycle ─────────────────────────────────────────────────────

watch(revenuePeriod, (months) => fetchRevenue(months))

onMounted(() => fetchAll(revenuePeriod.value))
</script>

<template>
    <div class="dashboard">

        <!-- ── Header ─────────────────────────────────────────────────────── -->
        <header class="db-header">
            <div>
                <h1 class="db-title">Dashboard</h1>
                <p class="db-sub">Operasyonel ve finansal özet</p>
            </div>
            <div class="db-header-actions">
                <button class="btn-refresh" :disabled="loading" @click="fetchAll(revenuePeriod)">
                    <span :class="{ 'spin': loading }">↻</span>
                    {{ loading ? 'Yükleniyor...' : 'Yenile' }}
                </button>
                <button class="btn-primary" @click="go('/rentals/create')">+ Yeni Kiralama</button>
            </div>
        </header>

        <!-- ── Error Banner ───────────────────────────────────────────────── -->
        <div v-if="error" class="error-banner">
            <span>⚠ {{ error }}</span>
            <button class="btn-retry" @click="fetchAll(revenuePeriod)">Tekrar Dene</button>
        </div>

        <!-- ── Stat Cards ─────────────────────────────────────────────────── -->
        <section class="stat-row">
            <template v-if="loading">
                <div v-for="i in 5" :key="i" class="stat-card skel" />
            </template>
            <template v-else>
                <div
                    v-for="card in statCards"
                    :key="card.id"
                    class="stat-card"
                    :class="{ 'is-link': !!card.route }"
                    :style="{ '--accent': card.color }"
                    @click="go(card.route)"
                >
                    <div class="sc-left">
                        <span class="sc-label">{{ card.label }}</span>
                        <span class="sc-value">{{ card.value }}</span>
                        <span class="sc-sub">{{ card.sub }}</span>
                        <span v-if="card.alert" class="sc-alert">{{ card.alert }}</span>
                    </div>
                    <div class="sc-icon">{{ card.icon }}</div>
                </div>
            </template>
        </section>

        <!-- ── Charts Row ─────────────────────────────────────────────────── -->
        <section class="charts-row">

            <!-- Revenue -->
            <div class="card revenue-card">
                <div class="card-head">
                    <h2 class="card-title">Gelir Analizi</h2>
                    <div class="seg-ctrl">
                        <button
                            v-for="opt in REVENUE_PERIOD_OPTIONS"
                            :key="opt.months"
                            :class="['seg-btn', { active: revenuePeriod === opt.months }]"
                            @click="revenuePeriod = opt.months"
                        >{{ opt.label }}</button>
                    </div>
                </div>
                <div class="chart-area">
                    <div v-if="loading" class="skel-chart" />
                    <LineChart v-else :data="revenueChartData" :options="revenueChartOptions" />
                </div>
                <div v-if="!loading && revenue" class="card-foot">
                    <span>{{ revenuePeriod }} aylık toplam</span>
                    <strong>{{ formatCurrency(revenue.total) }}</strong>
                </div>
            </div>

            <!-- Vehicle Status -->
            <div class="card status-card">
                <div class="card-head">
                    <h2 class="card-title">Araç Durumu</h2>
                    <span class="badge-neutral">{{ totalVehiclesFromStatus }} araç</span>
                </div>

                <div v-if="loading" class="status-skel">
                    <div v-for="i in 5" :key="i" class="skel-row" />
                </div>
                <div v-else class="status-list">
                    <div
                        v-for="cfg in VEHICLE_STATUS_CONFIG"
                        :key="cfg.key"
                        class="status-item"
                    >
                        <div class="si-left">
                            <span class="si-dot" :style="{ background: cfg.color }" />
                            <span class="si-label">{{ cfg.label }}</span>
                        </div>
                        <div class="si-right">
                            <div
                                class="si-bar-wrap"
                                :title="`${vehicleStatusCounts[cfg.key as keyof typeof vehicleStatusCounts] ?? 0} araç`"
                            >
                                <div
                                    class="si-bar"
                                    :style="{
                                        width: totalVehiclesFromStatus
                                            ? `${((vehicleStatusCounts[cfg.key as keyof typeof vehicleStatusCounts] ?? 0) / totalVehiclesFromStatus) * 100}%`
                                            : '0%',
                                        background: cfg.color,
                                    }"
                                />
                            </div>
                            <span class="si-count" :style="{ color: cfg.color }">
                                {{ vehicleStatusCounts[cfg.key as keyof typeof vehicleStatusCounts] ?? 0 }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

        </section>

        <!-- ── Vehicle Detail Table ───────────────────────────────────────── -->
        <section class="card">
            <div class="card-head">
                <h2 class="card-title">Araç Detayı</h2>
                <div class="tab-bar">
                    <button
                        v-for="tab in VEHICLE_TABLE_TABS"
                        :key="tab"
                        :class="['tab-btn', { active: vehicleTab === tab }]"
                        @click="vehicleTab = tab"
                    >
                        {{ tab }}
                        <span class="tab-count">{{ vehicleTabCount[tab] }}</span>
                    </button>
                </div>
            </div>

            <!-- Kirada Tab -->
            <template v-if="vehicleTab === 'Kirada'">
                <div v-if="loading" class="tbl-skel">
                    <div v-for="i in 4" :key="i" class="skel-row" />
                </div>
                <div v-else-if="activeRentals.length === 0" class="empty-state">
                    Şu an kirada araç bulunmuyor.
                </div>
                <div v-else class="tbl-wrap">
                    <table class="dtbl">
                        <thead>
                            <tr>
                                <th>Plaka</th>
                                <th>Araç</th>
                                <th>Müşteri</th>
                                <th>Başlangıç</th>
                                <th>İade</th>
                                <th>Durum</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="r in activeRentals"
                                :key="r.id"
                                :class="{ 'row-overdue': r.isOverdue }"
                            >
                                <td class="td-mono">{{ r.vehiclePlate ?? '—' }}</td>
                                <td>{{ r.vehicleName ?? '—' }}</td>
                                <td>
                                    <div class="person-cell">
                                        <span>{{ r.customerName ?? '—' }}</span>
                                    </div>
                                </td>
                                <td class="td-date">{{ formatDate(r.startDate) }}</td>
                                <td class="td-date">{{ formatDate(r.endDate) }}</td>
                                <td>
                                    <span v-if="r.isOverdue" class="badge-danger">
                                        {{ r.overdueDays }}g gecikti
                                    </span>
                                    <span v-else class="badge-success">Aktif</span>
                                </td>
                                <td>
                                    <button class="btn-sm" @click="openReturnModal(r.id)">İade Al</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>

            <!-- Bakım & Hasar Tab -->
            <template v-else>
                <div class="bh-grid">
                    <div class="bh-block">
                        <div class="bh-head">
                            <span class="bh-dot" style="background:#f59e0b" />
                            <span>Bakımda</span>
                            <strong>{{ vehicleStatusCounts.maintenance ?? 0 }}</strong>
                        </div>
                        <p class="bh-hint">
                            Bakımdaki araçların detayı için
                            <router-link to="/vehicles" class="link">Araçlar</router-link>
                            sayfasını ziyaret edin.
                        </p>
                    </div>
                    <div class="bh-divider" />
                    <div class="bh-block">
                        <div class="bh-head">
                            <span class="bh-dot" style="background:#ef4444" />
                            <span>Hasarlı</span>
                            <strong>{{ vehicleStatusCounts.damaged ?? 0 }}</strong>
                        </div>
                        <p class="bh-hint">
                            Hasarlı araçların detayı için
                            <router-link to="/vehicles" class="link">Araçlar</router-link>
                            sayfasını ziyaret edin.
                        </p>
                    </div>
                </div>
            </template>
        </section>

        <!-- ── Accounting Summary ─────────────────────────────────────────── -->
        <section class="card">
            <div class="card-head">
                <h2 class="card-title">Muhasebe Özeti</h2>
                <div class="card-head-actions">
                    <router-link to="/accounting/receivables" class="link-btn">Alacaklar →</router-link>
                    <router-link to="/accounting/payables" class="link-btn">Verecekler →</router-link>
                </div>
            </div>

            <div v-if="loading" class="acc-skel">
                <div v-for="i in 3" :key="i" class="skel-row" style="height:80px" />
            </div>

            <template v-else-if="accounting">
                <!-- Overdue alert -->
                <div
                    v-if="accounting.overdueReceivableCount > 0 || accounting.overduePayableCount > 0"
                    class="acc-alert-bar"
                >
                    <span v-if="accounting.overdueReceivableCount > 0">
                        ⚠ {{ accounting.overdueReceivableCount }} vadesi geçmiş alacak —
                        <strong>{{ formatCurrency(accounting.overdueReceivableAmount) }}</strong>
                    </span>
                    <span v-if="accounting.overduePayableCount > 0" style="margin-left:16px">
                        ⚠ {{ accounting.overduePayableCount }} vadesi geçmiş verecek —
                        <strong>{{ formatCurrency(accounting.overduePayableAmount) }}</strong>
                    </span>
                </div>

                <div class="acc-grid">

                    <!-- Alacaklar -->
                    <div class="acc-block">
                        <p class="acc-block-label" style="color:#10b981">Alacaklar</p>
                        <div class="acc-big">{{ formatCurrency(accounting.totalReceivable) }}</div>
                        <div class="acc-progress-wrap">
                            <div
                                class="acc-progress"
                                :style="{ width: `${receivableCollectionRate}%`, background: '#10b981' }"
                            />
                        </div>
                        <p class="acc-rate">%{{ receivableCollectionRate }} tahsil edildi</p>
                        <div class="acc-rows">
                            <div class="acc-row">
                                <span>Tahsil Edilen</span>
                                <strong class="text-success">{{ formatCurrency(accounting.paidReceivable) }}</strong>
                            </div>
                            <div class="acc-row">
                                <span>Bekleyen</span>
                                <strong>{{ formatCurrency(accounting.remainingReceivable) }}</strong>
                            </div>
                            <div v-if="accounting.overdueReceivableCount > 0" class="acc-row">
                                <span>Vadesi Geçmiş</span>
                                <strong class="text-danger">
                                    {{ formatCurrency(accounting.overdueReceivableAmount) }}
                                    <em>({{ accounting.overdueReceivableCount }} kayıt)</em>
                                </strong>
                            </div>
                        </div>
                    </div>

                    <!-- Net Pozisyon -->
                    <div class="acc-net">
                        <p class="acc-net-label">Net Pozisyon</p>
                        <div
                            class="acc-net-value"
                            :class="accounting.netPositive ? 'text-success' : 'text-danger'"
                        >
                            {{ formatCurrency(accounting.netPosition) }}
                        </div>
                        <p class="acc-net-sub">
                            {{ accounting.netPositive ? '✓ Alacaklar fazla' : '✗ Verecekler fazla' }}
                        </p>
                        <div class="acc-net-badges">
                            <div class="acc-net-badge acc-net-badge--green">
                                <span class="acc-net-badge-label">Alacak</span>
                                <span class="acc-net-badge-val">{{ formatCurrency(accounting.remainingReceivable) }}</span>
                            </div>
                            <div class="acc-net-badge acc-net-badge--red">
                                <span class="acc-net-badge-label">Verecek</span>
                                <span class="acc-net-badge-val">{{ formatCurrency(accounting.remainingPayable) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Verecekler -->
                    <div class="acc-block">
                        <p class="acc-block-label" style="color:#ef4444">Verecekler</p>
                        <div class="acc-big">{{ formatCurrency(accounting.totalPayable) }}</div>
                        <div class="acc-progress-wrap">
                            <div
                                class="acc-progress"
                                :style="{
                                    width: accounting.totalPayable
                                        ? `${Math.round((accounting.paidPayable / accounting.totalPayable) * 100)}%`
                                        : '0%',
                                    background: '#ef4444',
                                }"
                            />
                        </div>
                        <p class="acc-rate">
                            %{{
                                accounting.totalPayable
                                    ? Math.round((accounting.paidPayable / accounting.totalPayable) * 100)
                                    : 0
                            }} ödendi
                        </p>
                        <div class="acc-rows">
                            <div class="acc-row">
                                <span>Ödenen</span>
                                <strong class="text-success">{{ formatCurrency(accounting.paidPayable) }}</strong>
                            </div>
                            <div class="acc-row">
                                <span>Bekleyen</span>
                                <strong>{{ formatCurrency(accounting.remainingPayable) }}</strong>
                            </div>
                            <div v-if="accounting.overduePayableCount > 0" class="acc-row">
                                <span>Vadesi Geçmiş</span>
                                <strong class="text-danger">
                                    {{ formatCurrency(accounting.overduePayableAmount) }}
                                    <em>({{ accounting.overduePayableCount }} kayıt)</em>
                                </strong>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Tüm değerler sıfırsa bilgi mesajı -->
                <div
                    v-if="accounting.totalReceivable === 0 && accounting.totalPayable === 0"
                    class="acc-empty"
                >
                    Henüz muhasebe kaydı bulunmuyor. Kiralama oluşturulduğunda alacaklar burada görünecek.
                </div>
            </template>

            <div v-else class="empty-state">
                Muhasebe verileri yüklenemedi.
            </div>
        </section>

        <!-- ── Upcoming Returns ───────────────────────────────────────────── -->
        <section class="card">
            <div class="card-head">
                <h2 class="card-title">Yaklaşan İadeler</h2>
                <span class="badge-neutral">{{ sortedReturns.length }} kayıt</span>
            </div>

            <div v-if="loading" class="tbl-skel">
                <div v-for="i in 3" :key="i" class="skel-row" />
            </div>
            <div v-else-if="sortedReturns.length === 0" class="empty-state">
                Yaklaşan iade bulunmuyor.
            </div>
            <div v-else class="tbl-wrap">
                <table class="dtbl">
                    <thead>
                        <tr>
                            <th>Plaka</th>
                            <th>Müşteri / Sürücü</th>
                            <th>İade Tarihi</th>
                            <th>Kalan</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in sortedReturns"
                            :key="item.rentalId"
                            :class="{ 'row-overdue': item.isOverdue }"
                        >
                            <td class="td-mono">{{ item.plateNumber }}</td>
                            <td>
                                <div class="person-cell">
                                    <span>{{ item.customerName }}</span>
                                    <small v-if="item.primaryDriverName" class="text-muted">
                                        Sürücü: {{ item.primaryDriverName }}
                                    </small>
                                </div>
                            </td>
                            <td class="td-date">{{ formatDate(item.endDate) }}</td>
                            <td>
                                <span :class="formatReturnBadge(item).cls">
                                    {{ formatReturnBadge(item).text }}
                                </span>
                            </td>
                            <td>
                                <button class="btn-sm" @click="openReturnModal(item.rentalId)">
                                    İade Al
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- ── Return Modal ───────────────────────────────────────────────── -->
        <ReturnCompleteModal
            :visible="showReturnModal"
            :rental-id="selectedRentalId"
            @close="showReturnModal = false"
            @completed="handleReturnCompleted"
        />

    </div>
</template>

<style scoped>
/* ─── Layout ──────────────────────────────────────────────────────────────── */
.dashboard {
    max-width: 1440px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-bottom: 40px;
}

/* ─── Header ──────────────────────────────────────────────────────────────── */
.db-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.db-header-actions {
    display: flex;
    gap: 10px;
    align-items: center;
}

.db-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    color: var(--color-heading);
}

.db-sub {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin: 2px 0 0;
}

.btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all 0.15s;
}

.btn-refresh:hover:not(:disabled) {
    background: var(--color-bg-secondary);
    color: var(--color-text);
}

.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

.spin { display: inline-block; animation: spin 1s linear infinite; }

.error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    color: #dc2626;
    font-size: 14px;
}

.btn-retry {
    padding: 6px 14px;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
}

.btn-retry:hover { background: #b91c1c; }

/* ─── Stat Cards ──────────────────────────────────────────────────────────── */
.stat-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 14px;
}

.stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-top: 3px solid var(--accent, #3b82f6);
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    transition: transform 0.15s, box-shadow 0.15s;
    min-height: 100px;
}

.stat-card.is-link {
    cursor: pointer;
}

.stat-card.is-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.stat-card.skel {
    background: var(--color-bg-secondary);
    border-top-color: var(--color-border);
    animation: shimmer 1.4s infinite;
}

.sc-left {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
}

.sc-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.sc-value {
    font-size: 30px;
    font-weight: 700;
    color: var(--color-heading);
    line-height: 1.1;
}

.sc-sub {
    font-size: 12px;
    color: var(--color-text-muted);
}

.sc-alert {
    display: inline-block;
    margin-top: 4px;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    width: fit-content;
}

.sc-icon {
    font-size: 26px;
    opacity: 0.75;
    flex-shrink: 0;
    margin-left: 10px;
}

/* ─── Card Base ───────────────────────────────────────────────────────────── */
.card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    overflow: hidden;
}

.card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
}

.card-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    color: var(--color-heading);
}

.card-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    border-top: 1px solid var(--color-border);
    font-size: 13px;
    color: var(--color-text-secondary);
}

.card-foot strong {
    color: var(--color-heading);
    font-size: 15px;
}

/* ─── Charts Row ──────────────────────────────────────────────────────────── */
.charts-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;
    align-items: stretch;
}

.chart-area {
    padding: 20px;
    height: 280px;
}

.skel-chart {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    background: var(--color-bg-secondary);
    animation: shimmer 1.4s infinite;
}

/* ─── Vehicle Status List ─────────────────────────────────────────────────── */
.status-list {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.status-skel {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.status-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.si-left {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 90px;
    flex-shrink: 0;
}

.si-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.si-label {
    font-size: 13px;
    color: var(--color-text-secondary);
}

.si-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
}

.si-bar-wrap {
    flex: 1;
    height: 6px;
    background: var(--color-bg-secondary);
    border-radius: 3px;
    overflow: hidden;
}

.si-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ease;
}

.si-count {
    font-size: 14px;
    font-weight: 700;
    min-width: 24px;
    text-align: right;
}

/* ─── Segment Control ─────────────────────────────────────────────────────── */
.seg-ctrl {
    display: flex;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
}

.seg-btn {
    padding: 5px 14px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    background: transparent;
    color: var(--color-text-secondary);
    transition: all 0.15s;
}

.seg-btn.active {
    background: var(--color-surface);
    color: var(--color-primary);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* ─── Tab Bar ─────────────────────────────────────────────────────────────── */
.tab-bar {
    display: flex;
    gap: 4px;
}

.tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    background: transparent;
    color: var(--color-text-secondary);
    transition: all 0.15s;
}

.tab-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
}

.tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.2);
}

.tab-btn:not(.active) .tab-count {
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
}

/* ─── Data Table ──────────────────────────────────────────────────────────── */
.tbl-wrap {
    overflow-x: auto;
}

.dtbl {
    width: 100%;
    border-collapse: collapse;
}

.dtbl th {
    padding: 10px 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    white-space: nowrap;
}

.dtbl td {
    padding: 13px 20px;
    font-size: 13px;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
}

.dtbl tr:last-child td {
    border-bottom: none;
}

.dtbl tr.row-overdue {
    background: rgba(239, 68, 68, 0.03);
}

.dtbl tr:hover td {
    background: var(--color-bg-secondary);
}

.td-mono {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-weight: 600;
    letter-spacing: 0.05em;
    font-size: 13px;
}

.td-date {
    color: var(--color-text-secondary);
    white-space: nowrap;
}

.person-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.tbl-skel {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.skel-row {
    height: 40px;
    border-radius: 6px;
    background: var(--color-bg-secondary);
    animation: shimmer 1.4s infinite;
}

/* ─── Bakım & Hasar Block ─────────────────────────────────────────────────── */
.bh-grid {
    display: flex;
    padding: 24px 20px;
    gap: 0;
}

.bh-block {
    flex: 1;
}

.bh-head {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--color-heading);
}

.bh-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.bh-hint {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin: 0;
}

.bh-divider {
    width: 1px;
    background: var(--color-border);
    margin: 0 24px;
}

/* ─── Card Head Actions ───────────────────────────────────────────────────── */
.card-head-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.link-btn {
    display: inline-flex;
    align-items: center;
    padding: 5px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-primary);
    text-decoration: none;
    transition: all 0.15s;
}

.link-btn:hover {
    background: var(--color-bg-secondary);
}

/* ─── Accounting Alert Bar ────────────────────────────────────────────────── */
.acc-alert-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 20px;
    background: rgba(239, 68, 68, 0.06);
    border-bottom: 1px solid rgba(239, 68, 68, 0.15);
    font-size: 13px;
    color: #dc2626;
}

.acc-skel {
    padding: 20px;
    display: flex;
    gap: 16px;
}

.acc-empty {
    padding: 24px 20px;
    text-align: center;
    font-size: 13px;
    color: var(--color-text-muted);
    border-top: 1px solid var(--color-border);
}

/* ─── Accounting ──────────────────────────────────────────────────────────── */
.acc-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0;
    padding: 24px 20px;
    align-items: start;
}

.acc-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.acc-block-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
}

.acc-big {
    font-size: 22px;
    font-weight: 700;
    color: var(--color-heading);
}

.acc-progress-wrap {
    height: 4px;
    background: var(--color-bg-secondary);
    border-radius: 2px;
    overflow: hidden;
}

.acc-progress {
    height: 100%;
    border-radius: 2px;
    transition: width 0.6s ease;
}

.acc-rate {
    font-size: 12px;
    color: var(--color-text-muted);
    margin: 0;
}

.acc-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
}

.acc-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 13px;
    color: var(--color-text-secondary);
}

.acc-row strong {
    font-weight: 600;
    color: var(--color-heading);
}

.acc-row em {
    font-style: normal;
    font-size: 11px;
    color: var(--color-text-muted);
    margin-left: 4px;
}

.acc-net {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 32px;
    text-align: center;
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
    min-width: 180px;
}

.acc-net-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    margin: 0 0 8px;
}

.acc-net-value {
    font-size: 26px;
    font-weight: 700;
    margin-bottom: 6px;
}

.acc-net-sub {
    font-size: 12px;
    color: var(--color-text-muted);
    margin: 0 0 12px;
}

.acc-net-badges {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    margin-top: 4px;
}

.acc-net-badge {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
}

.acc-net-badge--green {
    background: rgba(16, 185, 129, 0.08);
    color: #059669;
}

.acc-net-badge--red {
    background: rgba(239, 68, 68, 0.08);
    color: #dc2626;
}

.acc-net-badge-label {
    font-weight: 500;
}

.acc-net-badge-val {
    font-weight: 600;
}

/* ─── Badges ──────────────────────────────────────────────────────────────── */
.badge-success,
.badge-danger,
.badge-warning,
.badge-neutral {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
}

.badge-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.badge-danger  { background: rgba(239, 68, 68, 0.1);  color: #ef4444; }
.badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.badge-neutral { background: var(--color-bg-secondary); color: var(--color-text-secondary); }

/* ─── Utilities ───────────────────────────────────────────────────────────── */
.text-success { color: #10b981 !important; }
.text-danger  { color: #ef4444 !important; }
.text-muted   { color: var(--color-text-muted); font-size: 12px; }

.empty-state {
    padding: 48px 20px;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 14px;
}

.link {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
}

.link:hover { text-decoration: underline; }

/* ─── Buttons ─────────────────────────────────────────────────────────────── */
.btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
}

.btn-primary:hover { opacity: 0.9; }

.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
}

.btn-sm:hover { background: var(--color-bg-secondary); }

/* ─── Animation ───────────────────────────────────────────────────────────── */
@keyframes shimmer {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.45; }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ─── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 1200px) {
    .stat-row { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 900px) {
    .charts-row { grid-template-columns: 1fr; }
    .acc-grid   { grid-template-columns: 1fr; }
    .acc-net    { border: none; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); padding: 20px 0; margin: 16px 0; }
    .bh-grid    { flex-direction: column; }
    .bh-divider { width: 100%; height: 1px; margin: 16px 0; }
}

@media (max-width: 640px) {
    .stat-row { grid-template-columns: repeat(2, 1fr); }
    .db-header { flex-direction: column; align-items: flex-start; }
}

@media (max-width: 400px) {
    .stat-row { grid-template-columns: 1fr; }
}
</style>
