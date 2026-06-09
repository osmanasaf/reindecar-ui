<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { rentalsApi, dashboardApi, vehiclesApi, customersApi } from '@/api'
import type { RentalStats } from '@/api/dashboard.api'
import { usePagination, useToast, usePageSearchHotkey } from '@/composables'
import RentalQuickModal from '@/components/rentals/RentalQuickModal.vue'
import { RcIcon } from '@/components/icons'
import {
  RcPageHeader,
  RcButton,
  RcBadge,
  RcAvatar,
  RcEmpty,
  RcKbd,
  RcStatusPill,
  RcTableSkeleton,
  RcError,
} from '@/components/rc'
import { fmtTRY, formatDate } from '@/utils/format'
import { RentalStatus, RentalType } from '@/types/enums'
import type { Rental, Vehicle, Customer } from '@/types'

type StatusView = 'all' | RentalStatus

const rentals = ref<Rental[]>([])
const vehicleMap = ref<Map<number, Vehicle>>(new Map())
const customerMap = ref<Map<number, Customer>>(new Map())
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const statusView = ref<StatusView>('all')
const typeFilter = ref<RentalType | ''>('')
const previewRental = ref<Rental | null>(null)
const showPreview = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

usePageSearchHotkey(searchInputRef)

const overview = ref({
  total: 0,
  active: 0,
  overdue: 0,
  reserved: 0,
  returnPending: 0,
  draft: 0,
  closed: 0,
  cancelled: 0,
  todayReturns: 0,
})

const { page, totalElements, totalPages, setPage, setTotal, getParams } = usePagination()
const toast = useToast()

const typeLabels: Record<RentalType, string> = {
  DAILY: 'Günlük',
  WEEKLY: 'Haftalık',
  MONTHLY: 'Aylık',
  LEASING: 'Leasing',
  SERVICE: 'Servis',
}

const statusViews: { id: StatusView; label: string }[] = [
  { id: 'all', label: 'Hepsi' },
  { id: RentalStatus.ACTIVE, label: 'Aktif' },
  { id: RentalStatus.RESERVED, label: 'Rezerve' },
  { id: RentalStatus.DRAFT, label: 'Taslak' },
  { id: RentalStatus.OVERDUE, label: 'Gecikmiş' },
  { id: RentalStatus.RETURN_PENDING, label: 'İade bekliyor' },
  { id: RentalStatus.CLOSED, label: 'Tamamlanan' },
  { id: RentalStatus.CANCELLED, label: 'İptal' },
]

const typeChips: { id: RentalType | ''; label: string }[] = [
  { id: '', label: 'Tüm tipler' },
  { id: RentalType.DAILY, label: 'Günlük' },
  { id: RentalType.WEEKLY, label: 'Haftalık' },
  { id: RentalType.MONTHLY, label: 'Aylık' },
  { id: RentalType.LEASING, label: 'Leasing' },
  { id: RentalType.SERVICE, label: 'Servis' },
]

const pageSubtitle = computed(() => {
  const parts = [`${overview.value.total} kayıt`]
  if (overview.value.overdue > 0) parts.push(`${overview.value.overdue} gecikmiş`)
  if (overview.value.reserved > 0) parts.push(`${overview.value.reserved} bekleyen teslimat`)
  return parts.join(' · ')
})

function viewCount(id: StatusView): number {
  if (id === 'all') return overview.value.total
  if (id === RentalStatus.ACTIVE) return overview.value.active
  if (id === RentalStatus.OVERDUE) return overview.value.overdue
  if (id === RentalStatus.RESERVED) return overview.value.reserved
  if (id === RentalStatus.RETURN_PENDING) return overview.value.returnPending
  if (id === RentalStatus.DRAFT) return overview.value.draft
  if (id === RentalStatus.CLOSED) return overview.value.closed
  if (id === RentalStatus.CANCELLED) return overview.value.cancelled
  return 0
}

function getVehicle(rental: Rental): Vehicle | undefined {
  return rental.vehicle || vehicleMap.value.get(rental.vehicleId)
}

function getCustomer(rental: Rental): Customer | undefined {
  return rental.customer || customerMap.value.get(rental.customerId)
}

function customerName(rental: Rental): string {
  return rental.customerName || getCustomer(rental)?.displayName || '—'
}

function vehiclePlate(rental: Rental): string {
  return rental.vehiclePlate || getVehicle(rental)?.plateNumber || '—'
}

function vehicleName(rental: Rental): string {
  const v = getVehicle(rental)
  return rental.vehicleName || (v ? `${v.brand} ${v.model}` : '—')
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

async function fetchOverview() {
  try {
    const [raw, upcoming] = await Promise.all([
      dashboardApi.getRawStats(),
      dashboardApi.getUpcomingReturns(1),
    ])
    const stats: RentalStats = raw.rentals ?? {
      draft: 0,
      reserved: 0,
      active: 0,
      returning: 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
    }
    overview.value = {
      total: raw.totalRentals ?? 0,
      active: stats.active ?? 0,
      overdue: stats.overdue ?? 0,
      reserved: stats.reserved ?? 0,
      returnPending: stats.returning ?? 0,
      draft: stats.draft ?? 0,
      closed: stats.completed ?? 0,
      cancelled: stats.cancelled ?? 0,
      todayReturns: upcoming.filter((r) => r.daysUntilReturn === 0).length,
    }
  } catch {
    try {
      const [all, active, overdue] = await Promise.all([
        rentalsApi.getAll({ page: 0, size: 1 }),
        rentalsApi.getActive({ page: 0, size: 1 }),
        rentalsApi.getOverdue({ page: 0, size: 1 }),
      ])
      overview.value = {
        ...overview.value,
        total: all.totalElements,
        active: active.totalElements,
        overdue: overdue.totalElements,
      }
    } catch {
      toast.error('Kiralama özeti yüklenemedi')
    }
  }
}

async function fetchRelatedData() {
  const vehicleIds = [...new Set(rentals.value.filter((r) => r.vehicleId && !r.vehicle).map((r) => r.vehicleId))]
  const customerIds = [
    ...new Set(rentals.value.filter((r) => r.customerId && !r.customer).map((r) => r.customerId)),
  ]

  const promises: Promise<void>[] = []

  for (const id of vehicleIds) {
    promises.push(
      vehiclesApi
        .getById(id)
        .then((v) => {
          vehicleMap.value.set(id, v)
        })
        .catch(() => {}),
    )
  }

  for (const id of customerIds) {
    promises.push(
      customersApi
        .getById(id)
        .then((c) => {
          customerMap.value.set(id, c)
        })
        .catch(() => {}),
    )
  }

  await Promise.all(promises)
}

function buildListParams(search?: string) {
  const p = getParams()
  const params: Record<string, string | number> = {
    page: p.page,
    size: p.size,
  }
  if (p.sort) {
    params.sort = p.sort
    params.direction = p.direction
  }
  if (search) {
    params.search = search
  }
  if (typeFilter.value) {
    params.rentalType = typeFilter.value
  }
  return params
}

async function fetchRentals() {
  loading.value = true
  error.value = null
  try {
    const q = searchQuery.value.trim()
    const search = q.length >= 2 ? q : undefined
    const params = buildListParams(search)
    let response

    if (statusView.value === RentalStatus.ACTIVE) {
      response = await rentalsApi.getActive(params)
    } else if (statusView.value === RentalStatus.OVERDUE) {
      response = await rentalsApi.getOverdue(params)
    } else if (statusView.value === 'all') {
      response = await rentalsApi.getAll(params)
    } else {
      response = await rentalsApi.getAll({ ...params, status: statusView.value })
    }

    rentals.value = response.content
    setTotal(response.totalElements, response.totalPages)
    await fetchRelatedData()
  } catch {
    error.value = 'Kiralamalar yüklenirken hata oluştu'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function setStatusView(next: StatusView) {
  if (statusView.value === next) return
  statusView.value = next
  setPage(0)
  fetchRentals()
}

function setTypeFilter(next: RentalType | '') {
  if (typeFilter.value === next) return
  typeFilter.value = next
  setPage(0)
  fetchRentals()
}

function handlePageChange(newPage: number) {
  setPage(newPage)
  fetchRentals()
}

function openPreview(rental: Rental) {
  previewRental.value = rental
  showPreview.value = true
}

function closePreview() {
  showPreview.value = false
  previewRental.value = null
}

onMounted(async () => {
  await fetchOverview()
  await fetchRentals()
})

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    setPage(0)
    fetchRentals()
  }, 300)
})
</script>

<template>
  <div class="rc-page">
    <RcPageHeader title="Kiralamalar" :subtitle="pageSubtitle">
      <template #actions>
        <RouterLink to="/rentals/create" class="rc-btn rc-btn--accent">
          <RcIcon name="plus" :size="14" />
          Yeni kiralama
          <RcKbd>N</RcKbd>
        </RouterLink>
        <RouterLink to="/rentals/create?type=SERVICE" class="rc-btn rc-btn--secondary">
          Servis kiralama
        </RouterLink>
      </template>
    </RcPageHeader>

    <!-- Metrik şeridi -->
    <div class="rcv-hero-strip rcv-hero-strip--rentals">
      <div class="rcv-hs__zone">
        <div class="rcv-hs__eyebrow">
          <RcIcon name="key" :size="14" />
          Aktif kiralamalar
        </div>
        <div class="rcv-hs__stat-value rc-num">{{ overview.active }}</div>
        <div class="rcv-hs__legend">
          <div class="rcv-hs__legend-row">
            <span class="rc-dot rc-dot--accent" />
            <span>Rezerve</span>
            <span class="rc-num">{{ overview.reserved }}</span>
          </div>
          <div class="rcv-hs__legend-row">
            <span class="rc-dot rc-dot--success" />
            <span>Tamamlanan</span>
            <span class="rc-num">{{ overview.closed }}</span>
          </div>
        </div>
      </div>

      <div class="rcv-hs__zone">
        <div class="rcv-hs__eyebrow">
          <RcIcon name="calendar" :size="14" />
          Bugün teslim
        </div>
        <div class="rcv-hs__lead">
          <b>{{ overview.todayReturns }} kiralama</b> bugün iade edilecek.
        </div>
        <div class="rcv-hs__quick">
          <button
            type="button"
            class="rcv-hs__chip rcv-hs__chip--accent"
            @click="setStatusView(RentalStatus.RETURN_PENDING)"
          >
            <RcIcon name="key" :size="14" />
            İade bekleyen
            <span class="rcv-hs__chip-count">{{ overview.returnPending }}</span>
          </button>
        </div>
      </div>

      <div class="rcv-hs__zone">
        <div class="rcv-hs__eyebrow">
          <RcIcon name="warning" :size="14" />
          Geciken
        </div>
        <div class="rcv-hs__lead">
          <em>{{ overview.overdue }} kiralama</em> süresi geçmiş durumda.
        </div>
        <div class="rcv-hs__quick">
          <button
            type="button"
            class="rcv-hs__chip rcv-hs__chip--danger"
            @click="setStatusView(RentalStatus.OVERDUE)"
          >
            <RcIcon name="warning" :size="14" />
            Gecikmiş
            <span class="rcv-hs__chip-count">{{ overview.overdue }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Durum görünümleri -->
    <div class="rc-views">
      <button
        v-for="view in statusViews"
        :key="view.id"
        type="button"
        class="rc-view-tab"
        :class="{ 'rc-view-tab--active': statusView === view.id }"
        @click="setStatusView(view.id)"
      >
        {{ view.label }}
        <span class="rc-view-tab__count">{{ viewCount(view.id) }}</span>
      </button>
    </div>

    <!-- Filtre çubuğu -->
    <div class="rc-filterbar rcv-filterbar--slim">
      <div class="rc-input-group" style="width: 280px">
        <RcIcon name="search" :size="16" />
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="search"
          placeholder="Müşteri, plaka, RNT-…"
          autocomplete="off"
        />
        <RcKbd>/</RcKbd>
      </div>
      <span class="rc-filterbar__sep" />
      <button
        v-for="chip in typeChips"
        :key="chip.id || 'all'"
        type="button"
        class="rc-chip"
        :class="{ 'rc-chip--on': typeFilter === chip.id }"
        @click="setTypeFilter(chip.id)"
      >
        {{ chip.label }}
      </button>
      <span style="margin-left: auto; font-size: 12px; color: var(--rc-text-muted)">
        {{ rentals.length }} / {{ totalElements }} sonuç
      </span>
    </div>

    <RcTableSkeleton v-if="loading" :rows="10" :cols="6" />

    <RcError
      v-else-if="error"
      :message="error"
      @retry="fetchRentals"
    />

    <RcEmpty
      v-else-if="rentals.length === 0"
      title="Eşleşen kiralama yok"
      description="Filtreyi veya aramayı değiştirin"
    >
      <template #icon>
        <RcIcon name="search" :size="32" />
      </template>
    </RcEmpty>

    <div v-else class="rc-card" style="overflow: hidden">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th>Kiralama</th>
            <th>Müşteri</th>
            <th>Araç</th>
            <th>Tarih</th>
            <th>Tip</th>
            <th>Durum</th>
            <th class="rc-right">Tutar</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="rental in rentals"
            :key="rental.id"
            style="cursor: pointer"
            @click="openPreview(rental)"
          >
            <td>
              <div class="rcr-row__primary rcr-row__mono">
                {{ rental.rentalNumber || `#${rental.id}` }}
              </div>
              <div class="rcr-row__secondary">
                {{ rental.totalDays }} gün
                <span v-if="rental.branchName"> · {{ rental.branchName }}</span>
              </div>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 10px">
                <RcAvatar size="sm">{{ initials(customerName(rental)) }}</RcAvatar>
                <div style="min-width: 0">
                  <div class="rcr-row__primary">{{ customerName(rental) }}</div>
                  <div
                    v-if="getCustomer(rental)?.customerType === 'COMPANY'"
                    class="rcr-row__secondary"
                  >
                    Kurumsal
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div class="rcr-row__primary rcr-row__mono">{{ vehiclePlate(rental) }}</div>
              <div class="rcr-row__secondary">{{ vehicleName(rental) }}</div>
            </td>
            <td>
              <div class="rcr-row__primary rc-num" style="font-size: 12.5px">
                {{ formatDate(rental.startDate) }}
              </div>
              <div class="rcr-row__secondary">→ {{ formatDate(rental.endDate) }}</div>
            </td>
            <td>
              <RcBadge>{{ typeLabels[rental.rentalType] || rental.rentalType }}</RcBadge>
            </td>
            <td>
              <RcStatusPill :status="rental.status" />
            </td>
            <td class="rc-right">
              <div class="rcr-row__primary rc-num">{{ fmtTRY(rental.grandTotal) }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!loading && rentals.length > 0 && totalPages > 1"
      class="rc-filterbar"
      style="justify-content: center; margin-top: 20px"
    >
      <RcButton variant="secondary" :disabled="page === 0" @click="handlePageChange(page - 1)">
        Önceki
      </RcButton>
      <span style="font-size: 13px; color: var(--rc-text-muted)">
        Sayfa {{ page + 1 }} / {{ totalPages }} · {{ totalElements }} kayıt
      </span>
      <RcButton
        variant="secondary"
        :disabled="page + 1 >= totalPages"
        @click="handlePageChange(page + 1)"
      >
        Sonraki
      </RcButton>
    </div>

    <RentalQuickModal :open="showPreview" :rental="previewRental" @close="closePreview" />
  </div>
</template>
