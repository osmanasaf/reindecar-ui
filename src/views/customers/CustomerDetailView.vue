<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi } from '@/api'
import { useToast } from '@/composables'
import type { Customer, CustomerType } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const customer = ref<Customer | null>(null)
const loading = ref(true)

const customerId = computed(() => Number(route.params.id))

const typeLabels: Record<CustomerType, string> = {
  PERSONAL: 'Bireysel',
  COMPANY: 'Kurumsal'
}

async function fetchCustomer() {
  loading.value = true
  try {
    customer.value = await customersApi.getById(customerId.value)
  } catch {
    toast.error('Müşteri bilgileri yüklenemedi')
    router.push('/customers')
  } finally {
    loading.value = false
  }
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
  }
  return phone
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR')
}

function maskId(id: string): string {
  if (id.length >= 11) {
    return `${id.slice(0, 3)}****${id.slice(-2)}`
  }
  return '***'
}

onMounted(fetchCustomer)
</script>

<template>
  <div class="customer-detail">
    <div v-if="loading" class="loading">Yükleniyor...</div>

    <template v-else-if="customer">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="router.back()">← Geri</button>
          <div class="title-group">
            <span class="avatar-large">{{ customer.displayName?.charAt(0) || '?' }}</span>
            <div>
              <h1>{{ customer.displayName }}</h1>
              <div class="subtitle">
                <span :class="['type-badge', customer.customerType.toLowerCase()]">
                  {{ typeLabels[customer.customerType] }}
                </span>
                <span class="public-id">{{ customer.publicId }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="customer.blacklisted" class="btn btn-success">
            ✓ Kara Listeden Çıkar
          </button>
          <button v-else class="btn btn-danger">
            ⚠️ Kara Listeye Ekle
          </button>
          <button class="btn btn-outline" @click="router.push(`/customers/${customer.id}/edit`)">✏️ Düzenle</button>
        </div>
      </header>

      <div v-if="customer.blacklisted" class="alert alert-danger">
        ⚠️ Bu müşteri kara listede: {{ customer.blacklistReason }}
      </div>

      <div class="detail-grid">
        <section class="card">
          <h2>İletişim Bilgileri</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Telefon</span>
              <span class="value">{{ formatPhone(customer.phone) }}</span>
            </div>
            <div class="info-item">
              <span class="label">E-posta</span>
              <span class="value">{{ customer.email }}</span>
            </div>
            <div class="info-item full">
              <span class="label">Adres</span>
              <span class="value">{{ customer.address }}, {{ customer.city }}</span>
            </div>
          </div>
        </section>

        <section class="card" v-if="customer.customerType === 'PERSONAL'">
          <h2>Kişisel Bilgiler</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">TC Kimlik No</span>
              <span class="value mono">{{ maskId(customer.nationalId || '') }}</span>
            </div>
            <div class="info-item">
              <span class="label">Doğum Tarihi</span>
              <span class="value">{{ customer.birthDate ? formatDate(customer.birthDate) : '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ehliyet No</span>
              <span class="value">{{ customer.licenseNumber || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ehliyet Sınıfı</span>
              <span class="value">{{ customer.licenseClass || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ehliyet Bitiş</span>
              <span class="value">{{ customer.licenseExpiryDate ? formatDate(customer.licenseExpiryDate) : '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Kredi Skoru</span>
              <span class="value">{{ customer.creditScore || '-' }}</span>
            </div>
          </div>
        </section>

        <section class="card" v-if="customer.customerType === 'COMPANY'">
          <h2>Şirket Bilgileri</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Vergi No</span>
              <span class="value mono">{{ customer.taxNumber || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ticaret Sicil No</span>
              <span class="value">{{ customer.tradeRegistryNumber || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Yetkili Kişi</span>
              <span class="value">{{ customer.authorizedPersonName || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Yetkili Telefon</span>
              <span class="value">{{ customer.authorizedPersonPhone ? formatPhone(customer.authorizedPersonPhone) : '-' }}</span>
            </div>
          </div>
        </section>

        <section class="card stats-card">
          <h2>İstatistikler</h2>
          <div class="stats-grid">
            <div class="stat">
              <span class="stat-value">{{ customer.totalRentals || 0 }}</span>
              <span class="stat-label">Toplam Kiralama</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ customer.activeRentals || 0 }}</span>
              <span class="stat-label">Aktif Kiralama</span>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.customer-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-large {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
}

.title-group h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.subtitle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.personal {
  background: #dbeafe;
  color: #1d4ed8;
}

.type-badge.company {
  background: #f3e8ff;
  color: #7c3aed;
}

.public-id {
  color: var(--color-text-muted);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.alert {
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
}

.alert-danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.card h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: var(--color-text-secondary);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full {
  grid-column: span 2;
}

.info-item .label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.info-item .value {
  font-size: 15px;
  font-weight: 500;
}

.info-item .value.mono {
  font-family: monospace;
}

.stats-card {
  grid-column: span 2;
}

.stats-grid {
  display: flex;
  gap: 48px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-card {
    grid-column: span 1;
  }
}
</style>
