<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { pricingApi, leasingApi } from '@/api'
import { useToast } from '@/composables'
import { formatCurrency } from '@/utils/format'
import { resolveEffectiveIncludedKm, formatIncludedKmDisplay } from '@/utils/km'
import type { PriceCalculationResponse, LeasingPlan } from '@/api'
import type { RentalType } from '@/types'

const toast = useToast()

interface Props {
  vehicleId: number | null
  customerId: number | null
  rentalType: RentalType
  startDate: string
  endDate: string
  openEnded?: boolean
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
  if (!props.vehicleId || !props.startDate) return false
  if (props.openEnded) return true
  return !!props.endDate
})


const unitPriceLabel = computed(() => {
  switch (props.rentalType) {
    case 'LEASING':
    case 'MONTHLY':
    case 'SERVICE':
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

const kmPackageDisplayLabel = computed(() => {
  const pkg = priceData.value?.kmPackage
  if (!pkg || pkg.unlimited) return ''
  const totalDays = priceData.value?.totalDays ?? 0
  const totalKm = resolveEffectiveIncludedKm({
    perPeriodKm: pkg.includedKm,
    totalIncludedKm: pkg.totalIncludedKm,
    rentalType: props.rentalType,
    totalDays,
  })
  const perPeriodLabel = formatIncludedKmDisplay(props.rentalType, pkg.includedKm, 0)
  return `${totalKm.toLocaleString('tr-TR')} km dahil (${perPeriodLabel})`
})

const durationLabel = computed(() => {
  if (props.openEnded) return 'Belirsiz süre'
  if (!priceData.value) return ''
  
  switch (props.rentalType) {
    case 'LEASING':
    case 'MONTHLY':
    case 'SERVICE':
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


function isDiscountItem(description: string): boolean {
  const lowerDesc = description.toLowerCase()
  return lowerDesc.includes('iskonto') || lowerDesc.includes('indirim') || lowerDesc.includes('discount')
}

function isTotalItem(description: string): boolean {
  const lowerDesc = description.toLowerCase()
  return lowerDesc.includes('toplam') || lowerDesc.includes('total')
}

let calculateTimeout: ReturnType<typeof setTimeout> | null = null

watch([() => props.vehicleId, () => props.startDate, () => props.endDate, () => props.rentalType, () => props.termMonths, () => props.kmPackageId], () => {

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
  <div class="pricing-calculator rcr-pricing-calc">
    <div v-if="openEnded" class="rc-alert rc-alert--info" style="margin-bottom: 12px">
      <span>Açık uçlu kiralamada gösterilen birim fiyat referans içindir; genel toplam iade sırasında hesaplanır.</span>
    </div>
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
            <span v-if="openEnded" class="value">İade sırasında</span>
            <span v-else class="value">{{ formatCurrency(priceData.finalTotal) }}</span>
          </div>
        </div>

        <div v-if="priceData.kmPackage" class="km-package-info">
          <h5>KM Paketi</h5>
          <p>
            <strong>{{ priceData.kmPackage.name }}</strong>
            <br>
            {{ priceData.kmPackage.unlimited ? 'Sınırsız KM' : kmPackageDisplayLabel }}
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

