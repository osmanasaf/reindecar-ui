<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { customerContractsApi, customersApi, vehicleCategoriesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleCategory, Customer } from '@/types'
import {
  CUSTOMER_CONTRACT_STATUS_LABELS,
  CUSTOMER_CONTRACT_ALLOWED_TRANSITIONS,
  type CustomerContractResponse,
  type CustomerContractStatus,
  type CreateCustomerContractRequest,
} from '@/types/customer-contract'
import { RcPageHeader, RcButton, RcEmpty, RcSegTab, RcModal, RcBadge, RcTableSkeleton, RcField, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate } from '@/utils/format'

const toast = useToast()

const contracts = ref<CustomerContractResponse[]>([])
const categories = ref<VehicleCategory[]>([])
const loading = ref(true)
const activeTab = ref<CustomerContractStatus | 'ALL'>('ALL')

const showModal = ref(false)
const saving = ref(false)
const workingId = ref<number | null>(null)

const customerSearch = ref('')
const customerResults = ref<Customer[]>([])
const selectedCustomer = ref<Customer | null>(null)
const searchingCustomer = ref(false)
let customerSearchTimer: number | null = null

const form = ref<Partial<CreateCustomerContractRequest>>({})

const statusTabs = computed(() => {
  const statuses: CustomerContractStatus[] = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'COMPLETED']
  return [
    { id: 'ALL' as const, label: 'Tümü', count: contracts.value.length },
    ...statuses.map((s) => ({
      id: s,
      label: CUSTOMER_CONTRACT_STATUS_LABELS[s],
      count: contracts.value.filter((c) => c.status === s).length,
    })),
  ]
})

const filteredContracts = computed(() => {
  if (activeTab.value === 'ALL') return contracts.value
  return contracts.value.filter((c) => c.status === activeTab.value)
})

function categoryName(categoryId: number): string {
  return categories.value.find((c) => c.id === categoryId)?.name ?? `#${categoryId}`
}

async function fetchContracts() {
  loading.value = true
  try {
    contracts.value = await customerContractsApi.findAll()
  } catch (err) {
    toast.apiError(err, 'Sözleşmeler yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    categories.value = await vehicleCategoriesApi.getAll()
  } catch (err) {
    toast.apiError(err, 'Kategoriler yüklenemedi')
  }
}

function openCreateModal() {
  form.value = {
    termMonths: 12,
    includedKmPerMonth: 0,
    startDate: new Date().toISOString().slice(0, 10),
  }
  selectedCustomer.value = null
  customerSearch.value = ''
  customerResults.value = []
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function handleCustomerSearchInput() {
  if (customerSearchTimer) clearTimeout(customerSearchTimer)
  customerSearchTimer = globalThis.setTimeout(async () => {
    if (customerSearch.value.length < 2) {
      customerResults.value = []
      return
    }
    searchingCustomer.value = true
    try {
      const response = await customersApi.search(customerSearch.value, { size: 10 })
      customerResults.value = response.content
    } catch {
      customerResults.value = []
    } finally {
      searchingCustomer.value = false
    }
  }, 300)
}

function selectCustomer(customer: Customer) {
  selectedCustomer.value = customer
  form.value.customerId = customer.id
  customerResults.value = []
  customerSearch.value = ''
}

function clearCustomer() {
  selectedCustomer.value = null
  form.value.customerId = undefined
}

async function saveContract() {
  if (!form.value.customerId || !form.value.categoryId || !form.value.termMonths ||
      !form.value.negotiatedMonthlyPrice || !form.value.startDate) {
    toast.error('Müşteri, kategori, vade, aylık ücret ve başlangıç tarihi zorunludur')
    return
  }
  if (form.value.termMonths < 12) {
    toast.error('Vade en az 12 ay olmalıdır')
    return
  }

  saving.value = true
  try {
    await customerContractsApi.create(form.value as CreateCustomerContractRequest)
    toast.success('Sözleşme oluşturuldu')
    closeModal()
    await fetchContracts()
  } catch (err) {
    toast.apiError(err, 'Sözleşme oluşturulamadı')
  } finally {
    saving.value = false
  }
}

function allowedTransitions(status: CustomerContractStatus): CustomerContractStatus[] {
  return CUSTOMER_CONTRACT_ALLOWED_TRANSITIONS[status]
}

const transitionActions: Record<CustomerContractStatus, { action: (id: number) => Promise<void>; label: string }> = {
  DRAFT: { action: async () => {}, label: '' },
  ACTIVE: { action: (id) => customerContractsApi.activate(id), label: 'Aktif et' },
  SUSPENDED: { action: (id) => customerContractsApi.suspend(id), label: 'Askıya al' },
  TERMINATED: { action: (id) => customerContractsApi.terminate(id), label: 'Feshet' },
  COMPLETED: { action: (id) => customerContractsApi.complete(id), label: 'Tamamla' },
}

async function transition(contract: CustomerContractResponse, target: CustomerContractStatus) {
  workingId.value = contract.id
  try {
    await transitionActions[target].action(contract.id)
    toast.success(`Sözleşme durumu güncellendi: ${CUSTOMER_CONTRACT_STATUS_LABELS[target]}`)
    await fetchContracts()
  } catch (err) {
    toast.apiError(err, 'Durum güncellenemedi')
  } finally {
    workingId.value = null
  }
}

function formatMoney(amount: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount)
}

function statusBadgeVariant(status: CustomerContractStatus): 'success' | 'default' | 'danger' | 'info' {
  switch (status) {
    case 'ACTIVE': return 'success'
    case 'TERMINATED': return 'danger'
    case 'SUSPENDED': return 'info'
    default: return 'default'
  }
}

onMounted(() => {
  void fetchContracts()
  void fetchCategories()
})
</script>

<template>
  <div class="rc-page rca-cc">
    <RcPageHeader
      title="Özel Fiyat Sözleşmeleri"
      subtitle="Müşteriye özel aylık fiyat sözleşmeleri (leasing/kurumsal)"
    >
      <template #actions>
        <RcButton variant="accent" @click="openCreateModal">
          <RcIcon name="plus" :size="14" />
          Yeni sözleşme
        </RcButton>
      </template>
    </RcPageHeader>

    <div class="rc-segtabs" style="margin-bottom: 14px">
      <RcSegTab
        v-for="tab in statusTabs"
        :key="tab.id"
        :id="tab.id"
        :active="activeTab"
        :count="tab.count"
        @select="(id) => activeTab = id as CustomerContractStatus | 'ALL'"
      >
        {{ tab.label }}
      </RcSegTab>
    </div>

    <RcTableSkeleton v-if="loading" :rows="6" :cols="4" />

    <RcEmpty
      v-else-if="filteredContracts.length === 0"
      title="Sözleşme yok"
      description="Bu filtre için sözleşme bulunmuyor"
    >
      <template #icon><RcIcon name="folder" :size="32" /></template>
      <template #action>
        <RcButton variant="accent" @click="openCreateModal">İlk sözleşmeyi oluştur</RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rca-cc-grid">
      <article v-for="contract in filteredContracts" :key="contract.id" class="rca-cc-card">
        <div class="rca-cc-card__head">
          <div>
            <h3 class="rca-cc-card__title">{{ contract.contractNumber }}</h3>
            <p class="rca-cc-card__sub">{{ categoryName(contract.categoryId) }} · {{ contract.termMonths }} ay</p>
          </div>
          <RcBadge :variant="statusBadgeVariant(contract.status)">
            {{ CUSTOMER_CONTRACT_STATUS_LABELS[contract.status] }}
          </RcBadge>
        </div>

        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Aylık ücret</span>
          <span class="rca-meta-row__value">{{ formatMoney(contract.negotiatedMonthlyPrice, contract.currency) }}</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Toplam sözleşme tutarı</span>
          <span class="rca-meta-row__value">{{ formatMoney(contract.totalContractPrice, contract.currency) }}</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Dahil KM</span>
          <span class="rca-meta-row__value">{{ contract.includedKmPerMonth.toLocaleString('tr-TR') }} km/ay</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Geçerlilik</span>
          <span class="rca-meta-row__value">{{ formatDate(contract.startDate) }} – {{ formatDate(contract.endDate) }}</span>
        </div>
        <div v-if="contract.notes" class="rca-meta-row">
          <span class="rca-meta-row__label">Not</span>
          <span class="rca-meta-row__value">{{ contract.notes }}</span>
        </div>

        <div v-if="allowedTransitions(contract.status).length > 0" class="rca-cc-card__actions">
          <RcButton
            v-for="target in allowedTransitions(contract.status)"
            :key="target"
            :variant="target === 'TERMINATED' ? 'ghost' : 'secondary'"
            size="sm"
            :disabled="workingId === contract.id"
            @click="transition(contract, target)"
          >
            {{ transitionActions[target].label }}
          </RcButton>
        </div>
      </article>
    </div>

    <RcModal :open="showModal" title="Yeni özel fiyat sözleşmesi" @close="closeModal">
      <div class="rc-form">
        <RcField label="Müşteri *">
          <div v-if="selectedCustomer" class="rca-cc-selected-customer">
            <span>{{ selectedCustomer.displayName }}</span>
            <button type="button" class="rca-cc-change-btn" @click="clearCustomer">Değiştir</button>
          </div>
          <div v-else>
            <RcInput
              v-model="customerSearch"
              placeholder="Ad, telefon veya TC ile ara..."
              @input="handleCustomerSearchInput"
            />
            <div v-if="customerResults.length > 0" class="rca-cc-dropdown">
              <div
                v-for="customer in customerResults"
                :key="customer.id"
                class="rca-cc-dropdown__item"
                @mousedown.prevent="selectCustomer(customer)"
              >
                {{ customer.displayName }} · {{ customer.phone }}
              </div>
            </div>
            <p v-else-if="searchingCustomer" class="rca-cc-hint">Aranıyor…</p>
          </div>
        </RcField>

        <RcField label="Kategori *">
          <select v-model.number="form.categoryId" class="rc-select">
            <option :value="undefined" disabled>Seçiniz</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </RcField>

        <div class="rc-form__row">
          <RcField label="Vade (ay, min 12) *">
            <input v-model.number="form.termMonths" type="number" min="12" class="rc-input" />
          </RcField>
          <RcField label="Başlangıç tarihi *">
            <input v-model="form.startDate" type="date" class="rc-input" />
          </RcField>
        </div>

        <div class="rc-form__row">
          <RcField label="Aylık ücret *">
            <input v-model.number="form.negotiatedMonthlyPrice" type="number" step="0.01" min="0" class="rc-input" />
          </RcField>
          <RcField label="Dahil KM/ay">
            <input v-model.number="form.includedKmPerMonth" type="number" min="0" class="rc-input" />
          </RcField>
        </div>

        <RcField label="Aşım KM ücreti">
          <input v-model.number="form.extraKmPrice" type="number" step="0.01" min="0" class="rc-input" />
        </RcField>

        <RcField label="Not">
          <textarea v-model="form.notes" class="rc-input" rows="2" maxlength="500" />
        </RcField>
      </div>

      <template #footer>
        <RcButton variant="secondary" @click="closeModal">İptal</RcButton>
        <RcButton variant="accent" :disabled="saving" @click="saveContract">
          {{ saving ? 'Kaydediliyor…' : 'Oluştur' }}
        </RcButton>
      </template>
    </RcModal>
  </div>
</template>

<style scoped>
.rc-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rc-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 640px) {
  .rc-form__row {
    grid-template-columns: 1fr;
  }
}

.rca-cc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.rca-cc-card {
  padding: 16px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-lg);
  background: var(--rc-surface);
}

.rca-cc-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.rca-cc-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.rca-cc-card__sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--rc-text-muted);
}

.rca-cc-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.rca-cc-selected-customer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius);
}

.rca-cc-change-btn {
  border: none;
  background: none;
  color: var(--rc-accent, #2563eb);
  cursor: pointer;
  font-size: 13px;
}

.rca-cc-dropdown {
  margin-top: 4px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius);
  max-height: 200px;
  overflow-y: auto;
}

.rca-cc-dropdown__item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
}

.rca-cc-dropdown__item:hover {
  background: var(--rc-surface-hover, rgba(0, 0, 0, 0.04));
}

.rca-cc-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--rc-text-muted);
}
</style>
