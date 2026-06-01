<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { usePagination, useToast, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import {
  ReceivablesTable,
  PaymentModal,
  CreateReceivableModal,
  FinancePageLayout,
} from '@/components/accounting'
import { RcButton, RcEmpty, RcSegTab } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { fmtTRY } from '@/utils/format'
import { useFinancePageContext } from '@/composables/useFinancePageContext'
import { receivablesApi, rentalsApi, vehiclesApi, customersApi } from '@/api'
import type { RecordPaymentRequest, ReceivableFilters, CreateReceivableRequest, Rental, Vehicle, Customer } from '@/types'
import { ReceivableStatus, ReceivableType } from '@/types'
import { isReceivableOverdue } from '@/utils/accounting'

type ViewMode = 'all' | 'customer' | 'rental' | 'vehicle'
type StatusChip = 'all' | ReceivableStatus | 'overdue_open'

const router = useRouter()
const accountingStore = useAccountingStore()
const financePage = useFinancePageContext()
const toast = useToast()
const { page, totalPages, setPage, setTotal, getParams } = usePagination()
const { receivableTypes } = useEnumTranslations()

const viewMode = ref<ViewMode>('all')
const statusChip = ref<StatusChip>('all')
const selectedRentalId = ref<number | null>(null)
const selectedVehicleId = ref<number | null>(null)
const selectedCustomerId = ref<number | null>(null)
const rentalsList = ref<Rental[]>([])
const vehiclesList = ref<Vehicle[]>([])
const customersList = ref<Customer[]>([])
const loadingRentals = ref(false)
const loadingVehicles = ref(false)
const loadingCustomers = ref(false)

const advancedFilters = ref<Pick<ReceivableFilters, 'type' | 'startDate' | 'endDate' | 'overdue'>>({})
const showPaymentModal = ref(false)
const showCreateModal = ref(false)
const selectedReceivableId = ref<number | null>(null)
const selectedReceivableAmount = ref(0)
const selectedReceivableNumber = ref('')

const receivables = computed(() => accountingStore.receivables)
const loading = computed(() => accountingStore.receivablesLoading)

const displayedReceivables = computed(() => {
  let items = receivables.value
  const f = advancedFilters.value
  if (f.type) items = items.filter(r => r.type === f.type)
  if (f.startDate) items = items.filter(r => r.dueDate >= f.startDate!)
  if (f.endDate) items = items.filter(r => r.dueDate <= f.endDate!)
  if (f.overdue) {
    items = items.filter(r => isReceivableOverdue(r.dueDate, r.status))
  }
  return items
})

const totalReceivable = computed(() => displayedReceivables.value.reduce((s, r) => s + r.amount, 0))
const outstandingReceivable = computed(() => displayedReceivables.value.reduce((s, r) => s + r.remainingAmount, 0))
const overdueReceivables = computed(() =>
  displayedReceivables.value.filter(r => isReceivableOverdue(r.dueDate, r.status))
)
const overdueReceivablesTotal = computed(() =>
  overdueReceivables.value.reduce((s, r) => s + r.remainingAmount, 0)
)
const collectionRate = computed(() => {
  const total = totalReceivable.value
  if (!total) return 0
  const remaining = outstandingReceivable.value
  if (remaining <= 0) return 100
  return Math.min(99.9, Math.round(((total - remaining) / total) * 1000) / 10)
})

const selectedCustomer = computed(() =>
  customersList.value.find(c => c.id === selectedCustomerId.value) ?? null
)

const viewModes = [
  { id: 'all' as ViewMode, label: 'Tümü' },
  { id: 'customer' as ViewMode, label: 'Müşteri' },
  { id: 'rental' as ViewMode, label: 'Kiralama' },
  { id: 'vehicle' as ViewMode, label: 'Araç' },
]

const statusChips: { id: StatusChip; label: string }[] = [
  { id: 'all', label: 'Hepsi' },
  { id: ReceivableStatus.PENDING, label: 'Bekleyen' },
  { id: ReceivableStatus.OVERDUE, label: 'Vadesi geçmiş' },
  { id: ReceivableStatus.FULLY_PAID, label: 'Tahsil edilmiş' },
]

const typeOptions = Object.values(ReceivableType).map(t => ({
  value: t,
  label: receivableTypes[t] ?? t,
}))

const rentalOptions = computed(() =>
  rentalsList.value.map(r => ({
    value: r.id as number,
    label: r.customerName
      ? `${r.rentalNumber} — ${r.customerName}`
      : r.rentalNumber,
  }))
)
const vehicleOptions = computed(() =>
  vehiclesList.value.map(v => ({ value: v.id as number, label: `${v.plateNumber} – ${v.brand} ${v.model}` }))
)
const customerOptions = computed(() =>
  customersList.value.map(c => ({
    value: c.id as number,
    label: c.displayName || `Müşteri #${c.id}`,
  }))
)

onMounted(() => loadReceivables())

watch(viewMode, (mode) => {
  statusChip.value = 'all'
  if (mode === 'rental') {
    selectedVehicleId.value = null
    selectedCustomerId.value = null
    accountingStore.clearReceivables()
    loadRentalsList()
  } else if (mode === 'vehicle') {
    selectedRentalId.value = null
    selectedCustomerId.value = null
    accountingStore.clearReceivables()
    loadVehiclesList()
  } else if (mode === 'customer') {
    selectedRentalId.value = null
    selectedVehicleId.value = null
    accountingStore.clearReceivables()
    loadCustomersList()
  } else {
    selectedRentalId.value = null
    selectedVehicleId.value = null
    selectedCustomerId.value = null
    setPage(0)
    loadReceivables()
  }
})

watch(selectedRentalId, (id) => {
  if (viewMode.value === 'rental' && id != null) loadReceivables()
})
watch(selectedVehicleId, (id) => {
  if (viewMode.value === 'vehicle' && id != null) loadReceivables()
})
watch(selectedCustomerId, (id) => {
  if (viewMode.value === 'customer' && id != null) loadReceivables()
})
watch(statusChip, () => {
  if (viewMode.value === 'all') {
    setPage(0)
    loadReceivables()
  }
})

async function loadRentalsList() {
  loadingRentals.value = true
  try {
    const res = await rentalsApi.getAll({ page: 0, size: 500, sort: 'startDate', direction: 'desc' })
    rentalsList.value = res.content
  } catch {
    rentalsList.value = []
  } finally {
    loadingRentals.value = false
  }
}

async function loadVehiclesList() {
  loadingVehicles.value = true
  try {
    const res = await vehiclesApi.getAll({ page: 0, size: 500, sort: 'plateNumber', direction: 'asc' })
    vehiclesList.value = res.content
  } catch {
    vehiclesList.value = []
  } finally {
    loadingVehicles.value = false
  }
}

async function loadCustomersList() {
  loadingCustomers.value = true
  try {
    const res = await customersApi.getAll({ page: 0, size: 500, sort: 'createdAt', direction: 'desc' })
    customersList.value = res.content
  } catch {
    customersList.value = []
  } finally {
    loadingCustomers.value = false
  }
}

async function loadReceivables() {
  try {
    if (viewMode.value === 'rental' && selectedRentalId.value != null) {
      await accountingStore.fetchReceivablesByRental(selectedRentalId.value)
      setTotal(receivables.value.length, 1)
    } else if (viewMode.value === 'vehicle' && selectedVehicleId.value != null) {
      await accountingStore.fetchReceivablesByVehicle(selectedVehicleId.value)
      setTotal(receivables.value.length, 1)
    } else if (viewMode.value === 'customer' && selectedCustomerId.value != null) {
      await accountingStore.fetchCustomerReceivables(selectedCustomerId.value)
      setTotal(receivables.value.length, 1)
    } else if (viewMode.value === 'all') {
      const apiFilters: ReceivableFilters = {}
      if (statusChip.value !== 'all' && statusChip.value !== 'overdue_open') {
        apiFilters.status = statusChip.value
      }
      const response = await accountingStore.fetchReceivables(apiFilters, getParams())
      setTotal(response.totalElements, response.totalPages)
    }
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Alacaklar yüklenemedi')
  }
}

function applyAdvancedFilters() {
  if (viewMode.value === 'all') loadReceivables()
}

function clearAdvancedFilters() {
  advancedFilters.value = {}
  if (viewMode.value === 'all') loadReceivables()
}

function handleRowClick(id: number) {
  router.push({ name: 'receivable-detail', params: { id } })
}

function handlePayment(id: number) {
  const receivable = receivables.value.find(r => r.id === id)
  if (receivable) {
    selectedReceivableId.value = id
    selectedReceivableAmount.value = receivable.remainingAmount
    selectedReceivableNumber.value = receivable.receivableNumber
    showPaymentModal.value = true
  }
}

async function submitPayment(data: RecordPaymentRequest) {
  if (!selectedReceivableId.value) return
  try {
    await accountingStore.recordReceivablePayment(selectedReceivableId.value, data)
    toast.success('Ödeme başarıyla kaydedildi')
    showPaymentModal.value = false
    selectedReceivableId.value = null
    await loadReceivables()
    await financePage?.refresh()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Ödeme kaydedilemedi')
  }
}

async function submitCreate(data: CreateReceivableRequest) {
  try {
    await receivablesApi.create(data)
    toast.success('Alacak başarıyla oluşturuldu')
    showCreateModal.value = false
    await loadReceivables()
    await financePage?.refresh()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Alacak oluşturulamadı')
  }
}

function handlePageChange(newPage: number) {
  setPage(newPage)
  loadReceivables()
}

const showList = computed(() => {
  if (viewMode.value === 'customer') return !!selectedCustomerId.value
  if (viewMode.value === 'rental') return !!selectedRentalId.value
  if (viewMode.value === 'vehicle') return !!selectedVehicleId.value
  return true
})
</script>

<template>
  <FinancePageLayout class="rca-receivables">
    <template #actions>
      <RcButton variant="accent" @click="showCreateModal = true">
        <RcIcon name="plus" :size="14" />
        Yeni Alacak
      </RcButton>
    </template>

    <div class="rc-segtabs" style="margin-bottom: 14px">
      <RcSegTab
        v-for="mode in viewModes"
        :key="mode.id"
        :id="mode.id"
        :active="viewMode"
        @select="(id) => viewMode = id as ViewMode"
      >
        {{ mode.label }}
      </RcSegTab>
    </div>

    <div v-if="viewMode === 'customer'" class="rc-filterbar" style="margin-bottom: 14px">
      <SearchableSelect
        v-model="selectedCustomerId"
        :options="customerOptions"
        placeholder="Müşteri seçin"
        search-placeholder="Müşteri ara..."
        clearable
        :loading="loadingCustomers"
        style="min-width: 280px"
      />
    </div>
    <div v-else-if="viewMode === 'rental'" class="rc-filterbar" style="margin-bottom: 14px">
      <SearchableSelect
        v-model="selectedRentalId"
        :options="rentalOptions"
        placeholder="Kiralama seçin"
        search-placeholder="Kiralama ara..."
        clearable
        :loading="loadingRentals"
        style="min-width: 280px"
      />
    </div>
    <div v-else-if="viewMode === 'vehicle'" class="rc-filterbar" style="margin-bottom: 14px">
      <SearchableSelect
        v-model="selectedVehicleId"
        :options="vehicleOptions"
        placeholder="Araç seçin"
        search-placeholder="Araç ara..."
        clearable
        :loading="loadingVehicles"
        style="min-width: 280px"
      />
    </div>

    <div v-if="viewMode === 'all'" class="rc-filterbar rcv-filterbar--slim">
      <button
        v-for="chip in statusChips"
        :key="chip.id"
        type="button"
        class="rc-chip"
        :class="{ 'rc-chip--on': statusChip === chip.id }"
        @click="statusChip = chip.id"
      >
        {{ chip.label }}
      </button>
      <div class="rca-advanced-filters" style="width: 100%; margin-top: 0; padding-top: 0; border: none">
        <SearchableSelect
          :model-value="advancedFilters.type ?? null"
          :options="typeOptions"
          placeholder="Tüm tipler"
          search-placeholder="Tip ara..."
          clearable
          @update:model-value="(v) => advancedFilters.type = v ?? undefined"
        />
        <DatePicker v-model="advancedFilters.startDate" placeholder="Başlangıç" />
        <DatePicker v-model="advancedFilters.endDate" placeholder="Bitiş" />
        <label class="rca-filter-check">
          <input v-model="advancedFilters.overdue" type="checkbox" />
          Yalnızca vadesi geçmiş
        </label>
        <RcButton variant="secondary" size="sm" @click="applyAdvancedFilters">Filtrele</RcButton>
        <RcButton variant="ghost" size="sm" @click="clearAdvancedFilters">Temizle</RcButton>
      </div>
    </div>

    <div
      v-if="viewMode === 'customer' && selectedCustomerId && selectedCustomer"
      class="rca-customer-panel"
    >
      <div class="rca-customer-panel__head">
        <div class="rca-customer-panel__name">{{ selectedCustomer.displayName }}</div>
        <span class="rca-customer-panel__badge">Müşteri alacak özeti</span>
      </div>
      <div class="rca-customer-panel__stats">
        <div class="rca-stat">
          <div class="rca-stat__label">Toplam</div>
          <div class="rca-stat__value rc-num">{{ fmtTRY(totalReceivable) }}</div>
        </div>
        <div class="rca-stat">
          <div class="rca-stat__label">Kalan</div>
          <div class="rca-stat__value rca-stat__value--warning rc-num">{{ fmtTRY(outstandingReceivable) }}</div>
        </div>
        <div class="rca-stat">
          <div class="rca-stat__label">Vadesi geçmiş</div>
          <div class="rca-stat__value rca-stat__value--danger rc-num">{{ fmtTRY(overdueReceivablesTotal) }}</div>
        </div>
        <div class="rca-stat">
          <div class="rca-stat__label">Tahsilat %</div>
          <div class="rca-stat__value rc-num">{{ collectionRate }}%</div>
          <div class="rca-mini-progress">
            <div class="rca-mini-progress__fill" :style="{ width: `${collectionRate}%` }" />
          </div>
        </div>
      </div>
    </div>

    <RcEmpty
      v-if="!showList"
      title="Seçim gerekli"
      :description="`Alacakları görüntülemek için bir ${viewMode === 'customer' ? 'müşteri' : viewMode === 'rental' ? 'kiralama' : 'araç'} seçin.`"
    >
      <template #icon><RcIcon name="search" :size="32" /></template>
    </RcEmpty>

    <div v-else-if="loading" class="rc-skeleton rc-card-skeleton" style="height: 280px" />

    <RcEmpty
      v-else-if="displayedReceivables.length === 0"
      title="Alacak kaydı yok"
      description="Henüz kayıt bulunmuyor veya filtreye uyan sonuç yok"
    />

    <ReceivablesTable
      v-else
      :receivables="displayedReceivables"
      @row-click="handleRowClick"
      @payment="handlePayment"
    />

    <div
      v-if="!loading && displayedReceivables.length > 0 && viewMode !== 'all'"
      class="rca-list-info"
    >
      {{ displayedReceivables.length }} alacak kaydı listeleniyor.
    </div>

    <div
      v-if="!loading && viewMode === 'all' && totalPages > 1"
      class="rca-pagination"
    >
      <RcButton variant="secondary" :disabled="page === 0" @click="handlePageChange(page - 1)">
        Önceki
      </RcButton>
      <span style="font-size: 13px; color: var(--rc-text-muted)">Sayfa {{ page + 1 }} / {{ totalPages }}</span>
      <RcButton variant="secondary" :disabled="page >= totalPages - 1" @click="handlePageChange(page + 1)">
        Sonraki
      </RcButton>
    </div>

    <PaymentModal
      :show="showPaymentModal"
      :remaining-amount="selectedReceivableAmount"
      :receivable-number="selectedReceivableNumber"
      title="Tahsilat kaydet"
      @close="showPaymentModal = false"
      @submit="submitPayment"
    />

    <CreateReceivableModal
      :open="showCreateModal"
      @close="showCreateModal = false"
      @submit="submitCreate"
    />
  </FinancePageLayout>
</template>
