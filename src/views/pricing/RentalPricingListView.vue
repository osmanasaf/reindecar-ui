<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { rentalPricingApi, vehiclesApi, customersApi, vehicleCategoriesApi } from '@/api'
import { useToast } from '@/composables'
import { RentalType } from '@/types'
import type { Vehicle, Customer, VehicleCategory } from '@/types'
import {
  PRICING_LEVEL_LABELS,
  type RentalPricingResponse,
  type CreateRentalPricingRequest,
  type PricingLevel,
} from '@/types/rental-pricing'
import { RcPageHeader, RcButton, RcEmpty, RcSegTab, RcModal, RcBadge, RcTableSkeleton, RcField, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate } from '@/utils/format'

const toast = useToast()

const pricings = ref<RentalPricingResponse[]>([])
const categories = ref<VehicleCategory[]>([])
const loading = ref(true)
const activeTab = ref<PricingLevel | 'ALL'>('ALL')
const showModal = ref(false)
const saving = ref(false)
const workingId = ref<number | null>(null)

const scope = ref<PricingLevel>('CATEGORY')
const form = ref<Partial<CreateRentalPricingRequest>>({})

const vehicleSearch = ref('')
const vehicleResults = ref<Vehicle[]>([])
const selectedVehicle = ref<Vehicle | null>(null)

const customerSearch = ref('')
const customerResults = ref<Customer[]>([])
const selectedCustomer = ref<Customer | null>(null)

let searchTimer: number | null = null

const rentalTypes: { value: RentalType; label: string }[] = [
  { value: RentalType.DAILY, label: 'Günlük' },
  { value: RentalType.WEEKLY, label: 'Haftalık' },
  { value: RentalType.MONTHLY, label: 'Aylık' },
  { value: RentalType.LEASING, label: 'Leasing' },
  { value: RentalType.SERVICE, label: 'Servis' },
]

const tabs = computed(() => {
  const levels: PricingLevel[] = ['VEHICLE', 'CUSTOMER', 'CATEGORY']
  return [
    { id: 'ALL' as const, label: 'Tümü', count: pricings.value.length },
    ...levels.map((l) => ({
      id: l,
      label: PRICING_LEVEL_LABELS[l],
      count: pricings.value.filter((p) => p.pricingLevel === l).length,
    })),
  ]
})

const filteredPricings = computed(() => {
  if (activeTab.value === 'ALL') return pricings.value
  return pricings.value.filter((p) => p.pricingLevel === activeTab.value)
})

function categoryName(categoryId: number | null): string {
  if (categoryId == null) return '—'
  return categories.value.find((c) => c.id === categoryId)?.name ?? `#${categoryId}`
}

function scopeLabel(p: RentalPricingResponse): string {
  if (p.pricingLevel === 'VEHICLE') return `Araç #${p.vehicleId}`
  if (p.pricingLevel === 'CUSTOMER') return `Müşteri #${p.customerId} · ${categoryName(p.categoryId)}`
  return categoryName(p.categoryId)
}

async function fetchPricings() {
  loading.value = true
  try {
    pricings.value = await rentalPricingApi.getAll()
  } catch (err) {
    toast.apiError(err, 'Fiyat kuralları yüklenemedi')
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
  scope.value = 'CATEGORY'
  form.value = { rentalType: RentalType.MONTHLY, kmLimit: 0 }
  selectedVehicle.value = null
  selectedCustomer.value = null
  vehicleSearch.value = ''
  customerSearch.value = ''
  vehicleResults.value = []
  customerResults.value = []
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function handleVehicleSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = globalThis.setTimeout(async () => {
    if (vehicleSearch.value.length < 2) {
      vehicleResults.value = []
      return
    }
    try {
      const response = await vehiclesApi.search(vehicleSearch.value, { size: 10 })
      vehicleResults.value = response.content
    } catch {
      vehicleResults.value = []
    }
  }, 300)
}

function selectVehicle(vehicle: Vehicle) {
  selectedVehicle.value = vehicle
  form.value.vehicleId = vehicle.id
  vehicleResults.value = []
  vehicleSearch.value = ''
}

function handleCustomerSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = globalThis.setTimeout(async () => {
    if (customerSearch.value.length < 2) {
      customerResults.value = []
      return
    }
    try {
      const response = await customersApi.search(customerSearch.value, { size: 10 })
      customerResults.value = response.content
    } catch {
      customerResults.value = []
    }
  }, 300)
}

function selectCustomer(customer: Customer) {
  selectedCustomer.value = customer
  form.value.customerId = customer.id
  customerResults.value = []
  customerSearch.value = ''
}

function onScopeChange() {
  form.value.vehicleId = undefined
  form.value.customerId = undefined
  form.value.categoryId = undefined
  selectedVehicle.value = null
  selectedCustomer.value = null
}

async function savePricing() {
  if (scope.value === 'VEHICLE' && !form.value.vehicleId) {
    toast.error('Araç seçimi zorunludur')
    return
  }
  if (scope.value === 'CUSTOMER' && (!form.value.customerId || !form.value.categoryId)) {
    toast.error('Müşteri ve kategori seçimi zorunludur')
    return
  }
  if (scope.value === 'CATEGORY' && !form.value.categoryId) {
    toast.error('Kategori seçimi zorunludur')
    return
  }
  if (!form.value.rentalType || form.value.monthlyPrice == null || form.value.extraKmPrice == null) {
    toast.error('Kiralama tipi, aylık fiyat ve ekstra km ücreti zorunludur')
    return
  }

  saving.value = true
  try {
    await rentalPricingApi.create(form.value as CreateRentalPricingRequest)
    toast.success('Fiyat kuralı oluşturuldu')
    closeModal()
    await fetchPricings()
  } catch (err) {
    toast.apiError(err, 'Fiyat kuralı oluşturulamadı')
  } finally {
    saving.value = false
  }
}

async function deactivate(pricing: RentalPricingResponse) {
  workingId.value = pricing.id
  try {
    await rentalPricingApi.deactivate(pricing.id)
    toast.success('Fiyat kuralı pasife alındı')
    await fetchPricings()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    workingId.value = null
  }
}

function formatMoney(amount: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount)
}

onMounted(() => {
  void fetchPricings()
  void fetchCategories()
})
</script>

<template>
  <div class="rc-page rca-cc">
    <RcPageHeader
      title="Araç/Müşteri/Kategori Fiyat Kuralları"
      subtitle="Aylık kiralama (leasing) fiyatı ve KM aşım ücreti fallback kuralları — kiralama faturalamasında KM paketi atanmamışsa devreye girer"
    >
      <template #actions>
        <RcButton variant="accent" @click="openCreateModal">
          <RcIcon name="plus" :size="14" />
          Yeni kural
        </RcButton>
      </template>
    </RcPageHeader>

    <div class="rc-segtabs" style="margin-bottom: 14px">
      <RcSegTab
        v-for="tab in tabs"
        :key="tab.id"
        :id="tab.id"
        :active="activeTab"
        :count="tab.count"
        @select="(id) => activeTab = id as PricingLevel | 'ALL'"
      >
        {{ tab.label }}
      </RcSegTab>
    </div>

    <RcTableSkeleton v-if="loading" :rows="6" :cols="4" />

    <RcEmpty
      v-else-if="filteredPricings.length === 0"
      title="Fiyat kuralı yok"
      description="Bu filtre için kural bulunmuyor"
    >
      <template #icon><RcIcon name="bolt" :size="32" /></template>
      <template #action>
        <RcButton variant="accent" @click="openCreateModal">İlk kuralı oluştur</RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rca-cc-grid">
      <article v-for="pricing in filteredPricings" :key="pricing.id" class="rca-cc-card">
        <div class="rca-cc-card__head">
          <div>
            <h3 class="rca-cc-card__title">{{ scopeLabel(pricing) }}</h3>
            <p class="rca-cc-card__sub">{{ PRICING_LEVEL_LABELS[pricing.pricingLevel] }} · {{ pricing.rentalType }}</p>
          </div>
          <RcBadge :variant="pricing.active ? 'success' : 'default'">
            {{ pricing.active ? 'Aktif' : 'Pasif' }}
          </RcBadge>
        </div>

        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Aylık fiyat</span>
          <span class="rca-meta-row__value">{{ formatMoney(pricing.monthlyPrice, pricing.currency) }}</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Dahil KM</span>
          <span class="rca-meta-row__value">{{ pricing.kmLimit.toLocaleString('tr-TR') }} km</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Ekstra KM ücreti</span>
          <span class="rca-meta-row__value">{{ formatMoney(pricing.extraKmPrice, pricing.currency) }}/km</span>
        </div>
        <div v-if="pricing.validFrom" class="rca-meta-row">
          <span class="rca-meta-row__label">Geçerlilik</span>
          <span class="rca-meta-row__value">
            {{ formatDate(pricing.validFrom) }} – {{ pricing.validTo ? formatDate(pricing.validTo) : '—' }}
          </span>
        </div>
        <div v-if="pricing.notes" class="rca-meta-row">
          <span class="rca-meta-row__label">Not</span>
          <span class="rca-meta-row__value">{{ pricing.notes }}</span>
        </div>

        <div v-if="pricing.active" class="rca-cc-card__actions">
          <RcButton variant="ghost" size="sm" :disabled="workingId === pricing.id" @click="deactivate(pricing)">
            Pasif yap
          </RcButton>
        </div>
      </article>
    </div>

    <RcModal :open="showModal" title="Yeni fiyat kuralı" @close="closeModal">
      <div class="rc-form">
        <div class="rc-field">
          <span class="rc-field__label">Kural kapsamı *</span>
          <div class="rc-filterbar" style="padding: 0; border: none; margin: 0">
            <button
              v-for="level in (['VEHICLE', 'CUSTOMER', 'CATEGORY'] as PricingLevel[])"
              :key="level"
              type="button"
              class="rc-chip"
              :class="{ 'rc-chip--on': scope === level }"
              @click="scope = level; onScopeChange()"
            >
              {{ PRICING_LEVEL_LABELS[level] }}
            </button>
          </div>
        </div>

        <RcField v-if="scope === 'VEHICLE'" label="Araç *">
          <div v-if="selectedVehicle" class="rca-cc-selected-customer">
            <span>{{ selectedVehicle.plateNumber }} · {{ selectedVehicle.brand }} {{ selectedVehicle.model }}</span>
            <button type="button" class="rca-cc-change-btn" @click="selectedVehicle = null; form.vehicleId = undefined">Değiştir</button>
          </div>
          <div v-else>
            <RcInput v-model="vehicleSearch" placeholder="Plaka veya marka ile ara..." @input="handleVehicleSearchInput" />
            <div v-if="vehicleResults.length > 0" class="rca-cc-dropdown">
              <div v-for="v in vehicleResults" :key="v.id" class="rca-cc-dropdown__item" @mousedown.prevent="selectVehicle(v)">
                {{ v.plateNumber }} · {{ v.brand }} {{ v.model }}
              </div>
            </div>
          </div>
        </RcField>

        <RcField v-if="scope === 'CUSTOMER'" label="Müşteri *">
          <div v-if="selectedCustomer" class="rca-cc-selected-customer">
            <span>{{ selectedCustomer.displayName }}</span>
            <button type="button" class="rca-cc-change-btn" @click="selectedCustomer = null; form.customerId = undefined">Değiştir</button>
          </div>
          <div v-else>
            <RcInput v-model="customerSearch" placeholder="Ad, telefon veya TC ile ara..." @input="handleCustomerSearchInput" />
            <div v-if="customerResults.length > 0" class="rca-cc-dropdown">
              <div v-for="c in customerResults" :key="c.id" class="rca-cc-dropdown__item" @mousedown.prevent="selectCustomer(c)">
                {{ c.displayName }} · {{ c.phone }}
              </div>
            </div>
          </div>
        </RcField>

        <RcField v-if="scope === 'CUSTOMER' || scope === 'CATEGORY'" label="Kategori *">
          <select v-model.number="form.categoryId" class="rc-select">
            <option :value="undefined" disabled>Seçiniz</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </RcField>

        <div class="rc-form__row">
          <RcField label="Kiralama tipi *">
            <select v-model="form.rentalType" class="rc-select">
              <option v-for="rt in rentalTypes" :key="rt.value" :value="rt.value">{{ rt.label }}</option>
            </select>
          </RcField>
          <RcField label="Aylık fiyat *">
            <input v-model.number="form.monthlyPrice" type="number" step="0.01" min="0" class="rc-input" />
          </RcField>
        </div>

        <div class="rc-form__row">
          <RcField label="Dahil KM limiti">
            <input v-model.number="form.kmLimit" type="number" min="0" class="rc-input" />
          </RcField>
          <RcField label="Ekstra KM ücreti *">
            <input v-model.number="form.extraKmPrice" type="number" step="0.01" min="0" class="rc-input" />
          </RcField>
        </div>

        <div class="rc-form__row">
          <RcField label="Geçerlilik başlangıcı (opsiyonel)">
            <input v-model="form.validFrom" type="date" class="rc-input" />
          </RcField>
          <RcField label="Geçerlilik bitişi (opsiyonel)">
            <input v-model="form.validTo" type="date" class="rc-input" />
          </RcField>
        </div>

        <RcField label="Not (opsiyonel)">
          <textarea v-model="form.notes" class="rc-input" rows="2" />
        </RcField>
      </div>

      <template #footer>
        <RcButton variant="secondary" @click="closeModal">İptal</RcButton>
        <RcButton variant="accent" :disabled="saving" @click="savePricing">
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
</style>
