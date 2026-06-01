<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { customersApi } from '@/api'
import type { Customer } from '@/types'

interface Props {
  modelValue: number | null
  rentalEndDate: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  'openQuickCreate': []
}>()

const searchQuery = ref('')
const searching = ref(false)
const customers = ref<Customer[]>([])
const selectedCustomer = ref<Customer | null>(null)
const showDropdown = ref(false)
const debounceTimer = ref<number | null>(null)

const hasBlacklistWarning = computed(() => {
  return selectedCustomer.value?.blacklisted === true
})

const hasLicenseWarning = computed(() => {
  if (!selectedCustomer.value?.personalInfo?.licenseExpiryDate || !props.rentalEndDate) {
    return false
  }
  const licenseExpiry = new Date(selectedCustomer.value.personalInfo.licenseExpiryDate)
  const rentalEnd = new Date(props.rentalEndDate)
  rentalEnd.setMonth(rentalEnd.getMonth() + 3)
  return licenseExpiry <= rentalEnd
})

async function searchCustomers(query: string) {
  if (query.length < 2) {
    customers.value = []
    return
  }

  searching.value = true
  try {
    const response = await customersApi.search(query, { size: 10 })
    customers.value = response.content
  } catch {
    customers.value = []
  } finally {
    searching.value = false
  }
}

function handleSearchInput() {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
  debounceTimer.value = globalThis.setTimeout(() => {
    searchCustomers(searchQuery.value)
  }, 300)
}

function selectCustomer(customer: Customer) {
  selectedCustomer.value = customer
  emit('update:modelValue', customer.id)
  showDropdown.value = false
  searchQuery.value = ''
  customers.value = []
}

function clearSelection() {
  selectedCustomer.value = null
  emit('update:modelValue', null)
}

function handleFocus() {
  showDropdown.value = true
}

function handleBlur() {
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

function openQuickCreate() {
  emit('openQuickCreate')
}

async function fetchSelectedCustomer() {
  if (!props.modelValue) return
  
  try {
    selectedCustomer.value = await customersApi.getById(props.modelValue)
  } catch {
    selectedCustomer.value = null
  }
}

watch(() => props.modelValue, (newVal) => {
  if (newVal && !selectedCustomer.value) {
    fetchSelectedCustomer()
  } else if (!newVal) {
    selectedCustomer.value = null
  }
}, { immediate: true })
</script>

<template>
  <div class="customer-selector rcr-customer-selector">
    <div v-if="selectedCustomer" class="selected-customer">
      <div class="customer-card" :class="{ warning: hasBlacklistWarning }">
        <div class="customer-avatar">
          {{ selectedCustomer.displayName.charAt(0).toUpperCase() }}
        </div>
        <div class="customer-info">
          <h4>{{ selectedCustomer.displayName }}</h4>
          <p class="customer-type">
            {{ selectedCustomer.customerType === 'PERSONAL' ? 'Bireysel' : 'Kurumsal' }}
          </p>
          <p class="customer-contact">
            {{ selectedCustomer.phone }} · {{ selectedCustomer.email }}
          </p>
        </div>
        <div class="customer-status">
          <span v-if="hasBlacklistWarning" class="badge danger">
            Kara Liste
          </span>
          <span v-if="hasLicenseWarning" class="badge warning">
            Ehliyet Uyarısı
          </span>
        </div>
        <button class="change-btn" @click="clearSelection">Değiştir</button>
      </div>

      <div v-if="hasBlacklistWarning" class="warning-message danger">
        Bu müşteri kara listede! Kiralama yapılamaz.
        <strong v-if="selectedCustomer.blacklistReason">
          Sebep: {{ selectedCustomer.blacklistReason }}
        </strong>
      </div>

      <div v-if="hasLicenseWarning" class="warning-message warning">
        Müşterinin ehliyeti kiralama bitiş tarihinden önce sona erecek veya yetersiz süre kalıyor.
      </div>
    </div>

    <div v-else class="search-container">
      <div class="search-input-wrapper">
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Ad, telefon veya TC ile ara..."
          @input="handleSearchInput"
          @focus="handleFocus"
          @blur="handleBlur"
        />
        <span v-if="searching" class="search-spinner"></span>
      </div>

      <div v-if="showDropdown" class="dropdown">
        <div v-if="customers.length > 0" class="dropdown-list">
          <div 
            v-for="customer in customers" 
            :key="customer.id"
            class="dropdown-item"
            :class="{ blacklisted: customer.blacklisted }"
            @mousedown.prevent="selectCustomer(customer)"
          >
            <div class="item-avatar">
              {{ customer.displayName.charAt(0).toUpperCase() }}
            </div>
            <div class="item-info">
              <span class="item-name">{{ customer.displayName }}</span>
              <span class="item-details">
                {{ customer.phone }} · {{ customer.customerType === 'PERSONAL' ? 'Bireysel' : 'Kurumsal' }}
              </span>
            </div>
            <span v-if="customer.blacklisted" class="item-badge danger">Kara Liste</span>
          </div>
        </div>

        <div v-else-if="searchQuery.length >= 2 && !searching" class="dropdown-empty">
          <p>Müşteri bulunamadı</p>
        </div>

        <div v-else-if="searchQuery.length < 2" class="dropdown-hint">
          <p>Arama için en az 2 karakter girin</p>
        </div>

        <div class="dropdown-footer">
          <button class="quick-create-btn" @click="openQuickCreate">
            + Yeni Müşteri Ekle
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

