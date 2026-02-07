<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast, useEnumTranslations } from '@/composables'
import { ProviderType } from '@/types'
import type { ServiceProviderResponse, CreateServiceProviderRequest, UpdateServiceProviderRequest } from '@/types'
import { ProviderCard, CreateProviderModal, EditProviderModal } from '@/components/accounting'

const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { translateProviderType } = useEnumTranslations()

const providers = computed(() => accountingStore.serviceProviders)
const loading = computed(() => accountingStore.providersLoading)

const searchQuery = ref('')
const selectedType = ref<ProviderType | ''>('')
const showInactive = ref(false)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedProvider = ref<ServiceProviderResponse | null>(null)

const providerTypeOptions = [
  { value: '', label: 'Tüm Tipler' },
  ...Object.values(ProviderType).map(value => ({
    value,
    label: translateProviderType(value)
  }))
]

const filteredProviders = computed(() => {
  const providersList = Array.isArray(providers.value) ? providers.value : []
  let result = [...providersList]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.taxNumber?.toLowerCase().includes(query) ||
      p.contactPerson?.toLowerCase().includes(query) ||
      p.code?.toLowerCase().includes(query)
    )
  }

  if (selectedType.value) {
    result = result.filter(p => p.type === selectedType.value)
  }

  if (!showInactive.value) {
    result = result.filter(p => p.active)
  }

  return result
})

const stats = computed(() => {
  const all = Array.isArray(providers.value) ? providers.value : []
  const active = all.filter(p => p.active)
  const byType = Object.values(ProviderType).reduce((acc, type) => {
    acc[type] = all.filter(p => p.type === type && p.active).length
    return acc
  }, {} as Record<ProviderType, number>)

  return {
    total: all.length,
    active: active.length,
    inactive: all.length - active.length,
    byType
  }
})

onMounted(() => {
  loadProviders()
})

const loadProviders = async () => {
  try {
    await accountingStore.fetchServiceProviders(false)
  } catch (error: any) {
    toast.error(error.message || 'Servis sağlayıcılar yüklenemedi')
  }
}

const handleSearch = async () => {
  if (searchQuery.value.length >= 2) {
    try {
      await accountingStore.searchProviders(searchQuery.value)
    } catch (error: any) {
      toast.error(error.message || 'Arama yapılırken hata oluştu')
    }
  } else if (searchQuery.value.length === 0) {
    await loadProviders()
  }
}

const handleProviderClick = (id: number) => {
  router.push({ name: 'provider-detail', params: { id } })
}

const handleEditClick = (id: number) => {
  const provider = providers.value.find(p => p.id === id)
  if (provider) {
    selectedProvider.value = JSON.parse(JSON.stringify(provider)) as ServiceProviderResponse
    showEditModal.value = true
  }
}

const handleCreateSubmit = async (data: CreateServiceProviderRequest) => {
  try {
    await accountingStore.createServiceProvider(data)
    toast.success('Servis sağlayıcı başarıyla oluşturuldu')
    showCreateModal.value = false
    await loadProviders()
  } catch (error: any) {
    toast.error(error.message || 'Servis sağlayıcı oluşturulurken hata oluştu')
  }
}

const handleEditSubmit = async (id: number, data: UpdateServiceProviderRequest) => {
  try {
    await accountingStore.updateServiceProvider(id, data)
    toast.success('Servis sağlayıcı başarıyla güncellendi')
    showEditModal.value = false
    selectedProvider.value = null
    await loadProviders()
  } catch (error: any) {
    toast.error(error.message || 'Servis sağlayıcı güncellenirken hata oluştu')
  }
}

let searchTimeout: number | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    handleSearch()
  }, 300)
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Servis Sağlayıcılar</h1>
        <p class="page-subtitle">Bakım, onarım ve diğer hizmetleri sunan firmalar</p>
      </div>
      <button class="btn btn-primary" @click="showCreateModal = true">
        + Yeni Ekle
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Toplam</span>
      </div>
      <div class="stat-card active">
        <span class="stat-value">{{ stats.active }}</span>
        <span class="stat-label">Aktif</span>
      </div>
      <div class="stat-card inactive">
        <span class="stat-value">{{ stats.inactive }}</span>
        <span class="stat-label">Pasif</span>
      </div>
    </div>

    <div class="filters-section">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Firma adı, vergi no veya yetkili kişi ara..."
        />
      </div>

      <div class="filter-group">
        <select v-model="selectedType" class="filter-select">
          <option v-for="option in providerTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <label class="checkbox-filter">
          <input v-model="showInactive" type="checkbox" />
          Pasif olanları göster
        </label>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="filteredProviders.length === 0" class="empty-state">
      <p v-if="searchQuery || selectedType">Arama kriterlerine uygun servis sağlayıcı bulunamadı.</p>
      <p v-else>Henüz servis sağlayıcı bulunmamaktadır.</p>
      <button v-if="!searchQuery && !selectedType" class="btn btn-primary" @click="showCreateModal = true">
        İlk Servis Sağlayıcıyı Ekle
      </button>
    </div>

    <div v-else class="providers-grid">
      <ProviderCard
        v-for="provider in filteredProviders"
        :key="provider.id"
        :provider="provider"
        @click="handleProviderClick"
        @edit="handleEditClick"
      />
    </div>

    <CreateProviderModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @submit="handleCreateSubmit"
    />

    <EditProviderModal
      :show="showEditModal"
      :provider="selectedProvider"
      @close="showEditModal = false; selectedProvider = null"
      @submit="handleEditSubmit"
    />
  </div>
</template>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text, #111827);
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark, #1d4ed8);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-card.active {
  border-left: 3px solid #22c55e;
}

.stat-card.inactive {
  border-left: 3px solid #6b7280;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text, #111827);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.filters-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.625rem 1rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.filter-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-select {
  padding: 0.625rem 2rem 0.625rem 0.75rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
}

.checkbox-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  white-space: nowrap;
}

.checkbox-filter input {
  accent-color: var(--color-primary, #2563eb);
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  color: var(--color-text-secondary, #6b7280);
}

.empty-state p {
  margin: 0 0 1rem 0;
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-group {
    flex-wrap: wrap;
  }

  .providers-grid {
    grid-template-columns: 1fr;
  }
}
</style>
