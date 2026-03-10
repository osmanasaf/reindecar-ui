<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { vehiclesApi, vehicleCategoriesApi, branchesApi, referenceDataApi } from '@/api'
import { useValidation, rules, useToast, useReferenceData } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import type { CarModel } from '@/types/reference'
import { formatPlateInput } from '@/utils'
import { isErrorResponse } from '@/utils/error'
import { FuelType, Transmission } from '@/types'
import type { CreateVehicleForm, UpdateVehicleForm, VehicleCategory, Branch, Vehicle } from '@/types'
import type { VehicleRecognitionResult } from '@/api/vehicles.api'

interface VehicleFormModel {
  plateNumber: string
  vinNumber: string
  brand: string
  model: string
  year: number
  color: string
  fuelType: FuelType
  transmission: Transmission
  engineCapacity: number
  seatCount: number
  categoryId: number
  branchId: number
  currentKm: number
  insuranceExpiryDate: string
  inspectionExpiryDate: string
  registrationDate: string
  dailyPrice: number
  weeklyPrice: number | null
  monthlyPrice: number | null
  notes: string
}

const route = useRoute()
const router = useRouter()
const toast = useToast()

const isEditMode = computed(() => route.params.id !== undefined)
const loading = ref(false)
const categories = ref<VehicleCategory[]>([])
const branches = ref<Branch[]>([])
const originalVehicle = ref<Vehicle | null>(null)

const {
  brands,
  colors,
  loadBrands,
  loadModelsByBrand,
  loadColors,
  getModelsForBrand,
  invalidateModelsCache
} = useReferenceData()
const selectedBrandId = ref<number | null>(null)
const selectedModelId = ref<number | null>(null)
const selectedColorId = ref<number | null>(null)
const models = ref<CarModel[]>([])
const modelsLoading = ref(false)

const brandOptions = computed(() => brands.value.map(b => ({ value: b.id as number, label: b.name })))
const modelOptions = computed(() => models.value.map(m => ({ value: m.id as number, label: m.name })))
const colorOptions = computed(() => colors.value.map(c => ({ value: c.id as number, label: c.name })))
const categoryOptions = computed(() => categories.value.map(c => ({ value: c.id as number, label: c.name })))
const branchOptions = computed(() => branches.value.map(b => ({ value: b.id as number, label: b.name })))

const currentYear = new Date().getFullYear()

const minimumEditableKm = computed(() => {
  if (!isEditMode.value) return 0
  return originalVehicle.value?.currentKm ?? 0
})

const fuelTypes: Array<{ value: FuelType; label: string }> = [
  { value: FuelType.GASOLINE, label: 'Benzin' },
  { value: FuelType.DIESEL, label: 'Dizel' },
  { value: FuelType.HYBRID, label: 'Hibrit' },
  { value: FuelType.ELECTRIC, label: 'Elektrik' },
  { value: FuelType.LPG, label: 'LPG' }
]

const transmissionTypes: Array<{ value: Transmission; label: string }> = [
  { value: Transmission.MANUAL, label: 'Manuel' },
  { value: Transmission.AUTOMATIC, label: 'Otomatik' }
]

const form = ref<VehicleFormModel>({
  plateNumber: '',
  vinNumber: '',
  brand: '',
  model: '',
  year: currentYear,
  color: '',
  fuelType: FuelType.GASOLINE,
  transmission: Transmission.MANUAL,
  engineCapacity: 1600,
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

const { validateForm, getError, hasError, touch } = useValidation(() => formRules.value)

const formRules = computed(() => ({
  plateNumber: { value: form.value.plateNumber, rules: [rules.required(), rules.plate()] },
  vinNumber: { value: form.value.vinNumber, rules: [rules.required(), rules.vin()] },
  brand: { value: form.value.brand, rules: [rules.required()] },
  model: { value: form.value.model, rules: [rules.required()] },
  year: { value: form.value.year, rules: [rules.required(), rules.yearRange(1990, currentYear + 1)] },
  color: { value: form.value.color, rules: [rules.required()] },
  fuelType: { value: form.value.fuelType, rules: [rules.required()] },
  transmission: { value: form.value.transmission, rules: [rules.required()] },
  engineCapacity: { value: form.value.engineCapacity, rules: [rules.required(), rules.positive()] },
  seatCount: { value: form.value.seatCount, rules: [rules.required(), rules.minValue(1), rules.maxValue(50)] },
  categoryId: { value: form.value.categoryId, rules: [rules.required('Kategori seçiniz')] },
  branchId: { value: form.value.branchId, rules: [rules.required('Şube seçiniz')] },
  currentKm: {
    value: form.value.currentKm,
    rules: [rules.required(), rules.minValue(minimumEditableKm.value, `KM cannot be lower than ${minimumEditableKm.value}`)]
  },
  insuranceExpiryDate: { value: form.value.insuranceExpiryDate, rules: [rules.required()] },
  inspectionExpiryDate: { value: form.value.inspectionExpiryDate, rules: [rules.required()] },
  registrationDate: { value: form.value.registrationDate, rules: [rules.required()] },
  dailyPrice: { value: form.value.dailyPrice, rules: [rules.required(), rules.positive()] }
}))

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function buildCreatePayload(): CreateVehicleForm {
  const weeklyPrice = normalizeOptionalNumber(form.value.weeklyPrice)
  const monthlyPrice = normalizeOptionalNumber(form.value.monthlyPrice)

  return {
    plateNumber: form.value.plateNumber,
    vinNumber: form.value.vinNumber,
    brand: form.value.brand,
    model: form.value.model,
    year: form.value.year,
    color: form.value.color,
    fuelType: form.value.fuelType,
    transmission: form.value.transmission,
    engineCapacity: form.value.engineCapacity,
    seatCount: form.value.seatCount,
    categoryId: form.value.categoryId,
    branchId: form.value.branchId,
    currentKm: form.value.currentKm,
    insuranceExpiryDate: form.value.insuranceExpiryDate,
    inspectionExpiryDate: form.value.inspectionExpiryDate,
    registrationDate: form.value.registrationDate,
    dailyPrice: form.value.dailyPrice,
    weeklyPrice: weeklyPrice ?? undefined,
    monthlyPrice: monthlyPrice ?? undefined,
    notes: form.value.notes.trim() || undefined
  }
}

function buildUpdatePayload(): UpdateVehicleForm {
  return {
    plateNumber: form.value.plateNumber,
    vinNumber: form.value.vinNumber,
    brand: form.value.brand,
    model: form.value.model,
    year: form.value.year,
    color: form.value.color.trim() || null,
    fuelType: form.value.fuelType,
    transmission: form.value.transmission,
    engineCapacity: form.value.engineCapacity,
    seatCount: form.value.seatCount,
    categoryId: form.value.categoryId,
    branchId: form.value.branchId,
    currentKm: form.value.currentKm,
    insuranceExpiryDate: form.value.insuranceExpiryDate || null,
    inspectionExpiryDate: form.value.inspectionExpiryDate || null,
    registrationDate: form.value.registrationDate || null,
    dailyPrice: normalizeOptionalNumber(form.value.dailyPrice),
    weeklyPrice: normalizeOptionalNumber(form.value.weeklyPrice),
    monthlyPrice: normalizeOptionalNumber(form.value.monthlyPrice),
    notes: form.value.notes.trim() || null
  }
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

async function fetchData() {
  loading.value = true
  try {
    await Promise.all([loadBrands(), loadColors()])
    const [categoriesData, branchesData] = await Promise.all([
      vehicleCategoriesApi.getAll(),
      branchesApi.getActive()
    ])
    categories.value = categoriesData
    branches.value = branchesData

    if (!branchesData || branchesData.length === 0) {
      toast.error('Aktif şube bulunamadı. Lütfen önce şube ekleyin.')
    }

    if (isEditMode.value) {
      const vehicle = await vehiclesApi.getById(Number(route.params.id))
      originalVehicle.value = vehicle
      const brandMatch = brands.value.find(b => b.name === vehicle.brand)
      if (brandMatch) {
        selectedBrandId.value = brandMatch.id
        const modelsList = await loadModelsByBrand(brandMatch.id)
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
    } else {
      originalVehicle.value = null
    }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const status = (error as { response?: { status?: number } }).response?.status
      if (status === 404) {
        toast.error('Kayıt bulunamadı')
      } else if (status === 401) {
        toast.error('Oturum süresi doldu. Lütfen tekrar giriş yapın.')
      } else {
        toast.error('Veriler yüklenirken hata oluştu')
      }
    } else {
      toast.error('Veriler yüklenirken hata oluştu')
    }
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!validateForm(formRules.value)) {
    toast.error('Lütfen formdaki hataları düzeltin')
    return
  }

  loading.value = true
  let branchChanged = false
  try {
    if (isEditMode.value) {
      branchChanged = originalVehicle.value !== null && form.value.branchId !== originalVehicle.value.branchId
      await vehiclesApi.patchById(Number(route.params.id), buildUpdatePayload())
      toast.success('Araç başarıyla güncellendi')
    } else {
      await vehiclesApi.create(buildCreatePayload())
      toast.success('Araç başarıyla eklendi')
    }
    router.push('/vehicles')
  } catch (err: unknown) {
    if (branchChanged && isBranchAvailabilityError(err)) {
      toast.error('Branch can only be changed when vehicle is AVAILABLE')
    } else {
      toast.apiError(err, 'Kaydetme işlemi başarısız')
    }
  } finally {
    loading.value = false
  }
}

function handleBlur(field: string) {
  touch(field)
}

const photoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const recognizing = ref(false)
const recognitionResult = ref<VehicleRecognitionResult | null>(null)
const photoInputRef = ref<HTMLInputElement | null>(null)

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  photoFile.value = file
  photoPreview.value = URL.createObjectURL(file)
  recognitionResult.value = null
}

function removePhoto() {
  photoFile.value = null
  photoPreview.value = null
  recognitionResult.value = null
  if (photoInputRef.value) photoInputRef.value.value = ''
}

async function recognizePhoto() {
  if (!photoFile.value) return
  recognizing.value = true
  try {
    const result = await vehiclesApi.recognizeFromPhoto(photoFile.value)
    recognitionResult.value = result
    if (result.recognized) {
      await applyRecognitionResult(result)
      toast.success('Araç bilgileri fotoğraftan otomatik dolduruldu. Lütfen kontrol edin.')
    } else {
      toast.error('Araç fotoğraftan tanınamadı. Lütfen daha net bir fotoğraf deneyin.')
    }
  } catch {
    toast.error('Fotoğraf analizi sırasında hata oluştu')
  } finally {
    recognizing.value = false
  }
}

async function applyRecognitionResult(result: VehicleRecognitionResult) {
  if (result.brand) {
    const brandMatch = brands.value.find(b =>
      b.name.toLowerCase() === result.brand!.toLowerCase()
    )
    if (brandMatch) {
      const loadedModels = await loadModelsByBrand(brandMatch.id)
      selectedBrandId.value = brandMatch.id

      if (result.model) {
        await nextTick()
        const modelMatch = loadedModels.find(m =>
          m.name.toLowerCase() === result.model!.toLowerCase()
        )
        if (modelMatch) {
          selectedModelId.value = modelMatch.id
        } else {
          try {
            const newModel = await referenceDataApi.createModel({
              brandId: brandMatch.id,
              name: result.model
            })
            invalidateModelsCache(brandMatch.id)
            const fresh = await loadModelsByBrand(brandMatch.id)
            models.value = fresh
            await nextTick()
            selectedModelId.value = newModel.id
            toast.info(`"${result.model}" modeli sisteme eklendi`)
          } catch {
            toast.error(`"${result.model}" modeli eklenemedi, lütfen elle seçin`)
          }
        }
      }
    }
  }

  if (result.color) {
    const colorMatch = colors.value.find(c =>
      c.name.toLowerCase() === result.color!.toLowerCase()
    )
    if (colorMatch) selectedColorId.value = colorMatch.id
  }

  if (result.year) {
    form.value.year = result.year
  }

  if (result.plateNumber) {
    form.value.plateNumber = formatPlateInput(result.plateNumber)
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="vehicle-form-page">
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="router.back()">← Geri</button>
        <h1>{{ isEditMode ? 'Aracı Düzenle' : 'Yeni Araç Ekle' }}</h1>
      </div>
    </header>

    <div v-if="loading && !form.plateNumber" class="loading">Yükleniyor...</div>

    <form v-else class="form-container" @submit.prevent="handleSubmit">

      <section v-if="!isEditMode" class="form-section photo-recognition-section">
        <h3>Fotoğraftan Otomatik Doldur</h3>
        <div class="photo-upload-area">
          <div v-if="!photoPreview" class="photo-dropzone" @click="photoInputRef?.click()">
            <svg class="photo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909"/>
              <path d="M3.75 20.25h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12.75c0 .828.672 1.5 1.5 1.5z"/>
              <circle cx="8.25" cy="10.5" r="1.5"/>
            </svg>
            <span class="photo-hint">Araç fotoğrafı yükleyin</span>
            <span class="photo-hint-sub">Marka, model, yıl ve renk otomatik doldurulur</span>
          </div>
          <div v-else class="photo-preview-container">
            <img :src="photoPreview" class="photo-preview-img" alt="Araç fotoğrafı" />
            <div class="photo-actions">
              <button
                type="button"
                class="btn btn-primary btn-recognize"
                :disabled="recognizing"
                @click="recognizePhoto"
              >
                {{ recognizing ? 'Analiz ediliyor...' : 'Bilgileri Tanı' }}
              </button>
              <button type="button" class="btn btn-secondary" @click="removePhoto">
                Fotoğrafı Kaldır
              </button>
            </div>
            <div v-if="recognitionResult" class="recognition-badge" :class="recognitionResult.recognized ? 'badge-success' : 'badge-warning'">
              {{ recognitionResult.recognized
                ? `Tanındı (${Math.round(recognitionResult.confidence * 100)}% güven)`
                : 'Araç tanınamadı' }}
            </div>
          </div>
          <input
            ref="photoInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="photo-file-input"
            @change="handlePhotoChange"
          />
        </div>
      </section>

      <section class="form-section">
        <h3>Temel Bilgiler</h3>
        <div class="form-grid">
          <div class="form-group" :class="{ error: hasError('plateNumber') }">
            <label>Plaka <span class="required">*</span></label>
            <input 
              :value="form.plateNumber"
              type="text"
              placeholder="34 ABC 123"
              maxlength="12"
              @input="form.plateNumber = formatPlateInput(($event.target as HTMLInputElement).value)"
              @blur="handleBlur('plateNumber')"
            />
            <span class="error-text">{{ getError('plateNumber') }}</span>
          </div>

          <div class="form-group" :class="{ error: hasError('vinNumber') }">
            <label>Şasi No (VIN) <span class="required">*</span></label>
            <input 
              v-model="form.vinNumber" 
              type="text" 
              maxlength="17"
              placeholder="17 karakterli VIN"
              @blur="handleBlur('vinNumber')"
            />
            <span class="error-text">{{ getError('vinNumber') }}</span>
          </div>

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

          <div class="form-group" :class="{ error: hasError('year') }">
            <label>Model Yılı <span class="required">*</span></label>
            <input 
              v-model.number="form.year" 
              type="number" 
              :min="1990"
              :max="currentYear + 1"
              @blur="handleBlur('year')"
            />
            <span class="error-text">{{ getError('year') }}</span>
          </div>

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
        <h3>Teknik Bilgiler</h3>
        <div class="form-grid">
          <div class="form-group" :class="{ error: hasError('fuelType') }">
            <label>Yakıt Tipi <span class="required">*</span></label>
            <SearchableSelect
              v-model="form.fuelType"
              :options="fuelTypes"
              placeholder="Yakıt tipi seçin"
              search-placeholder="Ara..."
              :error="hasError('fuelType')"
              @blur="handleBlur('fuelType')"
            />
            <span class="error-text">{{ getError('fuelType') }}</span>
          </div>

          <div class="form-group" :class="{ error: hasError('transmission') }">
            <label>Vites <span class="required">*</span></label>
            <SearchableSelect
              v-model="form.transmission"
              :options="transmissionTypes"
              placeholder="Vites seçin"
              search-placeholder="Ara..."
              :error="hasError('transmission')"
              @blur="handleBlur('transmission')"
            />
            <span class="error-text">{{ getError('transmission') }}</span>
          </div>

          <div class="form-group" :class="{ error: hasError('engineCapacity') }">
            <label>Motor Hacmi (cc) <span class="required">*</span></label>
            <input 
              v-model.number="form.engineCapacity" 
              type="number"
              min="0"
              @blur="handleBlur('engineCapacity')"
            />
            <span class="error-text">{{ getError('engineCapacity') }}</span>
          </div>

          <div class="form-group" :class="{ error: hasError('seatCount') }">
            <label>Koltuk Sayısı <span class="required">*</span></label>
            <input 
              v-model.number="form.seatCount" 
              type="number"
              min="1"
              max="50"
              @blur="handleBlur('seatCount')"
            />
            <span class="error-text">{{ getError('seatCount') }}</span>
          </div>

          <div class="form-group" :class="{ error: hasError('currentKm') }">
            <label>Mevcut KM <span class="required">*</span></label>
            <input 
              v-model.number="form.currentKm" 
              type="number"
              :min="minimumEditableKm"
              @blur="handleBlur('currentKm')"
            />
            <span class="error-text">{{ getError('currentKm') }}</span>
          </div>
        </div>
      </section>
      <section class="form-section">
        <h3>Kategori ve Şube</h3>
        <div class="form-grid">
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
        <h3>Fiyatlandırma</h3>
        <div class="form-grid">
          <div class="form-group" :class="{ error: hasError('dailyPrice') }">
            <label>Günlük Fiyat (TL) <span class="required">*</span></label>
            <input 
              v-model.number="form.dailyPrice" 
              type="number"
              min="0"
              step="0.01"
              placeholder="1500.00"
              @blur="handleBlur('dailyPrice')"
            />
            <span class="error-text">{{ getError('dailyPrice') }}</span>
          </div>

          <div class="form-group">
            <label>Haftalık Fiyat (TL)</label>
            <input 
              v-model.number="form.weeklyPrice" 
              type="number"
              min="0"
              step="0.01"
              placeholder="9000.00"
            />
            <span class="help-text">Boş bırakılırsa günlük fiyat × 7 kullanılır</span>
          </div>

          <div class="form-group">
            <label>Aylık Fiyat (TL)</label>
            <input 
              v-model.number="form.monthlyPrice" 
              type="number"
              min="0"
              step="0.01"
              placeholder="30000.00"
            />
            <span class="help-text">Boş bırakılırsa günlük fiyat × 30 kullanılır</span>
          </div>
        </div>
      </section>
      <section class="form-section">
        <h3>Tarihler</h3>
        <div class="form-grid">
          <div class="form-group" :class="{ error: hasError('registrationDate') }">
            <DatePicker
              v-model="form.registrationDate"
              label="Tescil Tarihi *"
              placeholder="Tescil tarihi"
              @closed="handleBlur('registrationDate')"
            />
            <span class="error-text">{{ getError('registrationDate') }}</span>
          </div>

          <div class="form-group" :class="{ error: hasError('insuranceExpiryDate') }">
            <DatePicker
              v-model="form.insuranceExpiryDate"
              label="Sigorta Bitiş Tarihi *"
              placeholder="Sigorta bitiş tarihi"
              @closed="handleBlur('insuranceExpiryDate')"
            />
            <span class="error-text">{{ getError('insuranceExpiryDate') }}</span>
          </div>

          <div class="form-group" :class="{ error: hasError('inspectionExpiryDate') }">
            <DatePicker
              v-model="form.inspectionExpiryDate"
              label="Muayene Bitiş Tarihi *"
              placeholder="Muayene bitiş tarihi"
              @closed="handleBlur('inspectionExpiryDate')"
            />
            <span class="error-text">{{ getError('inspectionExpiryDate') }}</span>
          </div>
        </div>
      </section>
      <section class="form-section">
        <h3>Ek Bilgiler</h3>
        <div class="form-group full-width">
          <label>Notlar</label>
          <textarea 
            v-model="form.notes" 
            rows="4"
            placeholder="Araç hakkında ek notlar..."
          ></textarea>
        </div>
      </section>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="router.back()">
          İptal
        </button>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Kaydediliyor...' : (isEditMode ? 'Güncelle' : 'Kaydet') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.vehicle-form-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  color: var(--color-primary);
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.form-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 32px;
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-of-type {
  margin-bottom: 0;
}

.form-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--color-text);
}

.required {
  color: var(--color-danger);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg);
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group.error input,
.form-group.error select,
.form-group.error textarea {
  border-color: var(--color-danger);
}

.error-text {
  font-size: 12px;
  color: var(--color-danger);
  margin-top: 4px;
  min-height: 18px;
}

.help-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg);
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.photo-recognition-section {
  background: var(--color-bg-secondary);
  border: 1px dashed var(--color-primary);
  border-radius: 10px;
  padding: 24px;
}

.photo-upload-area {
  position: relative;
}

.photo-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.photo-dropzone:hover {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.photo-icon {
  width: 40px;
  height: 40px;
  color: var(--color-text-secondary);
}

.photo-hint {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.photo-hint-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.photo-preview-container {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.photo-preview-img {
  width: 200px;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-recognize {
  min-width: 160px;
}

.recognition-badge {
  align-self: flex-end;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success {
  background: color-mix(in srgb, var(--color-success, #22c55e) 15%, transparent);
  color: var(--color-success, #22c55e);
}

.badge-warning {
  background: color-mix(in srgb, var(--color-warning, #f59e0b) 15%, transparent);
  color: var(--color-warning, #f59e0b);
}

.photo-file-input {
  display: none;
}
</style>



