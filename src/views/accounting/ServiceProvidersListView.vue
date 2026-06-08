<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast, useEnumTranslations } from '@/composables'
import { ProviderType } from '@/types'
import type { ServiceProviderResponse, CreateServiceProviderRequest, UpdateServiceProviderRequest } from '@/types'
import { CreateProviderModal, EditProviderModal } from '@/components/accounting'
import ServiceProvidersTable from '@/components/accounting/service-providers/ServiceProvidersTable.vue'
import { RcPageHeader, RcButton, RcEmpty, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'

const router = useRouter()
const route = useRoute()
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

const filteredProviders = computed(() => {
  const list = Array.isArray(providers.value) ? providers.value : []
  let result = [...list]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(q)
      || p.taxNumber?.toLowerCase().includes(q)
      || p.contactPerson?.toLowerCase().includes(q)
      || p.code?.toLowerCase().includes(q)
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
    byType,
  }
})

const typeChips = computed(() =>
  Object.values(ProviderType).map(type => ({
    id: type,
    label: translateProviderType(type),
    count: stats.value.byType[type] ?? 0,
  }))
)

onMounted(async () => {
  await loadProviders()
  if (route.query.create === '1') {
    showCreateModal.value = true
  }
})

async function loadProviders() {
  try {
    await accountingStore.fetchServiceProviders(false)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Servis sağlayıcılar yüklenemedi')
  }
}

async function handleSearch() {
  if (searchQuery.value.length >= 2) {
    try {
      await accountingStore.searchProviders(searchQuery.value)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Arama yapılırken hata oluştu')
    }
  } else if (searchQuery.value.length === 0) {
    await loadProviders()
  }
}

function handleProviderClick(id: number) {
  router.push({ name: 'provider-detail', params: { id } })
}

function handleEditClick(id: number) {
  const provider = providers.value.find(p => p.id === id)
  if (provider) {
    selectedProvider.value = JSON.parse(JSON.stringify(provider)) as ServiceProviderResponse
    showEditModal.value = true
  }
}

async function handleCreateSubmit(data: CreateServiceProviderRequest) {
  try {
    await accountingStore.createServiceProvider(data)
    toast.success('Servis sağlayıcı başarıyla oluşturuldu')
    showCreateModal.value = false
    await loadProviders()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Servis sağlayıcı oluşturulurken hata oluştu')
  }
}

async function handleEditSubmit(id: number, data: UpdateServiceProviderRequest) {
  try {
    await accountingStore.updateServiceProvider(id, data)
    toast.success('Servis sağlayıcı başarıyla güncellendi')
    showEditModal.value = false
    selectedProvider.value = null
    await loadProviders()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Servis sağlayıcı güncellenirken hata oluştu')
  }
}

function toggleTypeFilter(type: ProviderType) {
  selectedType.value = selectedType.value === type ? '' : type
}

let searchTimeout: number | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    void handleSearch()
  }, 300)
})
</script>

<template>
  <div class="rc-page rca-providers">
    <RcPageHeader
      title="Servis Sağlayıcılar"
      subtitle="Bakım, onarım ve diğer hizmetleri sunan firmalar"
    >
      <template #actions>
        <RcButton variant="accent" @click="showCreateModal = true">
          <RcIcon name="plus" :size="14" />
          Yeni sağlayıcı
        </RcButton>
      </template>
    </RcPageHeader>

    <div class="rca-stats rca-stats--payables">
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam</div>
        <div class="rca-stat__value rc-num">{{ stats.total }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Aktif</div>
        <div class="rca-stat__value rca-stat__value--success rc-num">{{ stats.active }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Pasif</div>
        <div class="rca-stat__value rc-num">{{ stats.inactive }}</div>
      </div>
    </div>

    <div v-if="stats.total > 0" class="rc-filterbar" style="margin-bottom: 14px">
      <button
        v-for="chip in typeChips"
        :key="chip.id"
        type="button"
        class="rc-chip"
        :class="{ 'rc-chip--on': selectedType === chip.id }"
        @click="toggleTypeFilter(chip.id)"
      >
        {{ chip.label }}
        <span v-if="chip.count > 0" class="rc-chip__count">{{ chip.count }}</span>
      </button>
    </div>

    <div class="rc-filterbar rcv-filterbar--slim">
      <div class="rc-input-group" style="flex: 1; min-width: 240px">
        <RcIcon name="search" class="rc-icon" :size="16" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Firma, vergi no veya yetkili…"
        />
      </div>
      <label class="rca-filter-check">
        <input v-model="showInactive" type="checkbox" />
        Pasif olanları göster
      </label>
    </div>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="5" />

    <RcEmpty
      v-else-if="filteredProviders.length === 0"
      :title="searchQuery || selectedType ? 'Sonuç bulunamadı' : 'Sağlayıcı yok'"
      :description="searchQuery || selectedType ? 'Arama kriterlerini değiştirin' : 'Henüz servis sağlayıcı kaydı yok'"
    >
      <template #icon><RcIcon name="wrench" :size="32" /></template>
      <template v-if="!searchQuery && !selectedType" #action>
        <RcButton variant="accent" @click="showCreateModal = true">İlk sağlayıcıyı ekle</RcButton>
      </template>
    </RcEmpty>

    <ServiceProvidersTable
      v-else
      :providers="filteredProviders"
      @row-click="handleProviderClick"
      @edit="handleEditClick"
    />

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
