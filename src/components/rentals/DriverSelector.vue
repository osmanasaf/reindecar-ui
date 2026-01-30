<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { driversApi } from '@/api'
import { useToast } from '@/composables'
import { validateTCKN, validatePhone, required } from '@/utils/validators'
import type { Driver, CreateDriverForm } from '@/types'
import type { DriverAvailability } from '@/api/drivers.api'

const props = defineProps<{
  modelValue: number[]
  primaryDriverId: number | null
  customerId?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  'update:primaryDriverId': [value: number | null]
}>()

const toast = useToast()
const drivers = ref<Driver[]>([])
const loading = ref(false)
const searchQuery = ref('')
const showNewDriverForm = ref(false)
const driverAvailability = ref<Map<number, DriverAvailability>>(new Map())
const checkingAvailability = ref(false)

const newDriver = ref<CreateDriverForm>({
  nationalId: '',
  firstName: '',
  lastName: '',
  licenseNumber: '',
  licenseExpiryDate: '',
  licenseClass: '',
  phone: '',
  customerId: props.customerId
})

const formErrors = ref<Record<string, string>>({})
const touched = ref<Record<string, boolean>>({})

const validateField = (fieldName: keyof CreateDriverForm): string => {
  const value = newDriver.value[fieldName]
  
  switch (fieldName) {
    case 'nationalId':
      if (!required(value)) return 'TC Kimlik No zorunludur'
      if (!validateTCKN(value as string)) return 'Geçersiz TC Kimlik No'
      return ''
    
    case 'firstName':
      if (!required(value)) return 'Ad zorunludur'
      if ((value as string).length < 2) return 'Ad en az 2 karakter olmalı'
      return ''
    
    case 'lastName':
      if (!required(value)) return 'Soyad zorunludur'
      if ((value as string).length < 2) return 'Soyad en az 2 karakter olmalı'
      return ''
    
    case 'phone':
      if (!required(value)) return 'Telefon zorunludur'
      if (!validatePhone(value as string)) return 'Geçersiz telefon (5xxxxxxxxx formatında olmalı)'
      return ''
    
    case 'licenseNumber':
      if (!required(value)) return 'Ehliyet No zorunludur'
      if ((value as string).length < 5) return 'Ehliyet No en az 5 karakter olmalı'
      return ''
    
    case 'licenseExpiryDate': {
      if (!required(value)) return 'Ehliyet geçerlilik tarihi zorunludur'
      const expiryDate = new Date(value as string)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (expiryDate < today) return 'Ehliyet tarihi geçmiş olamaz'
      return ''
    }
    
    default:
      return ''
  }
}

const validateForm = (): boolean => {
  const fields: Array<keyof CreateDriverForm> = [
    'nationalId',
    'firstName', 
    'lastName',
    'phone',
    'licenseNumber',
    'licenseExpiryDate'
  ]
  
  let isValid = true
  const errors: Record<string, string> = {}
  
  fields.forEach(field => {
    const error = validateField(field)
    if (error) {
      errors[field] = error
      isValid = false
    }
  })
  
  formErrors.value = errors
  return isValid
}

const handleBlur = (fieldName: keyof CreateDriverForm) => {
  touched.value[fieldName] = true
  const error = validateField(fieldName)
  if (error) {
    formErrors.value[fieldName] = error
  } else {
    delete formErrors.value[fieldName]
  }
}

const getFieldError = (fieldName: string): string => {
  return touched.value[fieldName] ? formErrors.value[fieldName] || '' : ''
}

const filteredDrivers = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return drivers.value
  
  return drivers.value.filter(driver => 
    driver.fullName.toLowerCase().includes(query) ||
    driver.licenseNumber.toLowerCase().includes(query) ||
    driver.nationalId.includes(query)
  )
})

const isDriverDisabled = (driver: Driver): boolean => {
  if (!driver.active) return true
  const expiryDate = new Date(driver.licenseExpiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (expiryDate < today) return true
  
  // Müsaitlik kontrolü - eğer müsait değilse disable et
  const availability = driverAvailability.value.get(driver.id)
  if (availability && !availability.available) return true
  
  return false
}

const getDriverStatus = (driver: Driver): string => {
  if (!driver.active) return 'Pasif'
  const expiryDate = new Date(driver.licenseExpiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (expiryDate < today) return 'Ehliyet süresi dolmuş'
  
  // Müsaitlik durumu
  const availability = driverAvailability.value.get(driver.id)
  if (availability && !availability.available) {
    return 'Aktif kiralamada'
  }
  
  return ''
}

const isDriverSelected = (driverId: number) => {
  return props.modelValue.includes(driverId)
}

const toggleDriver = async (driverId: number) => {
  const driver = drivers.value.find(d => d.id === driverId)
  if (!driver) return
  
  // Seçmeden önce disable kontrolü
  if (isDriverDisabled(driver)) {
    const status = getDriverStatus(driver)
    toast.error(`Bu sürücü seçilemez: ${status}`)
    return
  }
  
  const currentSelection = [...props.modelValue]
  const index = currentSelection.indexOf(driverId)
  
  if (index > -1) {
    // Seçimi kaldır
    currentSelection.splice(index, 1)
    if (props.primaryDriverId === driverId) {
      emit('update:primaryDriverId', null)
    }
  } else {
    // Yeni seçim - müsaitlik kontrolü yap
    const canAdd = await checkAndAddDriver(driverId, currentSelection)
    if (!canAdd) return
  }
  
  emit('update:modelValue', currentSelection)
}

async function checkAndAddDriver(driverId: number, currentSelection: number[]): Promise<boolean> {
  checkingAvailability.value = true
  try {
    const availability = await driversApi.checkAvailability(driverId)
    driverAvailability.value.set(driverId, availability)
    
    if (!availability.available) {
      toast.error('Bu sürücü zaten aktif bir kiralamada')
      return false
    }
    
    currentSelection.push(driverId)
    if (currentSelection.length === 1) {
      emit('update:primaryDriverId', driverId)
    }
    return true
  } catch (error) {
    // Hata durumunda yine de devam et, backend son kontrolü yapacak
    console.warn('Müsaitlik kontrolü başarısız:', error)
    currentSelection.push(driverId)
    if (currentSelection.length === 1) {
      emit('update:primaryDriverId', driverId)
    }
    return true
  } finally {
    checkingAvailability.value = false
  }
}

const setPrimaryDriver = (driverId: number) => {
  if (props.modelValue.includes(driverId)) {
    emit('update:primaryDriverId', driverId)
  }
}

async function fetchDrivers() {
  if (!props.customerId) {
    drivers.value = []
    return
  }
  loading.value = true
  try {
    drivers.value = await driversApi.getAll({ 
      customerId: props.customerId, 
      active: true 
    })
    
    // Tüm sürücüler için müsaitlik kontrolü yap
    await checkAllDriversAvailability()
  } catch {
    toast.error('Sürücüler yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function checkAllDriversAvailability() {
  if (drivers.value.length === 0) return
  
  const promises = drivers.value.map(async (driver) => {
    try {
      const availability = await driversApi.checkAvailability(driver.id)
      driverAvailability.value.set(driver.id, availability)
    } catch {
      // Hata durumunda varsayılan olarak müsait kabul et
      driverAvailability.value.set(driver.id, {
        driverId: driver.id,
        available: true
      })
    }
  })
  
  await Promise.all(promises)
}

async function createDriver() {
  if (!validateForm()) {
    toast.error('Lütfen tüm zorunlu alanları doğru şekilde doldurun')
    // Tüm alanları touched olarak işaretle
    Object.keys(newDriver.value).forEach(key => {
      touched.value[key] = true
    })
    return
  }

  try {
    const created = await driversApi.create(newDriver.value)
    toast.success('Sürücü başarıyla oluşturuldu')
    
    drivers.value.push(created)
    toggleDriver(created.id)
    
    resetForm()
    showNewDriverForm.value = false
  } catch (error: any) {
    toast.error(error?.message || 'Sürücü oluşturulamadı')
  }
}

function resetForm() {
  newDriver.value = {
    nationalId: '',
    firstName: '',
    lastName: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    licenseClass: '',
    phone: '',
    customerId: props.customerId
  }
  formErrors.value = {}
  touched.value = {}
}

function toggleNewDriverForm() {
  showNewDriverForm.value = !showNewDriverForm.value
  if (!showNewDriverForm.value) {
    resetForm()
  }
}

watch(() => props.customerId, (newCustomerId) => {
  newDriver.value.customerId = newCustomerId
  // Müşteri değiştiğinde seçimleri temizle ve yeniden yükle
  emit('update:modelValue', [])
  emit('update:primaryDriverId', null)
  if (newCustomerId) {
    fetchDrivers()
  } else {
    drivers.value = []
  }
}, { immediate: true })
</script>

<template>
  <div class="driver-selector">
    <div class="driver-header">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Sürücü ara (isim, TC, ehliyet no)"
          class="search-input"
        />
      </div>
      <button class="btn btn-outline" @click="toggleNewDriverForm">
        {{ showNewDriverForm ? '✕ İptal' : '+ Yeni Sürücü' }}
      </button>
    </div>

    <div v-if="showNewDriverForm" class="new-driver-form">
      <h4>Yeni Sürücü Ekle</h4>
      <div class="form-grid">
        <div class="form-group" :class="{ 'has-error': getFieldError('nationalId') }">
          <label for="nationalId">TC Kimlik No *</label>
          <input 
            id="nationalId" 
            v-model="newDriver.nationalId" 
            type="text" 
            maxlength="11"
            placeholder="Örn: 12345678901"
            @blur="handleBlur('nationalId')"
          />
          <span v-if="getFieldError('nationalId')" class="error-message">
            {{ getFieldError('nationalId') }}
          </span>
        </div>
        <div class="form-group" :class="{ 'has-error': getFieldError('firstName') }">
          <label for="firstName">Ad *</label>
          <input 
            id="firstName" 
            v-model="newDriver.firstName" 
            type="text"
            @blur="handleBlur('firstName')"
          />
          <span v-if="getFieldError('firstName')" class="error-message">
            {{ getFieldError('firstName') }}
          </span>
        </div>
        <div class="form-group" :class="{ 'has-error': getFieldError('lastName') }">
          <label for="lastName">Soyad *</label>
          <input 
            id="lastName" 
            v-model="newDriver.lastName" 
            type="text"
            @blur="handleBlur('lastName')"
          />
          <span v-if="getFieldError('lastName')" class="error-message">
            {{ getFieldError('lastName') }}
          </span>
        </div>
        <div class="form-group" :class="{ 'has-error': getFieldError('phone') }">
          <label for="phone">Telefon *</label>
          <input 
            id="phone" 
            v-model="newDriver.phone" 
            type="tel"
            placeholder="5xxxxxxxxx"
            maxlength="10"
            @blur="handleBlur('phone')"
          />
          <span v-if="getFieldError('phone')" class="error-message">
            {{ getFieldError('phone') }}
          </span>
        </div>
        <div class="form-group" :class="{ 'has-error': getFieldError('licenseNumber') }">
          <label for="licenseNumber">Ehliyet No *</label>
          <input 
            id="licenseNumber" 
            v-model="newDriver.licenseNumber" 
            type="text"
            @blur="handleBlur('licenseNumber')"
          />
          <span v-if="getFieldError('licenseNumber')" class="error-message">
            {{ getFieldError('licenseNumber') }}
          </span>
        </div>
        <div class="form-group">
          <label for="licenseClass">Ehliyet Sınıfı</label>
          <input 
            id="licenseClass" 
            v-model="newDriver.licenseClass" 
            type="text" 
            placeholder="B" 
          />
        </div>
        <div class="form-group full-width" :class="{ 'has-error': getFieldError('licenseExpiryDate') }">
          <label for="licenseExpiryDate">Ehliyet Geçerlilik Tarihi *</label>
          <input 
            id="licenseExpiryDate" 
            v-model="newDriver.licenseExpiryDate" 
            type="date"
            :min="new Date().toISOString().split('T')[0]"
            @blur="handleBlur('licenseExpiryDate')"
          />
          <span v-if="getFieldError('licenseExpiryDate')" class="error-message">
            {{ getFieldError('licenseExpiryDate') }}
          </span>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" @click="createDriver">Kaydet ve Ekle</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      Sürücüler yükleniyor...
    </div>

    <div v-else-if="filteredDrivers.length === 0" class="empty-state">
      <p v-if="searchQuery">Arama sonucu bulunamadı</p>
      <p v-else-if="!customerId">Önce bir müşteri seçiniz</p>
      <p v-else>Bu müşteriye ait kayıtlı sürücü bulunmuyor</p>
    </div>

    <div v-else class="driver-list">
      <div
        v-for="driver in filteredDrivers"
        :key="driver.id"
        :class="['driver-item', { 
          selected: isDriverSelected(driver.id),
          disabled: isDriverDisabled(driver)
        }]"
      >
        <div class="driver-checkbox">
          <input
            type="checkbox"
            :checked="isDriverSelected(driver.id)"
            :disabled="isDriverDisabled(driver)"
            @change="toggleDriver(driver.id)"
          />
        </div>
        <div class="driver-info" @click="!isDriverDisabled(driver) && toggleDriver(driver.id)">
          <div class="driver-name">
            {{ driver.fullName }}
            <span v-if="driver.customerId === customerId" class="badge">Müşteriye Ait</span>
            <span v-if="getDriverStatus(driver)" class="badge badge-danger">
              {{ getDriverStatus(driver) }}
            </span>
          </div>
          <div class="driver-details">
            Ehliyet: {{ driver.licenseNumber }}
            <span v-if="driver.licenseClass"> | Sınıf: {{ driver.licenseClass }}</span>
            <span> | Geçerlilik: {{ new Date(driver.licenseExpiryDate).toLocaleDateString('tr-TR') }}</span>
          </div>
        </div>
        <div class="driver-actions">
          <label
            v-if="isDriverSelected(driver.id)"
            class="primary-radio"
            @click.stop
          >
            <input
              type="radio"
              name="primaryDriver"
              :checked="primaryDriverId === driver.id"
              @change="setPrimaryDriver(driver.id)"
            />
            <span>Ana Sürücü</span>
          </label>
        </div>
      </div>
    </div>

    <div v-if="modelValue.length > 0" class="selection-summary">
      <span>{{ modelValue.length }} sürücü seçildi</span>
      <span v-if="primaryDriverId" class="primary-info">
        • Ana: {{ drivers.find(d => d.id === primaryDriverId)?.fullName }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.driver-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.driver-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.new-driver-form {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
}

.new-driver-form h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-surface);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group.has-error input {
  border-color: var(--color-danger);
}

.error-message {
  font-size: 12px;
  color: var(--color-danger);
  margin-top: 4px;
  display: block;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px dashed var(--color-border);
}

.driver-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.driver-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-surface);
}

.driver-item:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.driver-item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.driver-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.driver-item.disabled .driver-info {
  cursor: not-allowed;
}

.driver-checkbox input[type="checkbox"]:disabled {
  cursor: not-allowed;
}

.driver-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.driver-info {
  flex: 1;
  cursor: pointer;
}

.driver-name {
  font-weight: 500;
  font-size: 15px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-info-light);
  color: var(--color-info);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.badge-danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.driver-details {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.driver-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.primary-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-radio:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.primary-radio input[type="radio"] {
  cursor: pointer;
}

.selection-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-success-light);
  border-radius: 8px;
  font-size: 14px;
  color: var(--color-success);
}

.primary-info {
  font-weight: 500;
}

.btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .driver-header {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
