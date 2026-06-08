<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { vehiclesApi, vehicleCategoriesApi, branchesApi } from '@/api'
import { useValidation, rules, useToast, useReferenceData } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { formatPlateInput } from '@/utils'
import { isErrorResponse } from '@/utils/error'
import { RcModal, RcButton, RcField, RcInput } from '@/components/rc'
import type { Vehicle, VehicleCategory, Branch, UpdateVehicleForm } from '@/types'
import type { CarModel } from '@/types/reference'
import { FuelType, Transmission } from '@/types'

interface Props {
  visible: boolean
  vehicleId: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  saved: [vehicle: Vehicle]
}>()

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const categories = ref<VehicleCategory[]>([])
const branches = ref<Branch[]>([])
const originalVehicle = ref<Vehicle | null>(null)

const { brands, colors, loadBrands, loadModelsByBrand, loadColors } = useReferenceData()
const selectedBrandId = ref<number | null>(null)
const selectedModelId = ref<number | null>(null)
const selectedColorId = ref<number | null>(null)
const models = ref<CarModel[]>([])
const modelsLoading = ref(false)
const isPopulatingForEdit = ref(false)

const form = ref<UpdateVehicleForm>({
  plateNumber: '',
  vinNumber: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  fuelType: FuelType.GASOLINE,
  transmission: Transmission.MANUAL,
  engineCapacity: 0,
  seatCount: 5,
  categoryId: 0,
  branchId: 0,
  currentKm: 0,
  insuranceExpiryDate: '',
  inspectionExpiryDate: '',
  registrationDate: '',
  dailyPrice: 0,
  weeklyPrice: null,
  monthlyPrice: null,
  notes: ''
})

const currentYear = new Date().getFullYear()
const minimumEditableKm = computed(() => originalVehicle.value?.currentKm ?? 0)
const formRules = computed(() => ({
  plateNumber: { value: form.value.plateNumber, rules: [rules.required(), rules.plate()] },
  vinNumber: { value: form.value.vinNumber, rules: [rules.required(), rules.vin()] },
  brand: { value: form.value.brand, rules: [rules.required()] },
  model: { value: form.value.model, rules: [rules.required()] },
  year: { value: form.value.year, rules: [rules.required(), rules.yearRange(2000, currentYear)] },
  color: { value: form.value.color ?? '', rules: [rules.required()] },
  currentKm: {
    value: form.value.currentKm,
    rules: [rules.required(), rules.minValue(minimumEditableKm.value, `KM cannot be lower than ${minimumEditableKm.value}`)]
  },
  dailyPrice: { value: form.value.dailyPrice, rules: [rules.required(), rules.positive()] },
  categoryId: { value: form.value.categoryId, rules: [rules.required()] },
  branchId: { value: form.value.branchId, rules: [rules.required('Şube seçiniz')] }
}))
const { validateForm, getError, hasError, touch, reset } = useValidation(() => formRules.value)

const fuelTypeOptions = [
  { value: FuelType.GASOLINE, label: 'Benzin' },
  { value: FuelType.DIESEL, label: 'Dizel' },
  { value: FuelType.ELECTRIC, label: 'Elektrik' },
  { value: FuelType.HYBRID, label: 'Hibrit' },
  { value: FuelType.LPG, label: 'LPG' }
]

const transmissionOptions = [
  { value: Transmission.MANUAL, label: 'Manuel' },
  { value: Transmission.AUTOMATIC, label: 'Otomatik' }
]

const brandOptions = computed(() => brands.value.map(b => ({ value: b.id as number, label: b.name })))
const modelOptions = computed(() => models.value.map(m => ({ value: m.id as number, label: m.name })))
const colorOptions = computed(() => colors.value.map(c => ({ value: c.id as number, label: c.name })))
const categoryOptions = computed(() => categories.value.map(c => ({ value: c.id as number, label: c.name })))
const branchOptions = computed(() => branches.value.map(b => ({ value: b.id as number, label: b.name })))

watch(selectedBrandId, async (brandId) => {
  if (!brandId) {
    models.value = []
    selectedModelId.value = null
    form.value.model = ''
    form.value.brand = ''
    return
  }
  const b = brands.value.find(x => x.id === brandId)
  form.value.brand = b ? b.name : ''
  if (isPopulatingForEdit.value) return
  modelsLoading.value = true
  try {
    models.value = await loadModelsByBrand(brandId)
    selectedModelId.value = null
    form.value.model = ''
  } finally {
    modelsLoading.value = false
  }
})

watch(selectedModelId, (modelId) => {
  if (!modelId) {
    form.value.model = ''
    return
  }
  const m = models.value.find(x => x.id === modelId)
  form.value.model = m ? m.name : ''
})

watch(selectedColorId, (colorId) => {
  if (!colorId) {
    form.value.color = ''
    return
  }
  const c = colors.value.find(x => x.id === colorId)
  form.value.color = c ? c.name : ''
})

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function isBranchAvailabilityError(error: unknown): boolean {
  const matchesMessage = (message: string): boolean => {
    const normalized = message.toLowerCase()
    return (
      (normalized.includes('branch') && normalized.includes('available')) ||
      (normalized.includes('sube') && normalized.includes('musait')) ||
      (normalized.includes('şube') && normalized.includes('müsait'))
    )
  }

  if (isErrorResponse(error)) {
    return matchesMessage(error.message) || error.code === 'V004'
  }

  if (typeof error === 'object' && error !== null && 'response' in error) {
    const responseData = (error as { response?: { data?: unknown } }).response?.data
    if (isErrorResponse(responseData)) {
      return matchesMessage(responseData.message) || responseData.code === 'V004'
    }
  }

  return false
}

async function fetchVehicle() {
  if (!props.vehicleId) return

  loading.value = true
  isPopulatingForEdit.value = true
  try {
    await Promise.all([loadBrands(), loadColors()])
    const vehicle = await vehiclesApi.getById(props.vehicleId)
    originalVehicle.value = vehicle
    const brandMatch = brands.value.find(b => b.name === vehicle.brand)
    if (brandMatch) {
      selectedBrandId.value = brandMatch.id
      const modelsList = await loadModelsByBrand(brandMatch.id)
      models.value = modelsList
      const modelMatch = modelsList.find(m => m.name === vehicle.model)
      if (modelMatch) selectedModelId.value = modelMatch.id
    }
    const colorMatch = colors.value.find(c => c.name === vehicle.color)
    if (colorMatch) selectedColorId.value = colorMatch.id
    form.value = {
      plateNumber: vehicle.plateNumber,
      vinNumber: vehicle.vinNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color ?? '',
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      engineCapacity: vehicle.engineCapacity,
      seatCount: vehicle.seatCount,
      categoryId: vehicle.categoryId,
      branchId: vehicle.branchId,
      currentKm: vehicle.currentKm,
      insuranceExpiryDate: vehicle.insuranceExpiryDate?.split('T')[0] || '',
      inspectionExpiryDate: vehicle.inspectionExpiryDate?.split('T')[0] || '',
      registrationDate: vehicle.registrationDate?.split('T')[0] || '',
      dailyPrice: vehicle.dailyPrice ?? 0,
      weeklyPrice: vehicle.weeklyPrice ?? null,
      monthlyPrice: vehicle.monthlyPrice ?? null,
      notes: vehicle.notes ?? ''
    }
  } catch {
    toast.error('Araç bilgileri yüklenemedi')
    emit('close')
  } finally {
    loading.value = false
    isPopulatingForEdit.value = false
  }
}

async function fetchCategories() {
  try {
    categories.value = await vehicleCategoriesApi.getAll()
  } catch {
    toast.error('Kategoriler yüklenemedi')
  }
}

async function fetchBranches() {
  try {
    branches.value = await branchesApi.getActive()
  } catch {
    toast.error('Şubeler yüklenemedi')
  }
}

async function handleSubmit() {
  if (!validateForm(formRules.value)) {
    toast.error('Lütfen formdaki hataları düzeltin')
    return
  }

  if (!props.vehicleId) return

  const branchChanged = originalVehicle.value !== null && form.value.branchId !== originalVehicle.value.branchId

  saving.value = true
  try {
    const payload: UpdateVehicleForm = {
      ...form.value,
      color: form.value.color?.trim() || null,
      insuranceExpiryDate: form.value.insuranceExpiryDate || null,
      inspectionExpiryDate: form.value.inspectionExpiryDate || null,
      registrationDate: form.value.registrationDate || null,
      dailyPrice: normalizeOptionalNumber(form.value.dailyPrice),
      weeklyPrice: normalizeOptionalNumber(form.value.weeklyPrice),
      monthlyPrice: normalizeOptionalNumber(form.value.monthlyPrice),
      notes: form.value.notes?.trim() || null
    }

    const updatedVehicle = await vehiclesApi.patchById(props.vehicleId, payload)
    toast.success('Araç başarıyla güncellendi')
    emit('saved', updatedVehicle)
    emit('close')
  } catch (err: unknown) {
    if (branchChanged && isBranchAvailabilityError(err)) {
      toast.error('Branch can only be changed when vehicle is AVAILABLE')
    } else {
      toast.apiError(err, 'Güncelleme işlemi başarısız')
    }
  } finally {
    saving.value = false
  }
}

function handleClose() {
  reset()
  originalVehicle.value = null
  emit('close')
}

function handleBlur(field: string) {
  touch(field)
}

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    reset()
    selectedBrandId.value = null
    selectedModelId.value = null
    selectedColorId.value = null
    models.value = []
    fetchCategories()
    fetchBranches()
    fetchVehicle()
  }
})
</script>

<template>
  <RcModal :open="visible" xl wide @close="handleClose">
    <template #header>
      <div>
        <h2 class="rc-modal__title">Aracı düzenle</h2>
        <div v-if="form.plateNumber" class="rc-modal__sub">{{ form.plateNumber }}</div>
      </div>
    </template>

    <div v-if="loading" style="padding: 48px; text-align: center; color: var(--rc-text-muted)">
      Yükleniyor…
    </div>

    <form v-else class="rc-veh-modal-form rcv-form-grid" @submit.prevent="handleSubmit">
          <section class="form-section full-width">
            <h3>Temel Bilgiler</h3>
            <div class="form-grid">
              <RcField label="Plaka" required :error="getError('plateNumber')">
                <RcInput
                  :model-value="form.plateNumber"
                  class="rc-mono"
                  placeholder="34 ABC 123"
                  maxlength="12"
                  @update:model-value="form.plateNumber = formatPlateInput(String($event))"
                  @blur="handleBlur('plateNumber')"
                />
              </RcField>

              <RcField label="VIN Numarası" required :error="getError('vinNumber')">
                <RcInput
                  v-model="form.vinNumber"
                  maxlength="17"
                  placeholder="17 karakter"
                  @blur="handleBlur('vinNumber')"
                />
              </RcField>

              <div class="form-group" :class="{ error: hasError('brand') }">
                <label>Marka <span class="required">*</span></label>
                <SearchableSelect
                  v-model="selectedBrandId"
                  :options="brandOptions"
                  placeholder="Marka seçin"
                  search-placeholder="Marka ara..."
                  clearable
                  :error="hasError('brand')"
                  @blur="handleBlur('brand')"
                />
                <span class="error-text">{{ getError('brand') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('model') }">
                <label>Model <span class="required">*</span></label>
                <SearchableSelect
                  v-model="selectedModelId"
                  :options="modelOptions"
                  :placeholder="selectedBrandId ? (modelsLoading ? 'Yükleniyor...' : 'Model seçin') : 'Önce marka seçin'"
                  search-placeholder="Model ara..."
                  clearable
                  :disabled="!selectedBrandId || modelsLoading"
                  :loading="modelsLoading"
                  :error="hasError('model')"
                  @blur="handleBlur('model')"
                />
                <span class="error-text">{{ getError('model') }}</span>
              </div>

              <RcField label="Yıl" required :error="getError('year')">
                <RcInput
                  :model-value="String(form.year)"
                  type="number"
                  @update:model-value="form.year = Number($event)"
                  @blur="handleBlur('year')"
                />
              </RcField>

              <div class="form-group" :class="{ error: hasError('color') }">
                <label>Renk <span class="required">*</span></label>
                <SearchableSelect
                  v-model="selectedColorId"
                  :options="colorOptions"
                  placeholder="Renk seçin"
                  search-placeholder="Renk ara..."
                  clearable
                  :error="hasError('color')"
                  @blur="handleBlur('color')"
                />
                <span class="error-text">{{ getError('color') }}</span>
              </div>
            </div>
          </section>

          <section class="form-section">
            <h3>Teknik Özellikler</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Yakıt Tipi</label>
                <SearchableSelect
                  v-model="form.fuelType"
                  :options="fuelTypeOptions"
                  placeholder="Yakıt tipi seçin"
                  search-placeholder="Ara..."
                />
              </div>

              <div class="form-group">
                <label>Vites</label>
                <SearchableSelect
                  v-model="form.transmission"
                  :options="transmissionOptions"
                  placeholder="Vites seçin"
                  search-placeholder="Ara..."
                />
              </div>

              <div class="form-group">
                <label>Motor Hacmi (cc)</label>
                <input v-model.number="form.engineCapacity" type="number" min="0" />
              </div>

              <div class="form-group">
                <label>Koltuk Sayısı</label>
                <input v-model.number="form.seatCount" type="number" min="1" max="9" />
              </div>

              <div class="form-group" :class="{ error: hasError('categoryId') }">
                <label>Kategori <span class="required">*</span></label>
                <SearchableSelect
                  :model-value="form.categoryId || null"
                  :options="categoryOptions"
                  placeholder="Kategori seçiniz"
                  search-placeholder="Kategori ara..."
                  :error="hasError('categoryId')"
                  @update:model-value="(v) => form.categoryId = v ?? 0"
                  @blur="handleBlur('categoryId')"
                />
                <span class="error-text">{{ getError('categoryId') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('branchId') }">
                <label>Şube <span class="required">*</span></label>
                <SearchableSelect
                  :model-value="form.branchId || null"
                  :options="branchOptions"
                  placeholder="Şube seçiniz"
                  search-placeholder="Şube ara..."
                  :error="hasError('branchId')"
                  @update:model-value="(v) => form.branchId = v ?? 0"
                  @blur="handleBlur('branchId')"
                />
                <span class="error-text">{{ getError('branchId') }}</span>
              </div>
            </div>
          </section>

          <section class="form-section">
            <h3>Durum ve Fiyat</h3>
            <div class="form-grid">
              <RcField label="Güncel KM" :error="getError('currentKm')">
                <RcInput
                  :model-value="String(form.currentKm)"
                  type="number"
                  @update:model-value="form.currentKm = Number($event)"
                  @blur="handleBlur('currentKm')"
                />
              </RcField>

              <RcField label="Günlük Fiyat (₺)" required :error="getError('dailyPrice')">
                <RcInput
                  :model-value="String(form.dailyPrice)"
                  type="number"
                  @update:model-value="form.dailyPrice = Number($event)"
                  @blur="handleBlur('dailyPrice')"
                />
              </RcField>

              <div class="form-group">
                <label>Haftalık Fiyat (₺)</label>
                <input
                  v-model.number="form.weeklyPrice"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>

              <div class="form-group">
                <label>Aylık Fiyat (₺)</label>
                <input
                  v-model.number="form.monthlyPrice"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>

              <div class="form-group">
                <DatePicker
                  :model-value="form.registrationDate ?? undefined"
                  label="Tescil Tarihi"
                  placeholder="Tescil tarihi"
                  @update:model-value="form.registrationDate = $event"
                />
              </div>

              <div class="form-group">
                <DatePicker
                  :model-value="form.insuranceExpiryDate ?? undefined"
                  label="Sigorta Bitiş"
                  placeholder="Sigorta bitiş tarihi"
                  @update:model-value="form.insuranceExpiryDate = $event"
                />
              </div>

              <div class="form-group">
                <DatePicker
                  :model-value="form.inspectionExpiryDate ?? undefined"
                  label="Muayene Bitiş"
                  placeholder="Muayene bitiş tarihi"
                  @update:model-value="form.inspectionExpiryDate = $event"
                />
              </div>
            </div>
          </section>

          <section class="form-section">
            <h3>Notlar</h3>
            <div class="form-group full">
              <textarea v-model="form.notes" rows="3" placeholder="Araç ile ilgili notlar..."></textarea>
            </div>
          </section>
        </form>

    <template v-if="!loading" #footer>
      <RcButton variant="secondary" type="button" @click="handleClose">İptal</RcButton>
      <RcButton variant="accent" type="button" :loading="saving" @click="handleSubmit">
        Kaydet
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rc-veh-edit-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rc-veh-edit-form .form-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--rc-text-soft);
}

.rc-veh-edit-form .form-group input,
.rc-veh-edit-form .form-group textarea {
  padding: 9px 12px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-6);
  font-size: 14px;
  background: var(--rc-surface);
}

.rc-veh-edit-form .form-group.error input {
  border-color: var(--rc-danger-400);
}

.rc-veh-edit-form .error-text {
  font-size: 11.5px;
  color: var(--rc-danger-600);
}

.rc-veh-edit-form .form-group.full {
  grid-column: 1 / -1;
}

.required {
  color: var(--rc-danger-500);
}
</style>



