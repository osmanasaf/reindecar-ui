<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useEnumTranslations } from '@/composables'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()
const { translateServiceType } = useEnumTranslations()

const provider = computed(() => accountingStore.selectedProvider)
const loading = computed(() => accountingStore.providersLoading)

onMounted(() => {
  const id = Number(route.params.id)
  if (id) accountingStore.fetchProviderById(id)
})
</script>

<template>
  <div class="page-container">
    <button class="back-btn" @click="router.push({ name: 'service-providers' })">← Geri</button>

    <div v-if="loading" class="loading">Yükleniyor...</div>
    <div v-else-if="!provider" class="error">Servis sağlayıcı bulunamadı</div>

    <div v-else class="detail-container">
      <div class="detail-header">
        <div>
          <h1 class="detail-title">{{ provider.name }}</h1>
          <p class="detail-subtitle">{{ provider.code }}</p>
        </div>
        <span :class="['status-badge', provider.active ? 'active' : 'inactive']">
          {{ provider.active ? 'Aktif' : 'Pasif' }}
        </span>
      </div>

      <div class="detail-card">
        <h3 class="card-title">İletişim Bilgileri</h3>
        <div class="info-grid">
          <div v-if="provider.phone" class="info-item">
            <span class="label">Telefon:</span>
            <span class="value">{{ provider.phone }}</span>
          </div>
          <div v-if="provider.email" class="info-item">
            <span class="label">E-posta:</span>
            <span class="value">{{ provider.email }}</span>
          </div>
          <div v-if="provider.contactPerson" class="info-item">
            <span class="label">İletişim Kişisi:</span>
            <span class="value">{{ provider.contactPerson }}</span>
          </div>
          <div v-if="provider.address" class="info-item">
            <span class="label">Adres:</span>
            <span class="value">{{ provider.address }}</span>
          </div>
        </div>

        <h4 class="subsection-title">Hizmet Türleri</h4>
        <div class="service-types">
          <span
            v-for="type in provider.serviceTypes"
            :key="type"
            class="service-badge"
          >
            {{ translateServiceType(type) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-primary, #2563eb);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.detail-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.detail-subtitle {
  color: var(--color-text-secondary, #6b7280);
  font-family: monospace;
  margin: 0;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.active {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.status-badge.inactive {
  background: #f9fafb;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.detail-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.subsection-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 1.5rem 0 1rem 0;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.info-item .label {
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
  flex-shrink: 0;
}

.info-item .value {
  text-align: right;
}

.service-types {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.service-badge {
  padding: 0.375rem 0.75rem;
  background: var(--color-background, #f3f4f6);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  font-size: 0.875rem;
}
</style>
