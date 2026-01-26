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
  debounceTimer.value = window.setTimeout(() => {
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
  <div class="customer-selector">
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

<style scoped>
.customer-selector {
  position: relative;
}

.selected-customer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.customer-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  border: 2px solid var(--color-success);
  border-radius: 12px;
  padding: 16px;
}

.customer-card.warning {
  border-color: var(--color-danger);
  background: #fff5f5;
}

.customer-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}

.customer-info {
  flex: 1;
}

.customer-info h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.customer-type {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 4px 0;
}

.customer-contact {
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 0;
}

.customer-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.badge.danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.badge.warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.change-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.change-btn:hover {
  background: var(--color-bg-secondary);
}

.warning-message {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.warning-message.danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.warning-message.warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.warning-message strong {
  display: block;
  margin-top: 4px;
}

.search-container {
  position: relative;
}

.search-input-wrapper {
  position: relative;
}

.search-input-wrapper input {
  width: 100%;
  padding: 14px 16px;
  padding-right: 40px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  font-size: 15px;
  background: var(--color-surface);
  transition: all 0.2s;
}

.search-input-wrapper input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px var(--color-primary-light);
}

.search-spinner {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  overflow: hidden;
}

.dropdown-list {
  max-height: 280px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--color-bg-secondary);
}

.dropdown-item.blacklisted {
  opacity: 0.7;
  background: #fff5f5;
}

.item-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
}

.item-details {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.item-badge {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
}

.item-badge.danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.dropdown-empty,
.dropdown-hint {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

.dropdown-empty p,
.dropdown-hint p {
  margin: 0;
  font-size: 14px;
}

.dropdown-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.quick-create-btn {
  width: 100%;
  padding: 10px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.quick-create-btn:hover {
  background: var(--color-primary-hover);
}
</style>
