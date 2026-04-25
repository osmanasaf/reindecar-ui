<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { rentalsApi, branchesApi, kmPackagesApi, rentalExtraItemApi } from '@/api'
import { useToast, useValidation, rules } from '@/composables'
import { SearchableSelect } from '@/components/common'
import { formatCurrency } from '@/utils/format'
import { RentalType, CustomerType } from '@/types'
import type { Customer, CreateRentalForm, RentalExtraItem, Branch, KmPackage, Vehicle } from '@/types'
import type { PriceCalculationResponse } from '@/api'
import VehicleSelector from '@/components/rentals/VehicleSelector.vue'
import CustomerSelector from '@/components/rentals/CustomerSelector.vue'
import DriverSelector from '@/components/rentals/DriverSelector.vue'
import PricingCalculator from '@/components/rentals/PricingCalculator.vue'
import QuickCustomerModal from '@/components/customers/QuickCustomerModal.vue'
import RentalTypeSelector from '@/components/rentals/RentalTypeSelector.vue'
import TermSelector from '@/components/rentals/TermSelector.vue'
import ExtraItemsManager from '@/components/rentals/ExtraItemsManager.vue'
import DatePicker from '@/components/base/DatePicker.vue'

const router = useRouter()
const toast = useToast()

const currentStep = ref(1)
const totalSteps = 7
const submitting = ref(false)
const branches = ref<Branch[]>([])
const kmPackages = ref<KmPackage[]>([])

const rentalType = ref<RentalType>(RentalType.DAILY)
const selectedVehicleId = ref<number | null>(null)
const selectedCustomerId = ref<number | null>(null)
const selectedVehicleCategoryId = ref<number | null>(null)
const selectedDriverIds = ref<number[]>([])
const primaryDriverId = ref<number | null>(null)
const startDate = ref('')
const endDate = ref('')
const selectedTermMonths = ref<number>(12)
const selectedLeasingPlanId = ref<number | null>(null)
const selectedKmPackageId = ref<number | null>(null)
const customIncludedKm = ref<number | null>(null)
const customExtraKmPrice = ref<number | null>(null)
const extraItems = ref<RentalExtraItem[]>([])
const extraItemsTotal = ref(0)
const discountAmount = ref(0)
const discountReason = ref('')
const priceData = ref<PriceCalculationResponse | null>(null)
const showQuickCustomerModal = ref(false)
const selectedBranchId = ref<number | null>(null)
const selectedReturnBranchId = ref<number | null>(null)

const branchOptions = computed(() => branches.value.map(b => ({ value: b.id as number, label: b.name })))

/** Bitiş takviminde başlangıçla aynı gün seçilemesin: min = başlangıç + 1 gün */
function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const endDatePickerMin = computed(() => (startDate.value ? addDaysYmd(startDate.value, 1) : undefined))

watch(startDate, (newStart) => {
  if (!newStart || !endDate.value) return
  const minEnd = addDaysYmd(newStart, 1)
  if (endDate.value < minEnd) {
    endDate.value = ''
  }
})

const rentalDateFields = computed(() => ({
  startDate: { value: startDate.value, rules: [rules.required('Başlangıç tarihi seçiniz')] },
  endDate: {
    value: endDate.value,
    rules: [
      rules.required('Bitiş tarihi seçiniz'),
      rules.dateAfter(startDate, 'Bitiş tarihi başlangıçtan sonra olmalıdır')
    ]
  }
}))
const { getError, hasError, touch } = useValidation(() => rentalDateFields.value)

const rentalTypes: { value: RentalType; label: string; description: string; minDays?: number }[] = [
  { value: RentalType.DAILY, label: 'Günlük Kiralama', description: '1-30 gün arası kısa süreli kiralama' },
  { value: RentalType.WEEKLY, label: 'Haftalık Kiralama', description: '7+ gün avantajlı fiyatlandırma' },
  { value: RentalType.MONTHLY, label: 'Aylık Kiralama', description: '1-12 ay arası orta süreli kiralama' },
  { value: RentalType.LEASING, label: 'Uzun Dönem Leasing', description: '12+ ay uzun dönem anlaşma', minDays: 365 }
]

async function fetchBranches() {
  try {
    branches.value = await branchesApi.getActive()
    if (branches.value && branches.value.length > 0) {
      const firstBranch = branches.value[0]
      if (firstBranch) {
        selectedBranchId.value = firstBranch.id
        selectedReturnBranchId.value = firstBranch.id
      }
    } else {
      toast.error('Aktif şube bulunamadı')
    }
  } catch (error) {
    toast.error('Şubeler yüklenemedi')
  }
}

const stepTitles = computed(() => {
  return ['Tip', 'Tarih', 'Araç', 'Müşteri', 'KM Paketi', 'Ek Kalemler', 'Özet']
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1: return !!rentalType.value
    case 2: return !!startDate.value && !!endDate.value && validateDates()
    case 3: return !!selectedVehicleId.value
    case 4:
      return !!selectedCustomerId.value &&
        selectedDriverIds.value.length > 0 &&
        !!primaryDriverId.value &&
        selectedDriverIds.value.includes(primaryDriverId.value)
    case 5: return kmPackages.value.length === 0 || !!selectedKmPackageId.value
    case 6: return true
    case 7: return true
    default: return false
  }
})

const isLastStep = computed(() => currentStep.value === totalSteps)

const isLeasing = computed(() => rentalType.value === RentalType.LEASING)

function validateDates(): boolean {
  if (!startDate.value || !endDate.value) return false
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  if (end <= start) return false
  
  if (rentalType.value === RentalType.LEASING) {
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 365) return false
  }
  
  return true
}

function nextStep() {
  if (currentStep.value < totalSteps && canProceed.value) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function goToStep(step: number) {
  if (step <= currentStep.value || canGoToStep(step)) {
    currentStep.value = step
  }
}

function canGoToStep(step: number): boolean {
  for (let i = 1; i < step; i++) {
    if (!isStepComplete(i)) return false
  }
  return true
}

function isStepComplete(step: number): boolean {
  switch (step) {
    case 1: return !!rentalType.value
    case 2: return !!startDate.value && !!endDate.value && validateDates()
    case 3: return !!selectedVehicleId.value
    case 4:
      return !!selectedCustomerId.value &&
        selectedDriverIds.value.length > 0 &&
        !!primaryDriverId.value &&
        selectedDriverIds.value.includes(primaryDriverId.value)
    case 5: return kmPackages.value.length === 0 || !!selectedKmPackageId.value
    case 6: return true
    case 7: return true
    default: return false
  }
}

function handlePriceCalculated(response: PriceCalculationResponse) {
  priceData.value = response
}

function handleLeasingPlanSelected(planId: number) {
  selectedLeasingPlanId.value = planId
}

function handleVehicleSelected(vehicleId: number, categoryId: number, vehicle?: Vehicle) {
  selectedVehicleId.value = vehicleId
  selectedVehicleCategoryId.value = categoryId
  
  if (vehicle && vehicle.branchId) {
    selectedBranchId.value = vehicle.branchId
    selectedReturnBranchId.value = vehicle.branchId
    toast.info('Teslim ve iade şubesi aracın bulunduğu şube olarak ayarlandı')
  }
}

function handleExtraItemsTotal(total: number) {
  extraItemsTotal.value = total
}

function handleCustomerCreated(customer: Customer) {
  selectedCustomerId.value = customer.id
  showQuickCustomerModal.value = false
}

const totalDays = computed(() => {
  if (!startDate.value || !endDate.value) return 0
  return Math.ceil((new Date(endDate.value).getTime() - new Date(startDate.value).getTime()) / (1000 * 60 * 60 * 24))
})

const selectedKmPackage = computed(() => {
  if (!selectedKmPackageId.value) return null
  return kmPackages.value.find(pkg => pkg.id === selectedKmPackageId.value) || null
})

const baseTotal = computed(() => priceData.value?.finalTotal || 0)

/** Ek kalem toplamı: hem @total-changed ile gelen değer hem de extraItems listesinden hesaplanan değer kullanılır; özet her zaman listeye göre hesaplansın diye listeyi kullanıyoruz. */
const effectiveTermMonths = computed(() => (isLeasing.value ? selectedTermMonths.value : 1))
function calcExtraItemTotal(item: RentalExtraItem): number {
  switch (item.calculationType) {
    case 'PER_MONTH':
      return item.amount * effectiveTermMonths.value
    case 'FIXED':
    case 'PERCENTAGE':
    default:
      return item.amount
  }
}
const extraItemsTotalComputed = computed(() =>
  extraItems.value.reduce((sum, item) => sum + calcExtraItemTotal(item), 0)
)

const subtotalWithExtras = computed(() => baseTotal.value + extraItemsTotalComputed.value)
const rawDiscount = computed(() => Math.max(0, discountAmount.value || 0))
const appliedDiscountAmount = computed(() => Math.min(rawDiscount.value, subtotalWithExtras.value))
const finalTotalWithDiscount = computed(() => Math.max(0, subtotalWithExtras.value - appliedDiscountAmount.value))

async function fetchKmPackages() {
  try {
    const byTypePackages = await kmPackagesApi.getByRentalType(rentalType.value)

    if (!selectedVehicleCategoryId.value) {
      kmPackages.value = byTypePackages
    } else {
      const availableForCategory = await kmPackagesApi.getAvailableForCategory(selectedVehicleCategoryId.value)
      const byTypeIds = new Set(byTypePackages.map(pkg => pkg.id))
      kmPackages.value = availableForCategory.filter(pkg =>
        byTypeIds.has(pkg.id) || pkg.applicableTypes.includes(rentalType.value)
      )
    }

    if (!kmPackages.value || kmPackages.value.length === 0) {
      selectedKmPackageId.value = null
      return
    }

    const hasSelection = kmPackages.value.some(pkg => pkg.id === selectedKmPackageId.value)
    if (!hasSelection) {
      selectedKmPackageId.value = kmPackages.value[0]?.id ?? null
    }
  } catch (err) {
    toast.apiError(err, 'KM paketleri yüklenemedi')
    kmPackages.value = []
    selectedKmPackageId.value = null
  }
}


async function handleSubmit() {
  if (!canProceed.value || !selectedVehicleId.value || !selectedCustomerId.value) return
  if (selectedDriverIds.value.length === 0 || !primaryDriverId.value) {
    toast.error('Lütfen en az bir sürücü ve ana sürücü seçiniz')
    return
  }

  if (!selectedBranchId.value) {
    toast.error('Lütfen teslim şubesi seçiniz')
    return
  }

  submitting.value = true
  try {
    const payload: CreateRentalForm = {
      rentalType: rentalType.value,
      vehicleId: selectedVehicleId.value,
      customerId: selectedCustomerId.value,
      customerType: CustomerType.PERSONAL,
      driverIds: selectedDriverIds.value.length > 0 ? selectedDriverIds.value : undefined,
      primaryDriverId: primaryDriverId.value || undefined,
      branchId: selectedBranchId.value,
      returnBranchId: selectedReturnBranchId.value || selectedBranchId.value,
      startDate: startDate.value,
      endDate: endDate.value,
      termMonths: rentalType.value === RentalType.LEASING ? selectedTermMonths.value : undefined,
      kmPackageId: selectedKmPackageId.value || undefined,
      customIncludedKm: customIncludedKm.value && customIncludedKm.value > 0 ? customIncludedKm.value : undefined,
      customExtraKmPrice: customExtraKmPrice.value && customExtraKmPrice.value > 0 ? customExtraKmPrice.value : undefined,
      discountAmount: appliedDiscountAmount.value > 0 ? appliedDiscountAmount.value : undefined,
      totalAmount: baseTotal.value
    }

    const rental = await rentalsApi.create(payload)

    if (extraItems.value.length > 0) {
      try {
        await Promise.all(
          extraItems.value.map(item =>
            rentalExtraItemApi.add(rental.id, {
              itemTypeId: item.itemTypeId ?? undefined,
              customName: item.itemTypeId ? undefined : item.name,
              description: item.description ?? undefined,
              amount: item.amount,
              currency: item.currency,
              calculationType: item.calculationType
            })
          )
        )
      } catch (extraItemErr) {
        toast.apiError(extraItemErr, 'Kiralama oluştu ancak ek kalemler kaydedilemedi')
      }
    }

    toast.success(`Kiralama #${rental.rentalNumber} başarıyla oluşturuldu`)
    router.push(`/rentals/${rental.id}`)
  } catch (err) {
    toast.apiError(err, 'Kiralama oluşturulamadı')
  } finally {
    submitting.value = false
  }
}

watch(rentalType, () => {
  if (currentStep.value > 1) {
    selectedVehicleId.value = null
    selectedCustomerId.value = null
    selectedVehicleCategoryId.value = null
    selectedDriverIds.value = []
    primaryDriverId.value = null
    startDate.value = ''
    endDate.value = ''
    selectedLeasingPlanId.value = null
  }

  selectedKmPackageId.value = null
  customIncludedKm.value = null
  customExtraKmPrice.value = null
  kmPackages.value = []
  extraItems.value = []
  extraItemsTotal.value = 0
  discountAmount.value = 0
  discountReason.value = ''
  priceData.value = null
  fetchKmPackages()
}, { immediate: true })

watch(selectedVehicleCategoryId, () => {
  fetchKmPackages()
})

watch(selectedVehicleId, (newId) => {
  if (!newId) {
    selectedVehicleCategoryId.value = null
  }
})

onMounted(() => {
  fetchBranches()
})
</script>

<template>
  <div class="rental-create">
    <header class="page-header">
      <button class="back-btn" @click="router.back()">← Geri</button>
      <h1>Yeni Kiralama</h1>
    </header>

    <div class="wizard">
      <div class="wizard-steps">
        <div 
          v-for="(title, index) in stepTitles" 
          :key="index"
          :class="['step', { 
            active: currentStep === index + 1, 
            completed: currentStep > index + 1,
            clickable: canGoToStep(index + 1) 
          }]"
          @click="goToStep(index + 1)"
        >
          <span class="step-number">{{ index + 1 }}</span>
          <span class="step-label">{{ title }}</span>
        </div>
      </div>

      <div class="wizard-content">
        <div v-if="currentStep === 1" key="step-1" class="step-content">
          <h2>Kiralama Tipini Seçin</h2>
          <RentalTypeSelector v-model="rentalType" />
        </div>

        <div v-else-if="currentStep === 2" key="step-2" class="step-content">
          <h2>Tarih ve Süre Seçin</h2>
            
            <div class="date-section-full">
              <div class="form-grid">
                <div class="form-group" :class="{ error: hasError('startDate') }">
                  <DatePicker
                    v-model="startDate"
                    label="Başlangıç Tarihi"
                    placeholder="Başlangıç tarihi"
                    @closed="touch('startDate')"
                  />
                  <span class="error-text">{{ getError('startDate') }}</span>
                </div>
                <div class="form-group" :class="{ error: hasError('endDate') }">
                  <DatePicker
                    v-model="endDate"
                    label="Bitiş Tarihi"
                    :min="endDatePickerMin"
                    placeholder="Bitiş tarihi"
                    @closed="touch('endDate')"
                  />
                  <span class="error-text">{{ getError('endDate') }}</span>
                </div>
              </div>

              <p class="date-hint">Geçmişe dönük kiralamaları da kayıt edebilirsiniz; takvimde bugünden önceki tarihler seçilebilir. Bitiş, başlangıçtan en az bir gün sonra olmalıdır.</p>

              <div v-if="isLeasing" class="leasing-notice">
                <span class="notice-icon">ℹ️</span>
                <p>Leasing için minimum süre <strong>12 ay (365 gün)</strong> olmalıdır.</p>
              </div>

              <div v-if="startDate && endDate && validateDates()" class="date-summary">
                <div class="summary-item">
                  <span class="label">Toplam Süre</span>
                  <span class="value">
                    {{ isLeasing ? `${selectedTermMonths} Ay` : `${totalDays} Gün` }}
                  </span>
                </div>
              </div>

            </div>
        </div>

        <div v-else-if="currentStep === 3" key="step-3" class="step-content">
          <h2>Araç Seçin</h2>
          <p class="step-description">
            {{ startDate }} - {{ endDate }} tarihleri arasında müsait araçlar listeleniyor.
          </p>
          <VehicleSelector
            v-model="selectedVehicleId"
            :start-date="startDate"
            :end-date="endDate"
            :rental-type="rentalType"
            @vehicle-selected="handleVehicleSelected"
          />
        </div>

        <div v-else-if="currentStep === 4" key="step-4" class="step-content">
          <h2>Müşteri ve Sürücü Seçin</h2>
          <CustomerSelector
            v-model="selectedCustomerId"
            :rental-end-date="endDate"
            @open-quick-create="showQuickCustomerModal = true"
          />

          <div v-if="selectedCustomerId" class="driver-section">
            <h3>Sürücüler</h3>
            <p class="section-description">
              Kiralama için sürücü seçin. Birden fazla sürücü ekleyebilirsiniz.
            </p>
            <DriverSelector
              v-model="selectedDriverIds"
              v-model:primary-driver-id="primaryDriverId"
              :customer-id="selectedCustomerId"
              :rental-end-date="endDate"
            />
          </div>
        </div>

        <div v-else-if="currentStep === 5" key="step-5" class="step-content">
          <h2>KM Paketi ve Vade</h2>
          <p class="step-description">
            Araca uygun KM paketini seçin. Bu adım opsiyoneldir.
          </p>

          <div v-if="isLeasing && selectedVehicleCategoryId" class="term-section">
            <h3>Vade Süresi</h3>
            <TermSelector
              v-model="selectedTermMonths"
              :category-id="selectedVehicleCategoryId"
            />
          </div>

          <div v-if="isLeasing && !selectedVehicleCategoryId" class="term-notice">
            <span>ℹ️</span>
            <p>Vade seçimi için önce araç kategorisi belirlenmelidir.</p>
          </div>

          <div v-if="kmPackages.length > 0" class="km-package-section">
            <h3>KM Paketi Seçimi</h3>
            <div class="package-grid">
              <div
                v-for="pkg in kmPackages"
                :key="pkg.id"
                :class="['package-card', { selected: selectedKmPackageId === pkg.id }]"
                @click="selectedKmPackageId = pkg.id"
              >
                <div class="package-header">
                  <h4>{{ pkg.name }}</h4>
                  <span v-if="selectedKmPackageId === pkg.id" class="check-icon">✓</span>
                </div>
                <div class="package-body">
                  <div class="package-km">
                    <span class="km-value">{{ pkg.includedKm?.toLocaleString('tr-TR') }}</span>
                    <span class="km-label">KM</span>
                  </div>
                  <div class="package-price">
                    <span class="price-label">Fazla KM:</span>
                    <span class="price-value">{{ formatCurrency(pkg.extraKmPrice) }}/KM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="km-override-section">
            <h3>KM Override (Opsiyonel)</h3>
            <p class="section-description">
              Bu alanlar doldurulursa seçilen paketin dahili km ve fazla km ücreti override edilir.
            </p>
            <div class="form-grid">
              <div class="form-group">
                <label>Özel Dahil KM</label>
                <input
                  v-model.number="customIncludedKm"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Örn: 7500"
                />
              </div>
              <div class="form-group">
                <label>Özel Fazla KM Ücreti (₺)</label>
                <input
                  v-model.number="customExtraKmPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Örn: 0.75"
                />
              </div>
            </div>
          </div>

          <div v-if="kmPackages.length === 0" class="skip-notice">
            <span>ℹ️</span>
            <p>Bu kiralama tipi için aktif KM paketi bulunamadı. Paketsiz devam edebilirsiniz.</p>
          </div>
        </div>

        <div v-else-if="currentStep === 6" key="step-6" class="step-content">
          <h2>Ek Kalemler</h2>
          <p class="step-description">
            Kiralamaya bakım, sigorta veya diğer ek kalemleri ekleyebilirsiniz. Bu adım opsiyoneldir.
          </p>

          <ExtraItemsManager
            v-model="extraItems"
            :term-months="isLeasing ? selectedTermMonths : 1"
            @total-changed="handleExtraItemsTotal"
          />

          <div v-if="extraItems.length === 0" class="skip-notice">
            <span>💡</span>
            <p>Ek kalem eklemeden devam edebilirsiniz.</p>
          </div>
        </div>

        <div v-else-if="currentStep === 7" key="step-7" class="step-content">
          <h2>Kiralama Özeti</h2>

          <div class="summary-grid">
            <div class="summary-card">
              <h4>Kiralama Detayları</h4>
              <div class="summary-row">
                <span>Kiralama Tipi</span>
                <strong>{{ rentalTypes.find(t => t.value === rentalType)?.label }}</strong>
              </div>
              <div class="summary-row">
                <span>Başlangıç</span>
                <strong>{{ startDate }}</strong>
              </div>
              <div class="summary-row">
                <span>Bitiş</span>
                <strong>{{ endDate }}</strong>
              </div>
              <div class="summary-row">
                <span>Toplam Süre</span>
                <strong>
                  {{ isLeasing ? `${selectedTermMonths} Ay` : `${totalDays} Gün` }}
                </strong>
              </div>
              <div class="summary-row">
                <span>KM Paketi</span>
                <strong>{{ selectedKmPackage?.name || 'Seçilmedi' }}</strong>
              </div>
              <div v-if="customIncludedKm && customIncludedKm > 0" class="summary-row">
                <span>Özel Dahil KM</span>
                <strong>{{ customIncludedKm.toLocaleString('tr-TR') }} KM</strong>
              </div>
              <div v-if="customExtraKmPrice && customExtraKmPrice > 0" class="summary-row">
                <span>Özel Fazla KM</span>
                <strong>{{ formatCurrency(customExtraKmPrice) }}/KM</strong>
              </div>
              <div class="summary-section summary-section--branches">
                <h5 class="summary-section-title">Şubeler</h5>
                <div class="branch-fields">
                  <div class="branch-field">
                    <label class="branch-label">Teslim Şubesi</label>
                    <SearchableSelect
                      v-model="selectedBranchId"
                      :options="branchOptions"
                      placeholder="Şube seçiniz"
                      search-placeholder="Şube ara..."
                      class="branch-select-searchable"
                    />
                  </div>
                  <div class="branch-field">
                    <label class="branch-label">İade Şubesi</label>
                    <SearchableSelect
                      v-model="selectedReturnBranchId"
                      :options="branchOptions"
                      placeholder="Şube seçiniz"
                      search-placeholder="Şube ara..."
                      class="branch-select-searchable"
                    />
                  </div>
                </div>
              </div>
              <div v-if="extraItems.length > 0" class="summary-row">
                <span>Ek Kalemler</span>
                <strong>{{ extraItems.length }} kalem</strong>
              </div>
            </div>

            <div class="summary-card pricing-card">
              <h4>Fiyat Bilgisi</h4>
              <PricingCalculator
                v-if="selectedVehicleId && selectedCustomerId"
                :vehicle-id="selectedVehicleId"
                :customer-id="selectedCustomerId"
                :rental-type="rentalType"
                :start-date="startDate"
                :end-date="endDate"
                :term-months="isLeasing ? selectedTermMonths : undefined"
                :km-package-id="selectedKmPackageId || undefined"
                @calculated="handlePriceCalculated"
                @leasing-plan-selected="handleLeasingPlanSelected"
              />

              <div class="discount-editor">
                <h5>İndirim (Opsiyonel)</h5>
                <div class="form-grid">
                  <div class="form-group">
                    <label>İndirim Tutarı (₺)</label>
                    <input
                      v-model.number="discountAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <div class="form-group">
                    <label>İndirim Sebebi</label>
                    <input
                      v-model="discountReason"
                      type="text"
                      placeholder="Örn: Sadık müşteri indirimi"
                      :disabled="discountAmount <= 0"
                    />
                  </div>
                </div>
              </div>

              <div class="extra-items-summary">
                <div class="summary-row">
                  <span>Temel Tutar</span>
                  <strong>{{ formatCurrency(baseTotal) }}</strong>
                </div>
                <div class="summary-row">
                  <span>Ek Kalemler</span>
                  <strong>{{ formatCurrency(extraItemsTotalComputed) }}</strong>
                </div>
                <div v-if="appliedDiscountAmount > 0" class="summary-row">
                  <span>İndirim</span>
                  <strong class="discount-value">-{{ formatCurrency(appliedDiscountAmount) }}</strong>
                </div>
                <div class="summary-row total">
                  <span>Genel Toplam</span>
                  <strong>{{ formatCurrency(finalTotalWithDiscount) }}</strong>
                </div>
                <div v-if="discountReason && appliedDiscountAmount > 0" class="discount-reason">
                  {{ discountReason }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="wizard-footer">
        <button 
          v-if="currentStep > 1" 
          class="btn btn-outline"
          @click="prevStep"
        >
          ← Geri
        </button>
        <div class="spacer"></div>
        <button 
          v-if="!isLastStep"
          class="btn btn-primary"
          :disabled="!canProceed"
          @click="nextStep"
        >
          İleri →
        </button>
        <button 
          v-if="isLastStep"
          class="btn btn-success"
          :disabled="!canProceed || submitting"
          @click="handleSubmit"
        >
          {{ submitting ? 'Oluşturuluyor...' : '✓ Kiralama Oluştur' }}
        </button>
      </div>
    </div>

    <QuickCustomerModal
      :visible="showQuickCustomerModal"
      :rental-end-date="endDate"
      @close="showQuickCustomerModal = false"
      @created="handleCustomerCreated"
    />
  </div>
</template>

<style scoped>
.rental-create {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 12px;
  display: block;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.wizard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
}

.wizard-steps {
  display: flex;
  background: var(--color-bg-secondary);
  padding: 20px;
  gap: 12px;
  overflow-x: auto;
}

.step {
  flex: 1;
  min-width: 100px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--color-surface);
  opacity: 0.5;
  transition: all 0.2s;
}

.step.clickable {
  cursor: pointer;
}

.step.clickable:hover {
  opacity: 0.8;
}

.step.active {
  opacity: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.step.completed {
  opacity: 0.7;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.step.active .step-number {
  background: var(--color-primary);
  color: white;
}

.step.completed .step-number {
  background: var(--color-success);
  color: white;
}

.step-label {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.wizard-content {
  padding: 32px;
  min-height: 400px;
}

.step-content h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 24px 0;
}

.step-description {
  color: var(--color-text-secondary);
  margin: -16px 0 24px 0;
  font-size: 14px;
}

.type-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-option {
  padding: 20px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 16px;
}

.type-option:hover {
  border-color: var(--color-primary);
}

.type-option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.type-content {
  flex: 1;
}

.type-content strong {
  display: block;
  font-size: 16px;
  margin-bottom: 4px;
}

.type-content span {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.check-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.date-section-full {
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.date-summary {
  background: var(--color-success-light);
  padding: 16px;
  border-radius: 10px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-item .label {
  color: var(--color-text-secondary);
}

.summary-item .value {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-success);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.summary-card {
  background: var(--color-bg-secondary);
  border-radius: 12px;
  padding: 20px;
}

.summary-card h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.summary-row span {
  color: var(--color-text-secondary);
}

.summary-section {
  margin-top: 12px;
}

.summary-section:first-of-type {
  margin-top: 0;
}

.summary-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
}

.summary-section--branches .branch-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  width: 100%;
  max-width: 100%;
}

.branch-selector-inline {
  flex: 1;
  text-align: right;
}

.branch-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.branch-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.branch-field :deep(.branch-select-searchable) {
  min-width: 0;
}

.branch-select {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  min-width: 200px;
}

.branch-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.date-price-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.date-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.form-group.error input {
  border-color: var(--color-danger);
}

.error-text {
  font-size: 12px;
  color: var(--color-danger);
  min-height: 16px;
}

.date-hint {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.45;
}

.leasing-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--color-info-light);
  border-radius: 10px;
}

.notice-icon {
  font-size: 20px;
}

.leasing-notice p {
  margin: 0;
  font-size: 14px;
  color: var(--color-info);
}

.price-section {
  position: sticky;
  top: 20px;
}

.wizard-footer {
  display: flex;
  padding: 20px 32px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.spacer {
  flex: 1;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary { background: var(--color-primary); color: white; }
.btn-success { background: var(--color-success); color: white; }
.btn-outline { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }

.btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn-success:hover:not(:disabled) { background: #059669; }
.btn-outline:hover:not(:disabled) { background: var(--color-bg-secondary); }

.term-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.term-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--color-text);
}

.term-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--color-info-light);
  border-radius: 10px;
  margin-top: 20px;
  font-size: 14px;
  color: var(--color-info);
}

.term-notice span {
  font-size: 20px;
}

.term-notice p {
  margin: 0;
}

.driver-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--color-border);
}

.driver-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.section-description {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0 0 20px 0;
}

.km-package-section {
  margin-top: 20px;
}

.km-package-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.km-override-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.km-override-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.package-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.package-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s;
}

.package-card:hover {
  border-color: var(--color-primary);
}

.package-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.package-header h4 {
  margin: 0;
  font-size: 14px;
}

.package-km {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 6px;
}

.km-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.km-label,
.price-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.price-value {
  font-size: 13px;
  font-weight: 500;
}

.discount-editor {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.discount-editor h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.discount-value {
  color: var(--color-success);
}

.discount-reason {
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.skip-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  margin-top: 20px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.skip-notice span {
  font-size: 20px;
}

.skip-notice p {
  margin: 0;
}

.extra-items-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.extra-items-summary .summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.extra-items-summary .summary-row span {
  color: var(--color-text-secondary);
}

.extra-items-summary .summary-row.total {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);
}

.extra-items-summary .summary-row.total strong {
  font-size: 18px;
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .rental-create {
    max-width: 100%;
  }

  .page-header {
    margin-bottom: 20px;
  }

  .date-price-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-section--branches .branch-fields {
    grid-template-columns: 1fr;
    max-width: none;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }

  .date-section-full {
    max-width: none;
  }

  .wizard {
    border-radius: 12px;
  }
  
  .wizard-steps {
    padding: 12px;
    gap: 8px;
  }
  
  .step {
    padding: 10px 12px;
    min-width: 64px;
    justify-content: center;
  }
  
  .step-label {
    display: none;
  }

  .wizard-content {
    padding: 20px 16px;
    min-height: auto;
  }

  .wizard-footer {
    padding: 16px;
    flex-direction: column;
    gap: 12px;
  }

  .spacer {
    display: none;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .summary-card,
  .date-summary,
  .leasing-notice,
  .term-notice,
  .skip-notice {
    padding: 16px;
  }

  .summary-row,
  .extra-items-summary .summary-row,
  .summary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .package-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .wizard-steps {
    gap: 6px;
  }

  .step {
    min-width: 52px;
    padding: 8px;
  }

  .step-number {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .step-content h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }
}
</style>
