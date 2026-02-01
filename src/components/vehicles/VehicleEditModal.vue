<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { vehiclesApi, vehicleCategoriesApi, branchesApi } from '@/api'
import { useValidation, rules, useToast } from '@/composables'
import { formatPlateInput } from '@/utils'
import type { Vehicle, VehicleCategory, Branch, UpdateVehicleForm } from '@/types'
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
  dailyPrice: 0,
  notes: ''
})

const currentYear = new Date().getFullYear()
const { validateForm, getError, hasError, touch, reset } = useValidation()

const formRules = computed(() => ({
  plateNumber: { value: form.value.plateNumber, rules: [rules.required(), rules.plate()] },
  vinNumber: { value: form.value.vinNumber, rules: [rules.required(), rules.vin()] },
  brand: { value: form.value.brand, rules: [rules.required()] },
  model: { value: form.value.model, rules: [rules.required()] },
  year: { value: form.value.year, rules: [rules.required(), rules.yearRange(2000, currentYear)] },
  color: { value: form.value.color, rules: [rules.required()] },
  currentKm: { value: form.value.currentKm, rules: [rules.minValue(0)] },
  dailyPrice: { value: form.value.dailyPrice, rules: [rules.required(), rules.positive()] },
  categoryId: { value: form.value.categoryId, rules: [rules.required()] },
  branchId: { value: form.value.branchId, rules: [rules.required('Şube seçiniz')] }
}))

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

async function fetchVehicle() {
  if (!props.vehicleId) return
  
  loading.value = true
  try {
    const vehicle = await vehiclesApi.getById(props.vehicleId)
    form.value = {
      plateNumber: vehicle.plateNumber,
      vinNumber: vehicle.vinNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      engineCapacity: vehicle.engineCapacity,
      seatCount: vehicle.seatCount,
      categoryId: vehicle.categoryId,
      branchId: vehicle.branchId,
      currentKm: vehicle.currentKm,
      insuranceExpiryDate: vehicle.insuranceExpiryDate.split('T')[0],
      inspectionExpiryDate: vehicle.inspectionExpiryDate.split('T')[0],
      dailyPrice: vehicle.dailyPrice,
      notes: vehicle.notes || ''
    }
  } catch {
    toast.error('Araç bilgileri yüklenemedi')
    emit('close')
  } finally {
    loading.value = false
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

  saving.value = true
  try {
    const updatedVehicle = await vehiclesApi.update(props.vehicleId, form.value)
    toast.success('Araç başarıyla güncellendi')
    emit('saved', updatedVehicle)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Güncelleme işlemi başarısız')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  reset()
  emit('close')
}

function handleBlur(field: string) {
  touch(field)
}

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    reset()
    fetchCategories()
    fetchBranches()
    fetchVehicle()
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal">
        <header class="modal-header">
          <h2>Araç Düzenle</h2>
          <button class="close-btn" @click="handleClose">&times;</button>
        </header>

        <div v-if="loading" class="modal-loading">
          <span>Yükleniyor...</span>
        </div>

        <form v-else class="modal-body" @submit.prevent="handleSubmit">
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
                <label>VIN Numarası <span class="required">*</span></label>
                <input 
                  v-model="form.vinNumber" 
                  @blur="handleBlur('vinNumber')" 
                  type="text" 
                  maxlength="17"
                  placeholder="17 karakter"
                />
                <span class="error-text">{{ getError('vinNumber') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('brand') }">
                <label>Marka <span class="required">*</span></label>
                <input 
                  v-model="form.brand" 
                  @blur="handleBlur('brand')" 
                  type="text"
                />
                <span class="error-text">{{ getError('brand') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('model') }">
                <label>Model <span class="required">*</span></label>
                <input 
                  v-model="form.model" 
                  @blur="handleBlur('model')" 
                  type="text"
                />
                <span class="error-text">{{ getError('model') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('year') }">
                <label>Yıl <span class="required">*</span></label>
                <input 
                  v-model.number="form.year" 
                  @blur="handleBlur('year')" 
                  type="number"
                  :min="2000"
                  :max="currentYear"
                />
                <span class="error-text">{{ getError('year') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('color') }">
                <label>Renk <span class="required">*</span></label>
                <input 
                  v-model="form.color" 
                  @blur="handleBlur('color')" 
                  type="text"
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
                <select v-model="form.fuelType">
                  <option v-for="opt in fuelTypeOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Vites</label>
                <select v-model="form.transmission">
                  <option v-for="opt in transmissionOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
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
                <select v-model="form.categoryId" @blur="handleBlur('categoryId')">
                  <option :value="0" disabled>Kategori seçiniz</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
                <span class="error-text">{{ getError('categoryId') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('branchId') }">
                <label>Şube <span class="required">*</span></label>
                <select v-model="form.branchId" @blur="handleBlur('branchId')">
                  <option :value="0" disabled>Şube seçiniz</option>
                  <option v-for="branch in branches" :key="branch.id" :value="branch.id">
                    {{ branch.name }}
                  </option>
                </select>
                <span class="error-text">{{ getError('branchId') }}</span>
              </div>
            </div>
          </section>

          <section class="form-section">
            <h3>Durum ve Fiyat</h3>
            <div class="form-grid">
              <div class="form-group" :class="{ error: hasError('currentKm') }">
                <label>Güncel KM</label>
                <input 
                  v-model.number="form.currentKm" 
                  @blur="handleBlur('currentKm')" 
                  type="number" 
                  min="0"
                />
                <span class="error-text">{{ getError('currentKm') }}</span>
              </div>

              <div class="form-group" :class="{ error: hasError('dailyPrice') }">
                <label>Günlük Fiyat (₺) <span class="required">*</span></label>
                <input 
                  v-model.number="form.dailyPrice" 
                  @blur="handleBlur('dailyPrice')" 
                  type="number" 
                  min="0"
                  step="0.01"
                />
                <span class="error-text">{{ getError('dailyPrice') }}</span>
              </div>

              <div class="form-group">
                <label>Sigorta Bitiş</label>
                <input v-model="form.insuranceExpiryDate" type="date" />
              </div>

              <div class="form-group">
                <label>Muayene Bitiş</label>
                <input v-model="form.inspectionExpiryDate" type="date" />
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

        <footer class="modal-footer">
          <button type="button" class="btn btn-outline" @click="handleClose">İptal</button>
          <button 
            type="button" 
            class="btn btn-primary" 
            :disabled="saving || loading"
            @click="handleSubmit"
          >
            {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-text);
}

.modal-loading {
  padding: 60px;
  text-align: center;
  color: var(--color-text-secondary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.form-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.form-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: span 2;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.required {
  color: var(--color-danger);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-group.error input,
.form-group.error select {
  border-color: var(--color-danger);
  background: #fff5f5;
}

.error-text {
  font-size: 12px;
  color: var(--color-danger);
  min-height: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.full {
    grid-column: span 1;
  }
}
</style>
