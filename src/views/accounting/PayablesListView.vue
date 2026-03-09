<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { usePagination, useToast, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { PayableCard, CreatePayableModal, PaymentModal } from '@/components/accounting'
import { formatCurrency } from '@/utils/format'
import { rentalsApi, vehiclesApi } from '@/api'
import type { CreatePayableRequest, PayableFilters, RecordPaymentRequest, Rental, Vehicle } from '@/types'
import { PayableStatus, PayableType } from '@/types'

const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { page, setPage, setTotal, getParams } = usePagination()
const { payableTypes, payableStatuses } = useEnumTranslations()

type ViewMode = 'all' | 'rental' | 'vehicle'
const viewMode = ref<ViewMode>('all')
const selectedRentalId = ref<number | null>(null)
const selectedVehicleId = ref<number | null>(null)
const rentalsList = ref<Rental[]>([])
const vehiclesList = ref<Vehicle[]>([])
const loadingRentals = ref(false)
const loadingVehicles = ref(false)

const filters = ref<PayableFilters>({})
const showCreateModal = ref(false)
const showPaymentModal = ref(false)
const selectedPayableId = ref<number | null>(null)
const selectedPayableAmount = ref(0)
const selectedPayableNumber = ref('')

const payables = computed(() => accountingStore.payables)
const loading = computed(() => accountingStore.payablesLoading)

const totalPayable = computed(() => payables.value.reduce((s, p) => s + p.amount, 0))
const outstandingPayable = computed(() => payables.value.reduce((s, p) => s + p.remainingAmount, 0))
const overduePayables = computed(() => payables.value.filter(p => p.status === PayableStatus.OVERDUE))
const overduePayablesTotal = computed(() =>
  overduePayables.value.reduce((s, p) => s + p.remainingAmount, 0)
)
const paymentRate = computed(() => {
  const total = totalPayable.value
  if (!total) return 0
  const paid = payables.value.reduce((s, p) => s + p.paidAmount, 0)
  return Math.round((paid / total) * 100)
})

onMounted(() => {
  loadPayables()
})

watch(viewMode, (mode) => {
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

const loadRentalsList = async () => {
  loadingRentals.value = true
  try {
    const res = await rentalsApi.getAll({ page: 0, size: 500, sort: 'startDate', direction: 'DESC' })
    rentalsList.value = res.content
  } catch {
    rentalsList.value = []
  } finally {
    loadingRentals.value = false
  }
}

const loadVehiclesList = async () => {
  loadingVehicles.value = true
  try {
    const res = await vehiclesApi.getAll({ page: 0, size: 500, sort: 'plateNumber', direction: 'ASC' })
    vehiclesList.value = res.content
  } catch {
    vehiclesList.value = []
  } finally {
    loadingVehicles.value = false
  }
}

const loadPayables = async () => {
  try {
    if (viewMode.value === 'rental' && selectedRentalId.value != null) {
      await accountingStore.fetchPayablesByRental(selectedRentalId.value)
      setTotal(payables.value.length, 1)
    } else if (viewMode.value === 'vehicle' && selectedVehicleId.value != null) {
      await accountingStore.fetchPayablesByVehicle(selectedVehicleId.value)
      setTotal(payables.value.length, 1)
    } else if (viewMode.value === 'all') {
      const response = await accountingStore.fetchPayables(filters.value, getParams())
      if (response) setTotal(response.totalElements, response.totalPages)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verecekler yüklenemedi'
    toast.error(message)
  }
}

const applyFilters = () => {
  setPage(0)
  loadPayables()
}

const clearFilters = () => {
  filters.value = {}
  setPage(0)
  loadPayables()
}

const handleCardClick = (id: number) => {
  router.push({ name: 'payable-detail', params: { id } })
}

const handlePayment = (id: number) => {
  const payable = payables.value.find(p => p.id === id)
  if (payable) {
    selectedPayableId.value = id
    selectedPayableAmount.value = payable.remainingAmount
    selectedPayableNumber.value = payable.payableNumber
    showPaymentModal.value = true
  }
}

const submitPayment = async (data: RecordPaymentRequest) => {
  if (!selectedPayableId.value) return
  try {
    await accountingStore.recordPayablePayment(selectedPayableId.value, data)
    toast.success('Ödeme başarıyla kaydedildi')
    showPaymentModal.value = false
    selectedPayableId.value = null
    loadPayables()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ödeme kaydedilemedi'
    toast.error(message)
  }
}

const submitCreate = async (data: CreatePayableRequest) => {
  try {
    await accountingStore.createPayable(data)
    toast.success('Verecek başarıyla oluşturuldu')
    showCreateModal.value = false
    loadPayables()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verecek oluşturulamadı'
    toast.error(message)
  }
}

const handlePageChange = (newPage: number) => {
  setPage(newPage)
  loadPayables()
}

const statusOptions = computed(() =>
  Object.values(PayableStatus).map(s => ({ value: s, label: payableStatuses[s] ?? s }))
)
const typeOptions = computed(() =>
  Object.values(PayableType).map(t => ({ value: t, label: payableTypes[t] ?? t }))
)
const rentalOptions = computed(() =>
  rentalsList.value.map(r => ({
    value: r.id as number,
    label: r.customerName
      ? `${r.rentalNumber} — ${r.customerName} (${r.startDate} - ${r.endDate})`
      : `${r.rentalNumber} (${r.startDate} - ${r.endDate})`
  }))
)
const vehicleOptions = computed(() =>
  vehiclesList.value.map(v => ({ value: v.id as number, label: `${v.plateNumber} – ${v.brand} ${v.model}` }))
)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Verecekler</h1>
        <p class="page-subtitle">Servis sağlayıcılara ödenecek tutarlar</p>
      </div>
      <button class="btn btn-primary" @click="showCreateModal = true">Yeni Verecek</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Toplam Verecek</div>
        <div class="stat-value">{{ formatCurrency(totalPayable) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ödenecek</div>
        <div class="stat-value text-orange">{{ formatCurrency(outstandingPayable) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Vadesi Geçmiş</div>
        <div class="stat-value text-red">
          {{ formatCurrency(overduePayablesTotal) }}
          <span class="stat-count">({{ overduePayables.length }})</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ödeme Oranı</div>
        <div class="stat-value text-green">{{ paymentRate }}%</div>
      </div>
    </div>

    <div class="view-tabs">
      <button
        :class="['tab-btn', { active: viewMode === 'all' }]"
        @click="viewMode = 'all'"
      >
        Tümü
      </button>
      <button
        :class="['tab-btn', { active: viewMode === 'rental' }]"
        @click="viewMode = 'rental'"
      >
        Kiralama Bazlı
      </button>
      <button
        :class="['tab-btn', { active: viewMode === 'vehicle' }]"
        @click="viewMode = 'vehicle'"
      >
        Araç Bazlı
      </button>
    </div>

    <div v-if="viewMode === 'rental'" class="filter-bar">
      <SearchableSelect
        v-model="selectedRentalId"
        :options="rentalOptions"
        placeholder="Kiralama seçin"
        search-placeholder="Kiralama ara..."
        clearable
        :loading="loadingRentals"
        class="filter-searchable rental-select"
      />
    </div>

    <div v-else-if="viewMode === 'vehicle'" class="filter-bar">
      <SearchableSelect
        v-model="selectedVehicleId"
        :options="vehicleOptions"
        placeholder="Araç seçin"
        search-placeholder="Araç ara..."
        clearable
        :loading="loadingVehicles"
        class="filter-searchable vehicle-select"
      />
    </div>

    <div v-else-if="viewMode === 'all'" class="filter-bar">
      <SearchableSelect
        :model-value="filters.status ?? null"
        :options="statusOptions"
        placeholder="Tüm Durumlar"
        search-placeholder="Durum ara..."
        clearable
        class="filter-searchable"
        @update:model-value="(v) => filters.status = v ?? undefined"
      />
      <SearchableSelect
        :model-value="filters.type ?? null"
        :options="typeOptions"
        placeholder="Tüm Tipler"
        search-placeholder="Tip ara..."
        clearable
        class="filter-searchable"
        @update:model-value="(v) => filters.type = v ?? undefined"
      />
      <DatePicker v-model="filters.startDate" placeholder="Başlangıç" />
      <DatePicker v-model="filters.endDate" placeholder="Bitiş" />
      <label class="filter-check">
        <input type="checkbox" v-model="filters.overdue" /> Yalnızca Vadesi Geçmiş
      </label>
      <button class="btn btn-secondary" @click="applyFilters">Filtrele</button>
      <button class="btn btn-ghost" @click="clearFilters">Temizle</button>
    </div>

    <div
      v-if="viewMode === 'rental' && !selectedRentalId"
      class="empty-state-hint"
    >
      Verecekleri görüntülemek için yukarıdan bir kiralama seçin.
    </div>
    <div
      v-else-if="viewMode === 'vehicle' && !selectedVehicleId"
      class="empty-state-hint"
    >
      Verecekleri görüntülemek için yukarıdan bir araç seçin.
    </div>

    <div v-else-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="payables.length === 0" class="empty-state">
      <p>Henüz verecek kaydı bulunmamaktadır.</p>
    </div>

    <div v-else class="cards-grid">
      <PayableCard
        v-for="payable in payables"
        :key="payable.id"
        :payable="payable"
        @click="handleCardClick"
        @payment="handlePayment"
      />
    </div>

    <div v-if="!loading && payables.length > 0 && (viewMode === 'rental' || viewMode === 'vehicle')" class="list-info">
      {{ payables.length }} verecek kaydı listeleniyor.
    </div>
    <div v-if="!loading && payables.length > 0 && viewMode === 'all'" class="pagination">
      <button class="page-btn" :disabled="page === 0" @click="handlePageChange(page - 1)">‹ Önceki</button>
      <span class="page-info">Sayfa {{ page + 1 }}</span>
      <button class="page-btn" @click="handlePageChange(page + 1)">Sonraki ›</button>
    </div>

    <CreatePayableModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @submit="submitCreate"
    />

    <PaymentModal
      :show="showPaymentModal"
      :remaining-amount="selectedPayableAmount"
      :reference-number="selectedPayableNumber"
      @close="showPaymentModal = false"
      @submit="submitPayment"
    />
  </div>
</template>

<style scoped>
.page-container { padding: 2rem; max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.page-title { font-size: 1.875rem; font-weight: 700; color: var(--color-text, #111827); margin: 0 0 0.5rem 0; }
.page-subtitle { color: var(--color-text-secondary, #6b7280); margin: 0; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.stat-card { background: white; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem; padding: 1.5rem; }
.stat-label { font-size: 0.875rem; color: var(--color-text-secondary, #6b7280); margin-bottom: 0.5rem; }
.stat-value { font-size: 1.5rem; font-weight: 700; color: var(--color-text, #111827); }
.stat-count { font-size: 1rem; font-weight: 400; color: var(--color-text-secondary, #6b7280); }
.text-orange { color: #c2410c !important; }
.text-red { color: #b91c1c !important; }
.text-green { color: #15803d !important; }

.view-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 0.375rem;
  width: fit-content;
}
.tab-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.2s;
}
.tab-btn:hover { background: var(--color-background, #f3f4f6); color: var(--color-text, #111827); }
.tab-btn.active { background: var(--color-primary, #2563eb); color: white; }

.filter-bar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; background: white; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
.rental-select, .vehicle-select { min-width: 300px; }
.list-info { font-size: 0.875rem; color: var(--color-text-secondary, #6b7280); margin-top: 1rem; }
.filter-select, .filter-input { padding: 0.4rem 0.75rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.375rem; font-size: 0.875rem; background: white; }
.filter-check { font-size: 0.875rem; display: flex; align-items: center; gap: 0.375rem; cursor: pointer; }
.loading { text-align: center; padding: 3rem; color: var(--color-text-secondary, #6b7280); }
.empty-state { text-align: center; padding: 3rem; background: white; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem; color: var(--color-text-secondary, #6b7280); }
.empty-state-hint {
  text-align: center;
  padding: 2.5rem;
  background: #f8fafc;
  border: 2px dashed var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.9375rem;
  margin-bottom: 1.5rem;
}
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; }
.page-btn { padding: 0.5rem 1rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.375rem; background: white; cursor: pointer; font-size: 0.875rem; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 0.875rem; color: var(--color-text-secondary, #6b7280); }
.btn { padding: 0.5rem 1.25rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: var(--color-primary, #2563eb); color: white; }
.btn-primary:hover { background: var(--color-primary-dark, #1d4ed8); }
.btn-secondary { background: var(--color-secondary, #4b5563); color: white; }
.btn-ghost { background: transparent; border: 1px solid var(--color-border, #e5e7eb); color: var(--color-text, #111827); }
</style>
