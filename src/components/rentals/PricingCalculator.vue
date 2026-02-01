<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { pricingApi, leasingApi } from '@/api'
import { useToast } from '@/composables'
import type { PriceCalculationResponse, LeasingPlan } from '@/api'
import type { RentalType } from '@/types'

const toast = useToast()

interface Props {
  vehicleId: number | null
  customerId: number | null
  rentalType: RentalType
  startDate: string
  endDate: string
  termMonths?: number
  kmPackageId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  calculated: [response: PriceCalculationResponse]
  leasingPlanSelected: [planId: number]
  termSelected: [months: number]
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const priceData = ref<PriceCalculationResponse | null>(null)
const leasingPlans = ref<LeasingPlan[]>([])
const selectedLeasingPlanId = ref<number | null>(null)

const isLeasing = computed(() => props.rentalType === 'LEASING')

const canCalculate = computed(() => {
  return props.vehicleId && props.startDate && props.endDate
})


const unitPriceLabel = computed(() => {
  switch (props.rentalType) {
    case 'LEASING':
    case 'MONTHLY':
      return 'Aylık Fiyat'
    case 'WEEKLY':
      return 'Haftalık Fiyat'
    case 'DAILY':
    default:
      return 'Günlük Fiyat'
  }
})

const unitPriceValue = computed(() => {
  if (!priceData.value) return 0
  return priceData.value.unitPrice || priceData.value.dailyPrice
})

const durationLabel = computed(() => {
  if (!priceData.value) return ''
  
  switch (props.rentalType) {
    case 'LEASING':
    case 'MONTHLY':
      return `${totalMonths.value} Ay`
    case 'WEEKLY': {
      const weeks = Math.floor(priceData.value.totalDays / 7)
      const days = priceData.value.totalDays % 7
      if (days > 0) {
        return `${weeks} Hafta ${days} Gün`
      }
      return `${weeks} Hafta`
    }
    case 'DAILY':
    default:
      return `${priceData.value.totalDays} Gün`
  }
})

const totalDays = computed(() => {
  if (!props.startDate || !props.endDate) return 0
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)
  const diff = end.getTime() - start.getTime()
  // Math.ceil yerine Math.round kullanarak daha doğru hesaplama
  // Başlangıç günü dahil, bitiş günü hariç olmak üzere
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)))
})

const totalMonths = computed(() => {
  if (!props.startDate || !props.endDate) return 0
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  return Math.max(1, months)
})

async function calculatePrice() {
  if (!canCalculate.value || !props.vehicleId) return

  loading.value = true
  error.value = null

  try {
    const request = {
      vehicleId: props.vehicleId,
      customerId: props.customerId || undefined,
      rentalType: props.rentalType,
      startDate: props.startDate,
      endDate: props.endDate,
      termMonths: props.termMonths,
      kmPackageId: props.kmPackageId
    }

    const response = await pricingApi.calculate(request)
    priceData.value = response
    emit('calculated', response)
  } catch (err) {
    toast.apiError(err, 'Fiyat hesaplanamadı')
    error.value = 'Fiyat hesaplanamadı'
    priceData.value = null
  } finally {
    loading.value = false
  }
}

async function fetchLeasingPlans() {
  if (!isLeasing.value) return
  
  try {
    leasingPlans.value = await leasingApi.getPlans()
  } catch (err) {
    toast.apiError(err, 'Leasing planları yüklenemedi')
    leasingPlans.value = []
  }
}

function selectLeasingPlan(planId: number) {
  selectedLeasingPlanId.value = planId
  emit('leasingPlanSelected', planId)
}

function safeNumber(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue
  const num = Number(value)
  return Number.isNaN(num) ? defaultValue : num
}

function formatCurrency(amount: unknown): string {
  const num = safeNumber(amount)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num)
}

function isDiscountItem(description: string): boolean {
  const lowerDesc = description.toLowerCase()
  return lowerDesc.includes('iskonto') || lowerDesc.includes('indirim') || lowerDesc.includes('discount')
}

function isTotalItem(description: string): boolean {
  const lowerDesc = description.toLowerCase()
  return lowerDesc.includes('toplam') || lowerDesc.includes('total')
}

let calculateTimeout: ReturnType<typeof setTimeout> | null = null

watch([() => props.vehicleId, () => props.startDate, () => props.endDate, () => props.rentalType, () => props.termMonths], () => {
  // Debounce - çoklu tetiklenmeleri önle
  if (calculateTimeout) {
    clearTimeout(calculateTimeout)
  }
  calculateTimeout = setTimeout(() => {
    if (canCalculate.value) {
      calculatePrice()
    }
    if (isLeasing.value) {
      fetchLeasingPlans()
    }
  }, 300)
}, { immediate: true })
</script>

<template>
  <div class="pricing-calculator">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Fiyat hesaplanıyor...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <span>{{ error }}</span>
      <button @click="calculatePrice">Tekrar Dene</button>
    </div>

    <div v-else-if="!canCalculate" class="empty-state">
      <p>Fiyat hesaplamak için araç ve tarih seçin</p>
    </div>

    <template v-else>
      <div v-if="isLeasing && leasingPlans && leasingPlans.length > 0" class="leasing-plans">
        <h4>Leasing Planları</h4>
        <div class="plans-grid">
          <div 
            v-for="plan in leasingPlans" 
            :key="plan.id"
            class="plan-card"
            :class="{ selected: selectedLeasingPlanId === plan.id }"
            @click="selectLeasingPlan(plan.id)"
          >
            <div class="plan-header">
              <span class="plan-term">{{ plan.termMonths }} Ay</span>
              <span class="plan-category">{{ plan.categoryName }}</span>
            </div>
            <div class="plan-price">
              <span class="amount">{{ formatCurrency(plan.monthlyBasePrice) }}</span>
              <span class="unit">/ ay</span>
            </div>
            <div class="plan-details">
              <span>{{ plan.includedKmPerMonth.toLocaleString('tr-TR') }} km/ay dahil</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="priceData" class="price-summary">
        <h4>Fiyat Detayı</h4>
        
        <div class="summary-header">
          <span class="vehicle-name">{{ priceData.vehicleName }}</span>
          <span class="duration">{{ durationLabel }}</span>
        </div>

        <div class="breakdown-list">
          <div class="breakdown-item base">
            <span class="label">{{ unitPriceLabel }}</span>
            <span class="value">{{ formatCurrency(unitPriceValue) }}</span>
          </div>

          <template v-if="priceData.breakdown && priceData.breakdown.length > 0">
            <div class="breakdown-divider"></div>
            <div 
              v-for="(item, index) in priceData.breakdown" 
              :key="index"
              class="breakdown-item"
              :class="{
                'discount': isDiscountItem(item.description),
                'total-row': isTotalItem(item.description)
              }"
            >
              <span class="label">{{ item.description }}</span>
              <span class="value">{{ formatCurrency(item.amount) }}</span>
            </div>
          </template>

          <div class="breakdown-divider"></div>

          <div class="breakdown-item total">
            <span class="label">Toplam</span>
            <span class="value">{{ formatCurrency(priceData.finalTotal) }}</span>
          </div>
        </div>

        <div v-if="priceData.kmPackage" class="km-package-info">
          <h5>KM Paketi</h5>
          <p>
            <strong>{{ priceData.kmPackage.name }}</strong>
            <br>
            {{ priceData.kmPackage.unlimited ? 'Sınırsız KM' : `${priceData.kmPackage.includedKm.toLocaleString('tr-TR')} km dahil` }}
            <br>
            <span v-if="!priceData.kmPackage.unlimited">
              Ek km: {{ formatCurrency(priceData.kmPackage.extraKmPrice) }}/km
            </span>
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pricing-calculator {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.loading-state,
.error-state,
.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--color-text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: var(--color-danger);
}

.error-state button {
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.leasing-plans {
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.leasing-plans h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 16px 0;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.plan-card {
  padding: 16px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.plan-card:hover {
  border-color: var(--color-primary);
}

.plan-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.plan-term {
  font-weight: 600;
  color: var(--color-text);
}

.plan-category {
  font-size: 11px;
  color: var(--color-text-muted);
}

.plan-price {
  margin-bottom: 8px;
}

.plan-price .amount {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.plan-price .unit {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.plan-details {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.price-summary {
  padding: 20px;
}

.price-summary h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 16px 0;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.vehicle-name {
  font-weight: 600;
  color: var(--color-text);
}

.duration {
  font-size: 14px;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  padding: 4px 10px;
  border-radius: 12px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.breakdown-item .label {
  color: var(--color-text-secondary);
}

.breakdown-item .value {
  font-weight: 500;
  color: var(--color-text);
}

.breakdown-item.discount .label,
.breakdown-item.discount .value {
  color: var(--color-success);
}

.breakdown-item.total-row {
  font-weight: 500;
}

.breakdown-item.total-row .label,
.breakdown-item.total-row .value {
  color: var(--color-text);
}

.breakdown-item.total {
  padding-top: 12px;
}

.breakdown-item.total .label {
  font-weight: 600;
  color: var(--color-text);
}

.breakdown-item.total .value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.breakdown-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

.km-package-info {
  margin-top: 20px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.km-package-info h5 {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
  text-transform: uppercase;
}

.km-package-info p {
  font-size: 13px;
  color: var(--color-text);
  margin: 0;
  line-height: 1.5;
}
</style>
