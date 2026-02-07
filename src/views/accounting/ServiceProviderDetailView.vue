<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useEnumTranslations, useToast } from '@/composables'
import type { UpdateServiceProviderRequest } from '@/types'
import { EditProviderModal } from '@/components/accounting'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { translateServiceType, translateProviderType } = useEnumTranslations()

const provider = computed(() => accountingStore.selectedProvider)
const loading = computed(() => accountingStore.providersLoading)

const showEditModal = ref(false)

onMounted(() => {
  const id = Number(route.params.id)
  if (id) accountingStore.fetchProviderById(id)
})

const handleEdit = () => {
  showEditModal.value = true
}

const handleEditSubmit = async (id: number, data: UpdateServiceProviderRequest) => {
  try {
    await accountingStore.updateServiceProvider(id, data)
    toast.success('Servis sağlayıcı başarıyla güncellendi')
    showEditModal.value = false
  } catch (error: any) {
    toast.error(error.message || 'Servis sağlayıcı güncellenirken hata oluştu')
  }
}

const handleToggleActive = async () => {
  if (!provider.value) return

  try {
    if (provider.value.active) {
      await accountingStore.deactivateServiceProvider(provider.value.id)
      toast.success('Servis sağlayıcı pasif yapıldı')
    } else {
      await accountingStore.activateServiceProvider(provider.value.id)
      toast.success('Servis sağlayıcı aktif yapıldı')
    }

    await accountingStore.fetchProviderById(provider.value.id)
  } catch (error: any) {
    toast.error(error.message || 'İşlem sırasında hata oluştu')
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="page-container">
    <button class="back-btn" @click="router.push({ name: 'service-providers' })">
      ← Listeye Dön
    </button>

    <div v-if="loading" class="loading">Yükleniyor...</div>
    <div v-else-if="!provider" class="error">Servis sağlayıcı bulunamadı</div>

    <template v-else>
      <div class="detail-header">
        <div class="header-left">
          <div class="title-section">
            <h1 class="detail-title">{{ provider.name }}</h1>
            <span class="provider-code">{{ provider.code }}</span>
          </div>
          <div class="badges">
            <span :class="['status-badge', provider.active ? 'active' : 'inactive']">
              {{ provider.active ? 'Aktif' : 'Pasif' }}
            </span>
            <span class="type-badge">
              {{ translateProviderType(provider.type) }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="handleEdit">
            Düzenle
          </button>
          <button
            :class="['btn', provider.active ? 'btn-danger' : 'btn-success']"
            @click="handleToggleActive"
          >
            {{ provider.active ? 'Pasif Yap' : 'Aktif Yap' }}
          </button>
        </div>
      </div>

      <div class="detail-grid">

        <div class="detail-card">
          <h3 class="card-title">İletişim Bilgileri</h3>
          <div class="info-list">
            <div class="info-item" v-if="provider.phone">
              <span class="info-label">Telefon</span>
              <span class="info-value">
                <a :href="`tel:${provider.phone}`">{{ provider.phone }}</a>
              </span>
            </div>
            <div class="info-item" v-if="provider.email">
              <span class="info-label">E-posta</span>
              <span class="info-value">
                <a :href="`mailto:${provider.email}`">{{ provider.email }}</a>
              </span>
            </div>
            <div class="info-item" v-if="provider.contactPerson">
              <span class="info-label">İletişim Kişisi</span>
              <span class="info-value">{{ provider.contactPerson }}</span>
            </div>
            <div class="info-item" v-if="provider.contactPhone">
              <span class="info-label">İletişim Telefonu</span>
              <span class="info-value">
                <a :href="`tel:${provider.contactPhone}`">{{ provider.contactPhone }}</a>
              </span>
            </div>
            <div v-if="!provider.phone && !provider.email && !provider.contactPerson" class="empty-info">
              İletişim bilgisi girilmemiş
            </div>
          </div>
        </div>


        <div class="detail-card">
          <h3 class="card-title">Adres Bilgileri</h3>
          <div class="info-list">
            <div class="info-item" v-if="provider.address">
              <span class="info-label">Adres</span>
              <span class="info-value">{{ provider.address }}</span>
            </div>
            <div class="info-item" v-if="provider.city || provider.district">
              <span class="info-label">Şehir / İlçe</span>
              <span class="info-value">
                {{ [provider.district, provider.city].filter(Boolean).join(', ') }}
              </span>
            </div>
            <div v-if="!provider.address && !provider.city && !provider.district" class="empty-info">
              Adres bilgisi girilmemiş
            </div>
          </div>
        </div>


        <div class="detail-card">
          <h3 class="card-title">Vergi Bilgileri</h3>
          <div class="info-list">
            <div class="info-item" v-if="provider.taxNumber">
              <span class="info-label">Vergi Numarası</span>
              <span class="info-value font-mono">{{ provider.taxNumber }}</span>
            </div>
            <div class="info-item" v-if="provider.taxOffice">
              <span class="info-label">Vergi Dairesi</span>
              <span class="info-value">{{ provider.taxOffice }}</span>
            </div>
            <div v-if="!provider.taxNumber && !provider.taxOffice" class="empty-info">
              Vergi bilgisi girilmemiş
            </div>
          </div>
        </div>


        <div class="detail-card">
          <h3 class="card-title">Hizmet Türleri</h3>
          <div v-if="provider.serviceTypes && provider.serviceTypes.length > 0" class="service-types">
            <span
              v-for="type in provider.serviceTypes"
              :key="type"
              class="service-badge"
            >
              {{ translateServiceType(type) }}
            </span>
          </div>
          <div v-else class="empty-info">
            Hizmet türü belirtilmemiş
          </div>
        </div>
      </div>


      <div v-if="provider.notes" class="detail-card notes-card">
        <h3 class="card-title">Notlar</h3>
        <p class="notes-text">{{ provider.notes }}</p>
      </div>


      <div class="meta-info">
        <span>Oluşturan: {{ provider.createdBy }}</span>
        <span>Oluşturulma: {{ formatDate(provider.createdAt) }}</span>
        <span>Son Güncelleme: {{ formatDate(provider.updatedAt) }}</span>
      </div>
    </template>


    <EditProviderModal
      :show="showEditModal"
      :provider="provider"
      @close="showEditModal = false"
      @submit="handleEditSubmit"
    />
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
  margin-bottom: 1.5rem;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--color-primary-dark, #1d4ed8);
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.error {
  color: #dc2626;
}


.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.title-section {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.detail-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text, #111827);
  margin: 0;
}

.provider-code {
  font-size: 1rem;
  color: var(--color-text-secondary, #6b7280);
  font-family: monospace;
}

.badges {
  display: flex;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.375rem 0.75rem;
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

.type-badge {
  padding: 0.375rem 0.75rem;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
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

.btn-secondary {
  background: white;
  color: var(--color-text, #111827);
  border: 1px solid var(--color-border, #d1d5db);
}

.btn-secondary:hover {
  background: var(--color-background, #f3f4f6);
}

.btn-danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.btn-danger:hover {
  background: #fee2e2;
}

.btn-success {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.btn-success:hover {
  background: #dcfce7;
}


.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.detail-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.info-label {
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.info-value {
  font-size: 0.875rem;
  color: var(--color-text, #111827);
  text-align: right;
}

.info-value a {
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.info-value a:hover {
  text-decoration: underline;
}

.font-mono {
  font-family: monospace;
}

.empty-info {
  color: var(--color-text-secondary, #9ca3af);
  font-size: 0.875rem;
  font-style: italic;
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


.notes-card {
  margin-bottom: 1.5rem;
}

.notes-text {
  margin: 0;
  color: var(--color-text, #374151);
  line-height: 1.6;
  white-space: pre-wrap;
}


.meta-info {
  display: flex;
  gap: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  color: var(--color-text-secondary, #9ca3af);
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .meta-info {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
