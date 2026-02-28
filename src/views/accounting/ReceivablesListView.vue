<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { usePagination, useToast, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import { ReceivableCard, PaymentModal } from '@/components/accounting'
import { formatCurrency } from '@/utils/format'
import { receivablesApi, rentalsApi, vehiclesApi, customersApi } from '@/api'
import type { RecordPaymentRequest, ReceivableFilters, CreateReceivableRequest, Rental, Vehicle, Customer } from '@/types'
import { ReceivableStatus, ReceivableType } from '@/types'

const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { page, setPage, setTotal, getParams } = usePagination()
const { receivableTypes, receivableStatuses } = useEnumTranslations()

type ViewMode = 'all' | 'customer' | 'rental' | 'vehicle'
const viewMode = ref<ViewMode>('all')
const selectedRentalId = ref<number | null>(null)
const selectedVehicleId = ref<number | null>(null)
const selectedCustomerId = ref<number | null>(null)
const rentalsList = ref<Rental[]>([])
const vehiclesList = ref<Vehicle[]>([])
const customersList = ref<Customer[]>([])
const loadingRentals = ref(false)
const loadingVehicles = ref(false)
const loadingCustomers = ref(false)

const filters = ref<ReceivableFilters>({})
const showPaymentModal = ref(false)
const showCreateModal = ref(false)
const selectedReceivableId = ref<number | null>(null)
const selectedReceivableAmount = ref(0)
const selectedReceivableNumber = ref('')

const createForm = ref<CreateReceivableRequest>({
  type: ReceivableType.OTHER,
  customerId: 0,
  description: '',
  amount: 0,
  dueDate: undefined
})

const receivables = computed(() => accountingStore.receivables)
const loading = computed(() => accountingStore.receivablesLoading)

const totalReceivable = computed(() =>
  receivables.value.reduce((s, r) => s + r.amount, 0)
)
const outstandingReceivable = computed(() =>
  receivables.value.reduce((s, r) => s + r.remainingAmount, 0)
)
const overdueReceivables = computed(() =>
  receivables.value.filter(r => r.status === ReceivableStatus.OVERDUE)
)
const overdueReceivablesTotal = computed(() =>
  overdueReceivables.value.reduce((s, r) => s + r.remainingAmount, 0)
)
const collectionRate = computed(() => {
  const total = totalReceivable.value
  if (!total) return 0
  const paid = receivables.value.reduce((s, r) => s + r.paidAmount, 0)
  return Math.round((paid / total) * 100)
})

const selectedCustomer = computed(() =>
  customersList.value.find(c => c.id === selectedCustomerId.value) ?? null
)

const getCustomerDisplayName = (customer: Customer | null): string => {
  if (!customer) return ''
  return customer.displayName || `Müşteri #${customer.id}`
}

onMounted(() => {
  loadReceivables()
})

watch(viewMode, (mode) => {
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

const loadCustomersList = async () => {
  loadingCustomers.value = true
  try {
    const res = await customersApi.getAll({ page: 0, size: 500, sort: 'createdAt', direction: 'DESC' })
    customersList.value = res.content
  } catch {
    customersList.value = []
  } finally {
    loadingCustomers.value = false
  }
}

const loadReceivables = async () => {
  try {
    if (viewMode.value === 'rental' && selectedRentalId.value != null) {
      await accountingStore.fetchReceivablesByRental(selectedRentalId.value)
      setTotal(receivables.value.length, 1)
    } else if (viewMode.value === 'vehicle' && selectedVehicleId.value != null) {
      await accountingStore.fetchReceivablesByVehicle(selectedVehicleId.value)
      setTotal(receivables.value.length, 1)
    } else if (viewMode.value === 'customer' && selectedCustomerId.value != null) {
      await accountingStore.fetchReceivables({ customerId: selectedCustomerId.value }, { page: 0, size: 500, sort: 'createdAt', direction: 'DESC' })
      setTotal(receivables.value.length, 1)
    } else if (viewMode.value === 'all') {
      const response = await accountingStore.fetchReceivables(filters.value, getParams())
      setTotal(response.totalElements, response.totalPages)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Alacaklar yüklenemedi'
    toast.error(message)
  }
}

const applyFilters = () => {
  setPage(0)
  loadReceivables()
}

const clearFilters = () => {
  filters.value = {}
  setPage(0)
  loadReceivables()
}

const handleCardClick = (id: number) => {
  router.push({ name: 'receivable-detail', params: { id } })
}

const handlePayment = (id: number) => {
  const receivable = receivables.value.find(r => r.id === id)
  if (receivable) {
    selectedReceivableId.value = id
    selectedReceivableAmount.value = receivable.remainingAmount
    selectedReceivableNumber.value = receivable.receivableNumber
    showPaymentModal.value = true
  }
}

const submitPayment = async (data: RecordPaymentRequest) => {
  if (!selectedReceivableId.value) return
  try {
    await accountingStore.recordReceivablePayment(selectedReceivableId.value, data)
    toast.success('Ödeme başarıyla kaydedildi')
    showPaymentModal.value = false
    selectedReceivableId.value = null
    loadReceivables()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ödeme kaydedilemedi'
    toast.error(message)
  }
}

const submitCreate = async () => {
  try {
    await receivablesApi.create(createForm.value)
    toast.success('Alacak başarıyla oluşturuldu')
    showCreateModal.value = false
    createForm.value = { type: ReceivableType.OTHER, customerId: 0, description: '', amount: 0 }
    loadReceivables()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Alacak oluşturulamadı'
    toast.error(message)
  }
}

const handlePageChange = (newPage: number) => {
  setPage(newPage)
  loadReceivables()
}

const statusOptions = Object.values(ReceivableStatus).map(s => ({
  value: s,
  label: receivableStatuses[s] ?? s
}))
const typeOptions = Object.values(ReceivableType).map(t => ({
  value: t,
  label: receivableTypes[t] ?? t
}))
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
const customerOptions = computed(() =>
  customersList.value.map(c => ({
    value: c.id as number,
    label: c.displayName || `Müşteri #${c.id}`
  }))
)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Alacaklar</h1>
        <p class="page-subtitle">Müşterilerden tahsil edilecek tutarlar</p>
      </div>
      <button class="btn btn-primary" @click="showCreateModal = true">+ Yeni Alacak</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Toplam Alacak</div>
        <div class="stat-value">{{ formatCurrency(totalReceivable) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tahsil Edilecek</div>
        <div class="stat-value text-orange">{{ formatCurrency(outstandingReceivable) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Vadesi Geçmiş</div>
        <div class="stat-value text-red">
          {{ formatCurrency(overdueReceivablesTotal) }}
          <span class="stat-count">({{ overdueReceivables.length }})</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tahsilat Oranı</div>
        <div class="stat-value text-green">{{ collectionRate }}%</div>
      </div>
    </div>

    <div class="view-tabs">
      <button :class="['tab-btn', { active: viewMode === 'all' }]" @click="viewMode = 'all'">
        <span class="tab-icon">⊞</span> Tümü
      </button>
      <button :class="['tab-btn', { active: viewMode === 'customer' }]" @click="viewMode = 'customer'">
        <span class="tab-icon">👤</span> Müşteri Bazlı
      </button>
      <button :class="['tab-btn', { active: viewMode === 'rental' }]" @click="viewMode = 'rental'">
        <span class="tab-icon">🚗</span> Kiralama Bazlı
      </button>
      <button :class="['tab-btn', { active: viewMode === 'vehicle' }]" @click="viewMode = 'vehicle'">
        <span class="tab-icon">🔑</span> Araç Bazlı
      </button>
    </div>

    <div class="filter-bar" v-if="viewMode !== 'all' || true">
      <template v-if="viewMode === 'customer'">
        <SearchableSelect
          v-model="selectedCustomerId"
          :options="customerOptions"
          placeholder="Müşteri seçin"
          search-placeholder="Müşteri ara..."
          clearable
          :loading="loadingCustomers"
          class="filter-searchable customer-select"
        />
      </template>
      <template v-else-if="viewMode === 'rental'">
        <SearchableSelect
          v-model="selectedRentalId"
          :options="rentalOptions"
          placeholder="Kiralama seçin"
          search-placeholder="Kiralama ara..."
          clearable
          :loading="loadingRentals"
          class="filter-searchable rental-select"
        />
      </template>
      <template v-else-if="viewMode === 'vehicle'">
        <SearchableSelect
          v-model="selectedVehicleId"
          :options="vehicleOptions"
          placeholder="Araç seçin"
          search-placeholder="Araç ara..."
          clearable
          :loading="loadingVehicles"
          class="filter-searchable vehicle-select"
        />
      </template>
      <template v-if="viewMode === 'all'">
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
        <input v-model="filters.startDate" type="date" class="filter-input" placeholder="Başlangıç" />
        <input v-model="filters.endDate" type="date" class="filter-input" placeholder="Bitiş" />
        <label class="filter-check">
          <input type="checkbox" v-model="filters.overdue" /> Yalnızca Vadesi Geçmiş
        </label>
        <button class="btn btn-secondary" @click="applyFilters">Filtrele</button>
        <button class="btn btn-ghost" @click="clearFilters">Temizle</button>
      </template>
    </div>

    <div v-if="viewMode === 'customer' && selectedCustomerId" class="customer-summary-card">
      <div class="customer-summary-header">
        <div class="customer-name">
          <span class="customer-avatar">👤</span>
          <span>{{ getCustomerDisplayName(selectedCustomer) }}</span>
        </div>
        <span class="customer-badge">Müşteri Alacak Özeti</span>
      </div>
      <div class="customer-summary-stats">
        <div class="summary-stat">
          <span class="summary-stat-label">Toplam Alacak</span>
          <span class="summary-stat-value">{{ formatCurrency(totalReceivable) }}</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat-label">Tahsil Edilecek</span>
          <span class="summary-stat-value text-orange">{{ formatCurrency(outstandingReceivable) }}</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat-label">Vadesi Geçmiş</span>
          <span class="summary-stat-value text-red">{{ formatCurrency(overdueReceivablesTotal) }}</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat-label">Tahsilat Oranı</span>
          <span class="summary-stat-value text-green">{{ collectionRate }}%</span>
          <div class="mini-progress-bar">
            <div class="mini-progress-fill" :style="{ width: `${collectionRate}%` }"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="viewMode === 'customer' && !selectedCustomerId" class="empty-state-hint">
      <div class="hint-icon">👤</div>
      <p>Alacakları görüntülemek için yukarıdan bir müşteri seçin.</p>
    </div>

    <div v-else-if="viewMode === 'rental' && !selectedRentalId" class="empty-state-hint">
      <div class="hint-icon">🚗</div>
      <p>Alacakları görüntülemek için yukarıdan bir kiralama seçin.</p>
    </div>

    <div v-else-if="viewMode === 'vehicle' && !selectedVehicleId" class="empty-state-hint">
      <div class="hint-icon">🔑</div>
      <p>Alacakları görüntülemek için yukarıdan bir araç seçin.</p>
    </div>

    <div v-else-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="receivables.length === 0" class="empty-state">
      <p>Henüz alacak kaydı bulunmamaktadır.</p>
    </div>

    <div v-else class="cards-grid">
      <ReceivableCard
        v-for="receivable in receivables"
        :key="receivable.id"
        :receivable="receivable"
        @click="handleCardClick"
        @payment="handlePayment"
      />
    </div>

    <div v-if="!loading && receivables.length > 0 && viewMode === 'rental'" class="list-info">
      Bu kiralamaya ait {{ receivables.length }} alacak kaydı.
    </div>
    <div v-else-if="!loading && receivables.length > 0 && viewMode === 'vehicle'" class="list-info">
      Bu araca ait {{ receivables.length }} alacak kaydı.
    </div>
    <div v-else-if="!loading && receivables.length > 0 && viewMode === 'customer'" class="list-info">
      Bu müşteriye ait {{ receivables.length }} alacak kaydı.
    </div>
    <div v-if="!loading && receivables.length > 0 && viewMode === 'all'" class="pagination">
      <button
        class="page-btn"
        :disabled="page === 0"
        @click="handlePageChange(page - 1)"
      >‹ Önceki</button>
      <span class="page-info">Sayfa {{ page + 1 }}</span>
      <button
        class="page-btn"
        @click="handlePageChange(page + 1)"
      >Sonraki ›</button>
    </div>

    <PaymentModal
      :show="showPaymentModal"
      :remaining-amount="selectedReceivableAmount"
      :reference-number="selectedReceivableNumber"
      @close="showPaymentModal = false"
      @submit="submitPayment"
    />

    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-box">
        <h2 class="modal-title">Yeni Alacak Oluştur</h2>
        <div class="form-group">
          <label>Tip</label>
          <SearchableSelect
            v-model="createForm.type"
            :options="typeOptions"
            placeholder="Tip seçin"
            search-placeholder="Ara..."
          />
        </div>
        <div class="form-group">
          <label>Müşteri ID</label>
          <input v-model.number="createForm.customerId" type="number" class="form-control" />
        </div>
        <div class="form-group">
          <label>Açıklama</label>
          <input v-model="createForm.description" type="text" class="form-control" />
        </div>
        <div class="form-group">
          <label>Tutar</label>
          <input v-model.number="createForm.amount" type="number" class="form-control" />
        </div>
        <div class="form-group">
          <label>Vade Tarihi</label>
          <input v-model="createForm.dueDate" type="date" class="form-control" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showCreateModal = false">İptal</button>
          <button class="btn btn-primary" @click="submitCreate">Oluştur</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text, #111827);
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text, #111827);
}

.stat-count {
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-text-secondary, #6b7280);
}

.text-orange { color: #c2410c !important; }
.text-red { color: #b91c1c !important; }
.text-green { color: #15803d !important; }

.view-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 0.375rem;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--color-background, #f9fafb);
  color: var(--color-text, #111827);
}

.tab-btn.active {
  background: var(--color-primary, #2563eb);
  color: white;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
}

.tab-icon {
  font-size: 1rem;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
}

.customer-select,
.rental-select,
.vehicle-select {
  min-width: 280px;
}

.customer-summary-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.customer-summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.customer-name {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111827);
}

.customer-avatar {
  font-size: 1.5rem;
}

.customer-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary, #2563eb);
  background: #eff6ff;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid #bfdbfe;
}

.customer-summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-stat-value {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-text, #111827);
}

.mini-progress-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.375rem;
}

.mini-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.empty-state-hint {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border: 2px dashed var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 1.5rem;
}

.hint-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state-hint p {
  font-size: 0.9375rem;
  margin: 0;
}

.list-info {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 1rem;
}

.filter-select,
.filter-input {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
}

.filter-check {
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  color: var(--color-text-secondary, #6b7280);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.page-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.btn {
  padding: 0.5rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover { background: var(--color-primary-dark, #1d4ed8); }

.btn-secondary {
  background: var(--color-secondary, #4b5563);
  color: white;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--color-border, #e5e7eb);
  color: var(--color-text, #111827);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-box {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
}

.form-control {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
