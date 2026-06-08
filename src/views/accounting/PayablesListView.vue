<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { usePagination, useToast, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { PayablesTable, CreatePayableModal, PaymentModal, FinancePageLayout } from '@/components/accounting'
import { RcButton, RcEmpty, RcSegTab, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { useFinancePageContext } from '@/composables/useFinancePageContext'
import { rentalsApi, vehiclesApi } from '@/api'
import type { CreatePayableRequest, PayableFilters, RecordPaymentRequest, Rental, Vehicle } from '@/types'
import { PayableStatus, PayableType } from '@/types'
import { isReceivableOverdue } from '@/utils/accounting'

type ViewMode = 'all' | 'rental' | 'vehicle'
type StatusChip = 'all' | PayableStatus

const router = useRouter()
const accountingStore = useAccountingStore()
const financePage = useFinancePageContext()
const toast = useToast()
const { page, totalPages, setPage, setTotal, getParams } = usePagination()
const { payableTypes } = useEnumTranslations()

const viewMode = ref<ViewMode>('all')
const statusChip = ref<StatusChip>('all')
const selectedRentalId = ref<number | null>(null)
const selectedVehicleId = ref<number | null>(null)
const rentalsList = ref<Rental[]>([])
const vehiclesList = ref<Vehicle[]>([])
const loadingRentals = ref(false)
const loadingVehicles = ref(false)

const advancedFilters = ref<Pick<PayableFilters, 'type' | 'startDate' | 'endDate' | 'overdue'>>({})
const showCreateModal = ref(false)
const showPaymentModal = ref(false)
const selectedPayableId = ref<number | null>(null)
const selectedPayableAmount = ref(0)
const selectedPayableNumber = ref('')

const payables = computed(() => accountingStore.payables)
const loading = computed(() => accountingStore.payablesLoading)

const displayedPayables = computed(() => {
  let items = payables.value
  const f = advancedFilters.value
  if (f.type) items = items.filter(p => p.type === f.type)
  if (f.startDate) items = items.filter(p => p.dueDate >= f.startDate!)
  if (f.endDate) items = items.filter(p => p.dueDate <= f.endDate!)
  if (f.overdue) items = items.filter(p => isReceivableOverdue(p.dueDate, p.status))
  return items
})

const viewModes = [
  { id: 'all' as ViewMode, label: 'Tümü' },
  { id: 'rental' as ViewMode, label: 'Kiralama' },
  { id: 'vehicle' as ViewMode, label: 'Araç' },
]

const statusChips: { id: StatusChip; label: string }[] = [
  { id: 'all', label: 'Hepsi' },
  { id: PayableStatus.PENDING, label: 'Bekleyen' },
  { id: PayableStatus.OVERDUE, label: 'Vadesi geçmiş' },
  { id: PayableStatus.FULLY_PAID, label: 'Ödenmiş' },
]

const typeOptions = Object.values(PayableType).map(t => ({
  value: t,
  label: payableTypes[t] ?? t,
}))

const rentalOptions = computed(() =>
  rentalsList.value.map(r => ({
    value: r.id as number,
    label: r.customerName ? `${r.rentalNumber} — ${r.customerName}` : r.rentalNumber,
  }))
)
const vehicleOptions = computed(() =>
  vehiclesList.value.map(v => ({ value: v.id as number, label: `${v.plateNumber} – ${v.brand} ${v.model}` }))
)

onMounted(() => loadPayables())

watch(viewMode, (mode) => {
  statusChip.value = 'all'
  if (mode === 'rental') {
    selectedVehicleId.value = null
    accountingStore.clearPayables()
    loadRentalsList()
  } else if (mode === 'vehicle') {
    selectedRentalId.value = null
    accountingStore.clearPayables()
    loadVehiclesList()
  } else {
    selectedRentalId.value = null
    selectedVehicleId.value = null
    setPage(0)
    loadPayables()
  }
})

watch(selectedRentalId, (id) => {
  if (viewMode.value === 'rental' && id != null) loadPayables()
})
watch(selectedVehicleId, (id) => {
  if (viewMode.value === 'vehicle' && id != null) loadPayables()
})
watch(statusChip, () => {
  if (viewMode.value === 'all') {
    setPage(0)
    loadPayables()
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

async function loadPayables() {
  try {
    if (viewMode.value === 'rental' && selectedRentalId.value != null) {
      await accountingStore.fetchPayablesByRental(selectedRentalId.value)
      setTotal(payables.value.length, 1)
    } else if (viewMode.value === 'vehicle' && selectedVehicleId.value != null) {
      await accountingStore.fetchPayablesByVehicle(selectedVehicleId.value)
      setTotal(payables.value.length, 1)
    } else if (viewMode.value === 'all') {
      const apiFilters: PayableFilters = {}
      if (statusChip.value !== 'all') apiFilters.status = statusChip.value
      const response = await accountingStore.fetchPayables(apiFilters, getParams())
      if (response) setTotal(response.totalElements, response.totalPages)
    }
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Verecekler yüklenemedi')
  }
}

function applyAdvancedFilters() {
  if (viewMode.value === 'all') loadPayables()
}

function clearAdvancedFilters() {
  advancedFilters.value = {}
  if (viewMode.value === 'all') loadPayables()
}

function handleRowClick(id: number) {
  router.push({ name: 'payable-detail', params: { id } })
}

function handlePayment(id: number) {
  const payable = payables.value.find(p => p.id === id)
  if (payable) {
    selectedPayableId.value = id
    selectedPayableAmount.value = payable.remainingAmount
    selectedPayableNumber.value = payable.payableNumber
    showPaymentModal.value = true
  }
}

async function submitPayment(data: RecordPaymentRequest) {
  if (!selectedPayableId.value) return
  try {
    await accountingStore.recordPayablePayment(selectedPayableId.value, data)
    toast.success('Ödeme başarıyla kaydedildi')
    showPaymentModal.value = false
    selectedPayableId.value = null
    await loadPayables()
    await financePage?.refresh()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Ödeme kaydedilemedi')
  }
}

async function submitCreate(data: CreatePayableRequest) {
  try {
    await accountingStore.createPayable(data)
    toast.success('Verecek başarıyla oluşturuldu')
    showCreateModal.value = false
    await loadPayables()
    await financePage?.refresh()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Verecek oluşturulamadı')
  }
}

function handlePageChange(newPage: number) {
  setPage(newPage)
  loadPayables()
}

const showList = computed(() => {
  if (viewMode.value === 'rental') return !!selectedRentalId.value
  if (viewMode.value === 'vehicle') return !!selectedVehicleId.value
  return true
})
</script>

<template>
  <FinancePageLayout class="rca-payables">
    <template #actions>
      <RcButton variant="accent" @click="showCreateModal = true">
        <RcIcon name="plus" :size="14" />
        Yeni Verecek
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

    <div v-if="viewMode === 'rental'" class="rc-filterbar" style="margin-bottom: 14px">
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

    <RcEmpty
      v-if="!showList"
      title="Seçim gerekli"
      :description="`Verecekleri görüntülemek için bir ${viewMode === 'rental' ? 'kiralama' : 'araç'} seçin.`"
    >
      <template #icon><RcIcon name="search" :size="32" /></template>
    </RcEmpty>

    <RcTableSkeleton v-else-if="loading" :rows="8" :cols="6" />

    <RcEmpty
      v-else-if="displayedPayables.length === 0"
      title="Verecek kaydı yok"
      description="Henüz kayıt bulunmuyor veya filtreye uyan sonuç yok"
    />

    <PayablesTable
      v-else
      :payables="displayedPayables"
      @row-click="handleRowClick"
      @payment="handlePayment"
    />

    <div
      v-if="!loading && displayedPayables.length > 0 && viewMode !== 'all'"
      class="rca-list-info"
    >
      {{ displayedPayables.length }} verecek kaydı listeleniyor.
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

    <CreatePayableModal
      :open="showCreateModal"
      @close="showCreateModal = false"
      @submit="submitCreate"
    />

    <PaymentModal
      :show="showPaymentModal"
      :remaining-amount="selectedPayableAmount"
      :receivable-number="selectedPayableNumber"
      title="Ödeme kaydet"
      @close="showPaymentModal = false"
      @submit="submitPayment"
    />
  </FinancePageLayout>
</template>
