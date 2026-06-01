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
  <div class="driver-selector rcr-driver-selector">
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
            :model-value="newDriver.licenseClassId ?? null"
            :options="licenseClassOptions"
            placeholder="Sınıf seçin"
            search-placeholder="Ara..."
            clearable
            :loading="loadingLicenseClasses"
            @update:model-value="newDriver.licenseClassId = ($event as number | undefined) ?? undefined"
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

