<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { rentalsApi } from '@/api'
import { useToast, useValidation } from '@/composables'
import type { RentalType, Customer, CreateRentalForm } from '@/types'
import type { PriceCalculationResponse } from '@/api'
import VehicleSelector from '@/components/rentals/VehicleSelector.vue'
import CustomerSelector from '@/components/rentals/CustomerSelector.vue'
import PricingCalculator from '@/components/rentals/PricingCalculator.vue'
import QuickCustomerModal from '@/components/customers/QuickCustomerModal.vue'

const router = useRouter()
const toast = useToast()

const currentStep = ref(1)
const totalSteps = 5
const submitting = ref(false)

const rentalType = ref<RentalType>('DAILY')
const selectedVehicleId = ref<number | null>(null)
const selectedCustomerId = ref<number | null>(null)
const startDate = ref('')
const endDate = ref('')
const selectedLeasingPlanId = ref<number | null>(null)
const priceData = ref<PriceCalculationResponse | null>(null)
const showQuickCustomerModal = ref(false)

const { getError, hasError, touch } = useValidation()

const rentalTypes: { value: RentalType; label: string; description: string; minDays?: number }[] = [
  { value: 'DAILY', label: 'Günlük Kiralama', description: '1-30 gün arası kısa süreli kiralama' },
  { value: 'WEEKLY', label: 'Haftalık Kiralama', description: '7+ gün avantajlı fiyatlandırma' },
  { value: 'MONTHLY', label: 'Aylık Kiralama', description: '1-12 ay arası orta süreli kiralama' },
  { value: 'LEASING', label: 'Uzun Dönem Leasing', description: '12+ ay uzun dönem anlaşma', minDays: 365 }
]

const stepTitles = computed(() => {
  const base = ['Tip', 'Tarih', 'Araç', 'Müşteri']
  if (rentalType.value === 'LEASING') {
    return [...base, 'Özet']
  }
  return [...base, 'Özet']
})


const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1: return !!rentalType.value
    case 2: return !!startDate.value && !!endDate.value && validateDates()
    case 3: return !!selectedVehicleId.value
    case 4: return !!selectedCustomerId.value
    case 5: return rentalType.value !== 'LEASING' || !!selectedLeasingPlanId.value || true
    default: return false
  }
})

const isLastStep = computed(() => currentStep.value === totalSteps)

function validateDates(): boolean {
  if (!startDate.value || !endDate.value) return false
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  if (end <= start) return false
  
  if (rentalType.value === 'LEASING') {
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
    case 4: return !!selectedCustomerId.value
    case 5: return true
    default: return false
  }
}

function handlePriceCalculated(response: PriceCalculationResponse) {
  priceData.value = response
}

function handleLeasingPlanSelected(planId: number) {
  selectedLeasingPlanId.value = planId
}

function handleCustomerCreated(customer: Customer) {
  selectedCustomerId.value = customer.id
  showQuickCustomerModal.value = false
}

async function handleSubmit() {
  if (!canProceed.value || !selectedVehicleId.value || !selectedCustomerId.value) return

  submitting.value = true
  try {
    const payload: CreateRentalForm = {
      rentalType: rentalType.value,
      vehicleId: selectedVehicleId.value,
      customerId: selectedCustomerId.value,
      customerType: 'PERSONAL',
      driverIds: [selectedCustomerId.value],
      primaryDriverId: selectedCustomerId.value,
      branchId: 1,
      returnBranchId: 1,
      startDate: startDate.value,
      endDate: endDate.value,
      kmPackageId: rentalType.value === 'LEASING' ? selectedLeasingPlanId.value || undefined : undefined
    }

    const rental = await rentalsApi.create(payload)
    toast.success(`Kiralama #${rental.rentalNumber} başarıyla oluşturuldu`)
    router.push(`/rentals/${rental.id}`)
  } catch {
    toast.error('Kiralama oluşturulamadı')
  } finally {
    submitting.value = false
  }
}

watch(rentalType, () => {
  if (currentStep.value > 1) {
    selectedVehicleId.value = null
    selectedCustomerId.value = null
    startDate.value = ''
    endDate.value = ''
    selectedLeasingPlanId.value = null
  }
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
        <div v-if="currentStep === 1" class="step-content">
          <h2>Kiralama Tipini Seçin</h2>
          <div class="type-options">
            <label 
              v-for="type in rentalTypes" 
              :key="type.value"
              :class="['type-option', { selected: rentalType === type.value }]"
            >
              <input 
                type="radio" 
                :value="type.value" 
                v-model="rentalType"
                hidden
              />
              <div class="type-content">
                <strong>{{ type.label }}</strong>
                <span>{{ type.description }}</span>
              </div>
              <div v-if="rentalType === type.value" class="check-icon">✓</div>
            </label>
          </div>
        </div>

        <div v-if="currentStep === 2" class="step-content">
          <h2>Tarih Aralığı Seçin</h2>
          
          <div class="date-section-full">
            <div class="form-grid">
              <div class="form-group" :class="{ error: hasError('startDate') }">
                <label>Başlangıç Tarihi</label>
                <input 
                  type="date" 
                  v-model="startDate"
                  @blur="touch('startDate')"
                  :min="new Date().toISOString().split('T')[0]"
                />
                <span class="error-text">{{ getError('startDate') }}</span>
              </div>
              <div class="form-group" :class="{ error: hasError('endDate') }">
                <label>Bitiş Tarihi</label>
                <input 
                  type="date" 
                  v-model="endDate"
                  @blur="touch('endDate')"
                  :min="startDate || new Date().toISOString().split('T')[0]"
                />
                <span class="error-text">{{ getError('endDate') }}</span>
              </div>
            </div>

            <div v-if="rentalType === 'LEASING'" class="leasing-notice">
              <span class="notice-icon">ℹ️</span>
              <p>Leasing için minimum süre <strong>12 ay (365 gün)</strong> olmalıdır.</p>
            </div>

            <div v-if="startDate && endDate && validateDates()" class="date-summary">
              <div class="summary-item">
                <span class="label">Toplam Süre</span>
                <span class="value">{{ Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) }} gün</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentStep === 3" class="step-content">
          <h2>Araç Seçin</h2>
          <p class="step-description">
            {{ startDate }} - {{ endDate }} tarihleri arasında müsait araçlar listeleniyor.
          </p>
          <VehicleSelector
            v-model="selectedVehicleId"
            :start-date="startDate"
            :end-date="endDate"
            :rental-type="rentalType"
          />
        </div>

        <div v-if="currentStep === 4" class="step-content">
          <h2>Müşteri Seçin</h2>
          <CustomerSelector
            v-model="selectedCustomerId"
            :rental-end-date="endDate"
            @open-quick-create="showQuickCustomerModal = true"
          />
        </div>

        <div v-if="currentStep === 5" class="step-content">
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
                <strong>{{ Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) }} gün</strong>
              </div>
            </div>

            <div class="summary-card">
              <h4>Fiyat Bilgisi</h4>
              <PricingCalculator
                :vehicle-id="selectedVehicleId"
                :customer-id="selectedCustomerId"
                :rental-type="rentalType"
                :start-date="startDate"
                :end-date="endDate"
                @calculated="handlePriceCalculated"
                @leasing-plan-selected="handleLeasingPlanSelected"
              />
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

@media (max-width: 768px) {
  .date-price-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .wizard-steps {
    padding: 16px;
    gap: 8px;
  }
  
  .step {
    padding: 10px 12px;
  }
  
  .step-label {
    display: none;
  }
}
</style>
