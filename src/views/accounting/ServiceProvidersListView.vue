<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast } from '@/composables'
import { ProviderCard } from '@/components/accounting'

const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()

const providers = computed(() => accountingStore.serviceProviders)
const loading = computed(() => accountingStore.providersLoading)

onMounted(() => {
  loadProviders()
})

const loadProviders = async () => {
  try {
    await accountingStore.fetchServiceProviders(true)
  } catch (error: any) {
    toast.error(error.message || 'Servis sağlayıcılar yüklenemedi')
  }
}

const handleProviderClick = (id: number) => {
  router.push({ name: 'provider-detail', params: { id } })
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Servis Sağlayıcılar</h1>
        <p class="page-subtitle">Bakım, onarım ve diğer hizmetleri sunan firmalar</p>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="providers.length === 0" class="empty-state">
      <p>Henüz servis sağlayıcı bulunmamaktadır.</p>
    </div>

    <div v-else class="providers-grid">
      <ProviderCard
        v-for="provider in providers"
        :key="provider.id"
        :provider="provider"
        @click="handleProviderClick"
      />
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
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

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}
</style>
