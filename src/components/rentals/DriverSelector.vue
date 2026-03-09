<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { customersApi, referenceDataApi } from '@/api'
import { useToast } from '@/composables'
import { formatPhoneInput } from '@/utils/phone'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import type { Driver, CreateDriverForm } from '@/types'

const props = defineProps<{
  modelValue: number[]
  primaryDriverId: number | null
  customerId: number
  rentalEndDate?: string
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
const licenseClassOptions = ref<{ value: number; label: string }[]>([])
const loadingLicenseClasses = ref(false)

const newDriver = ref<CreateDriverForm>({
  nationalId: '',
  firstName: '',
  lastName: '',
  licenseNumber: '',
  licenseExpiryDate: '',
  licenseClassId: undefined,
  phone: '',
  customerId: props.customerId
})

async function fetchLicenseClasses() {
  loadingLicenseClasses.value = true
  try {
    const list = await referenceDataApi.getLicenseClasses()
    licenseClassOptions.value = list.map(lc => ({ value: lc.id, label: lc.code }))
  } catch {
    licenseClassOptions.value = []
  } finally {
    loadingLicenseClasses.value = false
  }
}

function getDriverDisplayName(driver: Driver): string {
  if (driver.fullName) return driver.fullName
  return `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'İsimsiz Sürücü'
}

function isLicenseExpiredForRental(driver: Driver): boolean {
  if (!props.rentalEndDate || !driver.licenseExpiryDate) return false
  return new Date(driver.licenseExpiryDate) < new Date(props.rentalEndDate)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR')
}

const filteredDrivers = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return drivers.value
  
  return drivers.value.filter(driver => {
    const displayName = getDriverDisplayName(driver).toLowerCase()
    return displayName.includes(query) ||
      driver.licenseNumber?.toLowerCase().includes(query) ||
      driver.nationalId?.includes(query)
  })
})

const isDriverSelected = (driverId: number) => {
  return props.modelValue.includes(driverId)
}

const toggleDriver = (driver: Driver) => {
  if (isLicenseExpiredForRental(driver)) return
  const driverId = driver.id
  const currentSelection = [...props.modelValue]
  const index = currentSelection.indexOf(driverId)
  
  if (index > -1) {
    currentSelection.splice(index, 1)
    if (props.primaryDriverId === driverId) {
      emit('update:primaryDriverId', null)
    }
  } else {
    currentSelection.push(driverId)
    if (currentSelection.length === 1) {
      emit('update:primaryDriverId', driverId)
    }
  }
  
  emit('update:modelValue', currentSelection)
}

const setPrimaryDriver = (driver: Driver) => {
  if (isLicenseExpiredForRental(driver)) return
  if (props.modelValue.includes(driver.id)) {
    emit('update:primaryDriverId', driver.id)
  }
}

async function fetchDrivers() {
  if (!props.customerId) {
    drivers.value = []
    return
  }
  loading.value = true
  try {
    drivers.value = await customersApi.getDrivers(props.customerId, true)
  } catch (err) {
    toast.apiError(err, 'Sürücüler yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function createDriver() {
  if (!props.customerId) {
    toast.error('Önce müşteri seçmelisiniz')
    return
  }
  try {
    const created = await customersApi.createDriver(props.customerId, newDriver.value)
    toast.success('Sürücü başarıyla oluşturuldu')
    
    drivers.value.push(created)
    toggleDriver(created)
    
    resetForm()
    showNewDriverForm.value = false
  } catch (err) {
    toast.apiError(err, 'Sürücü oluşturulamadı')
  }
}

function resetForm() {
  newDriver.value = {
    nationalId: '',
    firstName: '',
    lastName: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    licenseClassId: undefined,
    phone: '',
    customerId: props.customerId
  }
}

function toggleNewDriverForm() {
  showNewDriverForm.value = !showNewDriverForm.value
  if (!showNewDriverForm.value) {
    resetForm()
  }
}

function handlePhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  newDriver.value.phone = formatPhoneInput(target.value)
}

onMounted(() => {
  fetchLicenseClasses()
})

watch(() => props.customerId, (newCustomerId) => {
  newDriver.value.customerId = newCustomerId

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
        <div class="form-group">
          <label for="nationalId">TC Kimlik No *</label>
          <input id="nationalId" v-model="newDriver.nationalId" type="text" maxlength="11" required />
        </div>
        <div class="form-group">
          <label for="firstName">Ad *</label>
          <input id="firstName" v-model="newDriver.firstName" type="text" required />
        </div>
        <div class="form-group">
          <label for="lastName">Soyad *</label>
          <input id="lastName" v-model="newDriver.lastName" type="text" required />
        </div>
        <div class="form-group">
          <label for="phone">Telefon</label>
          <input
            id="phone"
            v-model="newDriver.phone"
            type="tel"
            inputmode="numeric"
            maxlength="13"
            placeholder="555 111 11 11"
            @input="handlePhoneInput"
          />
        </div>
        <div class="form-group">
          <label for="licenseNumber">Ehliyet No *</label>
          <input id="licenseNumber" v-model="newDriver.licenseNumber" type="text" required />
        </div>
        <div class="form-group">
          <label>Ehliyet Sınıfı</label>
          <SearchableSelect
            v-model="newDriver.licenseClassId"
            :options="licenseClassOptions"
            placeholder="Sınıf seçin"
            search-placeholder="Ara..."
            clearable
            :loading="loadingLicenseClasses"
          />
        </div>
        <div class="form-group full-width">
          <DatePicker
            v-model="newDriver.licenseExpiryDate"
            label="Ehliyet Geçerlilik Tarihi *"
            placeholder="Ehliyet geçerlilik tarihi"
          />
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
      <p v-else>Henüz kayıtlı sürücü bulunmuyor</p>
    </div>

    <div v-else class="driver-list">
      <div
        v-for="driver in filteredDrivers"
        :key="driver.id"
        :class="['driver-item', { selected: isDriverSelected(driver.id), 'license-expired': isLicenseExpiredForRental(driver) }]"
        @click="toggleDriver(driver)"
      >
        <div class="driver-checkbox">
          <input
            type="checkbox"
            :checked="isDriverSelected(driver.id)"
            :disabled="isLicenseExpiredForRental(driver)"
            @click.stop="toggleDriver(driver)"
          />
        </div>
        <div class="driver-info">
          <div class="driver-name">
            {{ getDriverDisplayName(driver) }}
            <span v-if="driver.customerId === customerId" class="badge">Müşteriye Ait</span>
            <span v-if="isLicenseExpiredForRental(driver)" class="badge-expired">
              Ehliyet geçersiz
            </span>
          </div>
          <div class="driver-details">
            <span v-if="driver.licenseNumber">Ehliyet: {{ driver.licenseNumber }}</span>
            <span v-if="driver.licenseClassName || driver.licenseClass"> | Sınıf: {{ driver.licenseClassName || driver.licenseClass }}</span>
            <span v-if="driver.nationalId"> | TC: {{ driver.nationalId.substring(0, 3) }}***</span>
            <span v-if="driver.licenseExpiryDate" :class="{ 'expiry-danger': isLicenseExpiredForRental(driver) }">
              | Bitiş: {{ formatDate(driver.licenseExpiryDate) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="modelValue.length > 0" class="selection-summary">
      <span>{{ modelValue.length }} sürücü seçildi</span>
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

.driver-item.license-expired {
  border-color: var(--color-danger, #dc2626);
  background: var(--color-danger-light, #fee2e2);
  cursor: not-allowed;
  opacity: 0.75;
}

.driver-item.license-expired:hover {
  border-color: var(--color-danger, #dc2626);
  background: var(--color-danger-light, #fee2e2);
}

.driver-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.driver-info {
  flex: 1;
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

.badge-expired {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-danger-light, #fee2e2);
  color: var(--color-danger, #b91c1c);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.driver-details {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.expiry-danger {
  color: var(--color-danger, #b91c1c);
  font-weight: 500;
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
