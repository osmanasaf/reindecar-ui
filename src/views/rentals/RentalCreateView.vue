<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { rentalsApi, branchesApi, kmPackagesApi, rentalExtraItemApi, customersApi } from '@/api'
import { useToast, useValidation, rules } from '@/composables'
import { SearchableSelect } from '@/components/common'
import { RcIcon } from '@/components/icons'
import { RcButton, RcKbd, RcStepper, RcPageHeader, RcField } from '@/components/rc'
import { formatCurrency } from '@/utils/format'
import { formatIncludedKmDisplay } from '@/utils/km'
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
import RentalCreateSummaryCard from '@/components/rentals/RentalCreateSummaryCard.vue'
import DatePicker from '@/components/base/DatePicker.vue'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const currentStep = ref(1)
const submitting = ref(false)
const createdRentalId = ref<number | null>(null)
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
const selectedVehicleLabel = ref('')
const selectedCustomerLabel = ref('')

const wizardSteps = computed(() => {
  const steps = [
    { id: 1, label: 'Tip' },
    { id: 2, label: 'Tarih' },
    { id: 3, label: 'Araç' },
    { id: 4, label: 'Müşteri' },
    { id: 5, label: 'KM paketi' },
    { id: 6, label: 'Ek kalemler' },
    { id: 7, label: 'Onay' },
  ] as const
  if (isService.value) {
    return [...steps, { id: 8, label: 'Belgeler' }]
  }
  return [...steps]
})

const totalSteps = computed(() => wizardSteps.value.length)

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
  { value: RentalType.LEASING, label: 'Uzun Dönem Leasing', description: '12+ ay uzun dönem anlaşma', minDays: 365 },
  { value: RentalType.SERVICE, label: 'Servis Kiralama', description: 'Minibüs / personel taşıma servisi', minDays: 30 }
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


const currentStepLabel = computed(() => wizardSteps.value.find((s) => s.id === currentStep.value)?.label ?? '')

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
    case 8: return !!createdRentalId.value
    default: return false
  }
})

const isLastStep = computed(() => currentStep.value === totalSteps.value)

const isLeasing = computed(() => rentalType.value === RentalType.LEASING)
const isService = computed(() => rentalType.value === RentalType.SERVICE)

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
  if (currentStep.value === 7 && isService.value) {
    void handleSubmit()
    return
  }
  if (currentStep.value < totalSteps.value && canProceed.value) {
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
    case 8: return !!createdRentalId.value
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
  selectedVehicleLabel.value = vehicle
    ? `${vehicle.plateNumber} · ${vehicle.brand} ${vehicle.model}`
    : ''

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
  selectedCustomerLabel.value = customer.displayName
  showQuickCustomerModal.value = false
}

async function loadCustomerLabel(id: number) {
  try {
    const c = await customersApi.getById(id)
    selectedCustomerLabel.value = c.displayName
  } catch {
    selectedCustomerLabel.value = ''
  }
}

watch(selectedCustomerId, (id) => {
  if (id) loadCustomerLabel(id)
  else selectedCustomerLabel.value = ''
})

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
  if (isService.value && currentStep.value === 8 && createdRentalId.value) {
    router.push(`/rentals/${createdRentalId.value}`)
    return
  }

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

    if (isService.value) {
      createdRentalId.value = rental.id
      currentStep.value = 8
      return
    }

    router.push(`/rentals/${rental.id}`)
  } catch (err) {
    toast.apiError(err, 'Kiralama oluşturulamadı')
  } finally {
    submitting.value = false
  }
}

watch(rentalType, () => {
  createdRentalId.value = null
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
  const qType = route.query.type
  if (qType === 'SERVICE' || qType === RentalType.SERVICE) {
    rentalType.value = RentalType.SERVICE
  }
  const qCustomer = route.query.customerId
  if (qCustomer) {
    const id = Number(qCustomer)
    if (!Number.isNaN(id)) {
      selectedCustomerId.value = id
      loadCustomerLabel(id)
    }
  }
  window.addEventListener('keydown', onWizardKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWizardKeydown)
})

function onWizardKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
  const target = e.target as HTMLElement | null
  if (target?.matches('textarea, button, [contenteditable="true"]')) return
  if (showQuickCustomerModal.value) return
  if (isLastStep.value) {
    if (canProceed.value && !submitting.value) {
      e.preventDefault()
      handleSubmit()
    }
    return
  }
  if (canProceed.value) {
    e.preventDefault()
    nextStep()
  }
}
</script>

<template>
  <div class="rc-page rcr-create">
    <RcPageHeader
      title="Yeni kiralama"
      :subtitle="`Adım ${currentStep}/${totalSteps} · ${currentStepLabel}`"
    >
      <template #actions>
        <RouterLink to="/rentals" class="rc-btn rc-btn--ghost rc-btn--sm">
          <RcIcon name="chevronLeft" :size="14" />
          Vazgeç
        </RouterLink>
        <RcButton v-if="currentStep > 1" variant="secondary" size="sm" @click="prevStep">
          <RcIcon name="chevronLeft" :size="14" />
          Geri
        </RcButton>
        <RcButton
          v-if="!isLastStep && !(currentStep === 7 && isService)"
          variant="accent"
          size="sm"
          :disabled="!canProceed"
          @click="nextStep"
        >
          Devam et
          <RcKbd>↵</RcKbd>
        </RcButton>
        <RcButton
          v-else-if="currentStep === 7 && isService"
          variant="accent"
          size="sm"
          :disabled="!canProceed"
          :loading="submitting"
          @click="handleSubmit"
        >
          Oluştur ve belgeleri yükle
        </RcButton>
        <RcButton
          v-else
          variant="accent"
          size="sm"
          :disabled="!canProceed"
          :loading="submitting"
          @click="handleSubmit"
        >
          <RcIcon name="check" :size="14" />
          {{ isService ? 'Tamamla' : 'Kiralama oluştur' }}
        </RcButton>
      </template>
    </RcPageHeader>

    <RcStepper
      :steps="wizardSteps"
      :current="currentStep"
      clickable
      @select="goToStep"
    />

    <div class="rc-detail rcr-create__layout">
      <div class="rc-detail__main rcr-create__main">
        <!-- Step 1 -->
        <div v-if="currentStep === 1" class="rc-card">
          <div class="rc-card__head">
            <div>
              <div class="rc-card__title">Kiralama tipini seç</div>
              <p class="rcr-create__card-hint">Tip, KM paketleri ve fiyatlandırma stratejisini belirler.</p>
            </div>
          </div>
          <div class="rc-card__body">
            <RentalTypeSelector v-model="rentalType" />
          </div>
        </div>

        <!-- Step 2 -->
        <div v-else-if="currentStep === 2" class="rc-card">
          <div class="rc-card__head">
            <div class="rc-card__title">Tarih ve süre</div>
          </div>
          <div class="rc-card__body rcr-create__step-body">
            <div class="rcv-form-grid">
              <RcField label="Başlangıç tarihi" :class="{ 'rc-field--error': hasError('startDate') }">
                <DatePicker
                  v-model="startDate"
                  placeholder="Başlangıç tarihi"
                  @closed="touch('startDate')"
                />
                <span v-if="hasError('startDate')" class="rc-field__hint rc-field__hint--error">{{ getError('startDate') }}</span>
              </RcField>
              <RcField label="Bitiş tarihi" :class="{ 'rc-field--error': hasError('endDate') }">
                <DatePicker
                  v-model="endDate"
                  :min="endDatePickerMin"
                  placeholder="Bitiş tarihi"
                  @closed="touch('endDate')"
                />
                <span v-if="hasError('endDate')" class="rc-field__hint rc-field__hint--error">{{ getError('endDate') }}</span>
              </RcField>
            </div>
            <p class="date-hint">
              Geçmişe dönük kiralamalar da kaydedilebilir. Bitiş, başlangıçtan en az bir gün sonra olmalıdır.
            </p>
            <div v-if="isLeasing" class="rc-alert rc-alert--info">
              <RcIcon name="info" :size="16" />
              <span>Leasing için minimum süre <strong>12 ay (365 gün)</strong> olmalıdır.</span>
            </div>
            <div v-if="startDate && endDate && validateDates()" class="rcr-create__date-summary">
              <span>Toplam süre</span>
              <strong>{{ isLeasing ? `${selectedTermMonths} ay` : `${totalDays} gün` }}</strong>
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div v-else-if="currentStep === 3" class="rc-card">
          <div class="rc-card__head">
            <div>
              <div class="rc-card__title">Araç seç</div>
              <p class="rcr-create__card-hint">{{ startDate }} – {{ endDate }} arasında müsait araçlar.</p>
            </div>
          </div>
          <div v-if="isService" class="rc-alert rc-alert--info" style="margin: 0 16px 12px">
            <RcIcon name="info" :size="16" />
            <span>
              Servis kiralamasında yalnızca <strong>Servis / Minibüs</strong> kategorisindeki (veya 8+ koltuklu) araçlar listelenir.
              Araç göremiyorsanız filo → yeni araç eklerken kategoriyi Servis / Minibüs seçin.
            </span>
          </div>
          <div class="rc-card__body">
            <VehicleSelector
              v-model="selectedVehicleId"
              :start-date="startDate"
              :end-date="endDate"
              :rental-type="rentalType"
              :service-mode="isService"
              @vehicle-selected="handleVehicleSelected"
            />
          </div>
        </div>

        <!-- Step 4 -->
        <div v-else-if="currentStep === 4" class="rc-card">
          <div class="rc-card__head">
            <div class="rc-card__title">Müşteri ve sürücü</div>
          </div>
          <div class="rc-card__body rcr-create__step-body">
            <CustomerSelector
              v-model="selectedCustomerId"
              :rental-end-date="endDate"
              @open-quick-create="showQuickCustomerModal = true"
            />
            <div v-if="selectedCustomerId" class="driver-section">
              <h3 class="rcr-create__section-title">Sürücüler</h3>
              <p class="section-description">En az bir sürücü ve ana sürücü seçilmelidir.</p>
              <DriverSelector
                v-model="selectedDriverIds"
                v-model:primary-driver-id="primaryDriverId"
                :customer-id="selectedCustomerId"
                :rental-end-date="endDate"
              />
            </div>
          </div>
        </div>

        <!-- Step 5 -->
        <div v-else-if="currentStep === 5" class="rc-card">
          <div class="rc-card__head">
            <div class="rc-card__title">KM paketi ve vade</div>
          </div>
          <div class="rc-card__body rcr-create__step-body">
            <div v-if="isLeasing && selectedVehicleCategoryId" class="term-section">
              <h3 class="rcr-create__section-title">Vade süresi</h3>
              <TermSelector v-model="selectedTermMonths" :category-id="selectedVehicleCategoryId" />
            </div>
            <div v-if="kmPackages.length > 0" class="km-package-section">
              <h3 class="rcr-create__section-title">KM paketi</h3>
              <div class="package-grid">
                <button
                  v-for="pkg in kmPackages"
                  :key="pkg.id"
                  type="button"
                  class="rcr-package-card"
                  :class="{ 'rcr-package-card--selected': selectedKmPackageId === pkg.id }"
                  @click="selectedKmPackageId = pkg.id"
                >
                  <div class="rcr-package-card__head">
                    <h4>{{ pkg.name }}</h4>
                    <RcIcon v-if="selectedKmPackageId === pkg.id" name="check" :size="16" />
                  </div>
                  <div class="rcr-package-card__km rc-num">
                    {{ formatIncludedKmDisplay(rentalType, pkg.includedKm ?? 0, totalDays, pkg.unlimited) }}
                  </div>
                  <div class="rcr-package-card__meta">
                    Fazla: {{ formatCurrency(pkg.extraKmPrice) }}/km
                  </div>
                </button>
              </div>
            </div>
            <div class="km-override-section">
              <h3 class="rcr-create__section-title">KM override (opsiyonel)</h3>
              <div class="rcv-form-grid">
                <RcField label="Özel dahil KM">
                  <input v-model.number="customIncludedKm" class="rc-input rc-num" type="number" min="0" step="1" placeholder="Örn: 7500" />
                </RcField>
                <RcField label="Özel fazla KM ücreti (₺)">
                  <input v-model.number="customExtraKmPrice" class="rc-input rc-num" type="number" min="0" step="0.01" placeholder="0.75" />
                </RcField>
              </div>
            </div>
            <div v-if="kmPackages.length === 0" class="rc-alert rc-alert--info">
              <RcIcon name="info" :size="16" />
              <span>Aktif KM paketi bulunamadı; paketsiz devam edebilirsiniz.</span>
            </div>
          </div>
        </div>

        <!-- Step 6 -->
        <div v-else-if="currentStep === 6" class="rc-card">
          <div class="rc-card__head">
            <div class="rc-card__title">Ek kalemler</div>
          </div>
          <div class="rc-card__body rcr-create__step-body">
            <ExtraItemsManager
              v-model="extraItems"
              :term-months="isLeasing ? selectedTermMonths : 1"
              @total-changed="handleExtraItemsTotal"
            />
            <div class="rc-alert rc-alert--info" style="margin-top: 14px">
              <RcIcon name="info" :size="16" />
              <span>Ek kalem eklemeden devam edebilirsiniz.</span>
            </div>
          </div>
        </div>

        <!-- Step 7 -->
        <div v-else-if="currentStep === 7" class="rcr-create__review">
          <div class="rc-alert rc-alert--info">
            <RcIcon name="info" :size="16" />
            <div>
              <strong>Son adım — onay</strong>
              <span> Bilgileri kontrol edin ve kiralamayı oluşturun.</span>
            </div>
          </div>
          <div class="rc-card">
            <div class="rc-card__head"><div class="rc-card__title">Sözleşme özeti</div></div>
            <div class="rc-card__body">
              <div class="summary-grid summary-grid--review">
                <div class="summary-card">
                  <div class="summary-row">
                    <span>Tip</span>
                    <strong>{{ rentalTypes.find((t) => t.value === rentalType)?.label }}</strong>
                  </div>
                  <div class="summary-row"><span>Başlangıç</span><strong>{{ startDate }}</strong></div>
                  <div class="summary-row"><span>Bitiş</span><strong>{{ endDate }}</strong></div>
                  <div class="summary-row">
                    <span>Süre</span>
                    <strong>{{ isLeasing ? `${selectedTermMonths} ay` : `${totalDays} gün` }}</strong>
                  </div>
                  <div class="summary-row">
                    <span>KM paketi</span>
                    <strong>{{ selectedKmPackage?.name || 'Seçilmedi' }}</strong>
                  </div>
                  <div class="summary-section summary-section--branches">
                    <h5 class="summary-section-title">Şubeler</h5>
                    <div class="branch-fields">
                      <div class="branch-field">
                        <label class="branch-label">Teslim</label>
                        <SearchableSelect
                          v-model="selectedBranchId"
                          :options="branchOptions"
                          placeholder="Şube seçiniz"
                          search-placeholder="Şube ara..."
                        />
                      </div>
                      <div class="branch-field">
                        <label class="branch-label">İade</label>
                        <SearchableSelect
                          v-model="selectedReturnBranchId"
                          :options="branchOptions"
                          placeholder="Şube seçiniz"
                          search-placeholder="Şube ara..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="summary-card">
                  <h4>Fiyat</h4>
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
                    <h5>İndirim (opsiyonel)</h5>
                    <div class="rcv-form-grid">
                      <RcField label="İndirim tutarı (₺)">
                        <input v-model.number="discountAmount" class="rc-input rc-num" type="number" min="0" step="0.01" placeholder="0" />
                      </RcField>
                      <RcField label="Sebep">
                        <input
                          v-model="discountReason"
                          class="rc-input"
                          type="text"
                          placeholder="Sadık müşteri indirimi"
                          :disabled="discountAmount <= 0"
                        />
                      </RcField>
                    </div>
                  </div>
                  <div class="extra-items-summary">
                    <div class="summary-row"><span>Temel</span><strong>{{ formatCurrency(baseTotal) }}</strong></div>
                    <div class="summary-row"><span>Ek kalemler</span><strong>{{ formatCurrency(extraItemsTotalComputed) }}</strong></div>
                    <div v-if="appliedDiscountAmount > 0" class="summary-row">
                      <span>İndirim</span>
                      <strong class="discount-value">−{{ formatCurrency(appliedDiscountAmount) }}</strong>
                    </div>
                    <div class="summary-row total">
                      <span>Genel toplam</span>
                      <strong>{{ formatCurrency(finalTotalWithDiscount) }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 8: Servis belgeleri -->
        <div v-else-if="currentStep === 8 && createdRentalId" class="rc-card">
          <div class="rc-card__head">
            <div>
              <div class="rc-card__title">Servis belgeleri</div>
              <p class="rcr-create__card-hint">Güzergah izni, yolcu listesi ve diğer servis belgelerini yükleyin.</p>
            </div>
          </div>
          <div class="rc-card__body">
            <DocumentsSection
              reference-type="RENTAL"
              :reference-id="createdRentalId"
              title="Servis Kiralama Belgeleri"
            />
          </div>
        </div>
      </div>

      <div class="rc-detail__side rcr-create__side">
        <RentalCreateSummaryCard
          :current-step="currentStep"
          :rental-type="rentalType"
          :type-label="rentalTypes.find((t) => t.value === rentalType)?.label ?? ''"
          :start-date="startDate"
          :end-date="endDate"
          :total-days="totalDays"
          :term-months="selectedTermMonths"
          :is-leasing="isLeasing"
          :customer-selected="!!selectedCustomerId"
          :customer-label="selectedCustomerLabel"
          :vehicle-selected="!!selectedVehicleId"
          :vehicle-label="selectedVehicleLabel"
          :km-package="selectedKmPackage"
          :extra-items-count="extraItems.length"
          :base-total="baseTotal"
          :extras-total="extraItemsTotalComputed"
          :discount-amount="appliedDiscountAmount"
          :final-total="finalTotalWithDiscount"
        />
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
