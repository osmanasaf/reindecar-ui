<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi } from '@/api'
import { useToast } from '@/composables'
import type { Customer, CustomerType, Driver, CreateDriverForm } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const customer = ref<Customer | null>(null)
const loading = ref(true)
const drivers = ref<Driver[]>([])
const loadingDrivers = ref(false)
const showDriverForm = ref(false)
const savingDriver = ref(false)

const newDriver = ref<CreateDriverForm>({
  nationalId: '',
  firstName: '',
  lastName: '',
  licenseNumber: '',
  licenseExpiryDate: '',
  licenseClass: '',
  phone: ''
})

const customerId = computed(() => Number(route.params.id))

const typeLabels: Record<CustomerType, string> = {
  PERSONAL: 'Bireysel',
  COMPANY: 'Kurumsal'
}

async function fetchCustomer() {
  loading.value = true
  try {
    customer.value = await customersApi.getById(customerId.value)
    fetchDrivers()
  } catch {
    toast.error('Müşteri bilgileri yüklenemedi')
    router.push('/customers')
  } finally {
    loading.value = false
  }
}

async function fetchDrivers() {
  loadingDrivers.value = true
  try {
    drivers.value = await customersApi.getDrivers(customerId.value)
  } catch (err) {
    toast.apiError(err, 'Sürücüler yüklenemedi')
  } finally {
    loadingDrivers.value = false
  }
}

async function createDriver() {
  savingDriver.value = true
  try {
    const created = await customersApi.createDriver(customerId.value, newDriver.value)
    toast.success('Sürücü başarıyla eklendi')
    drivers.value.push(created)
    resetDriverForm()
    showDriverForm.value = false
  } catch (err) {
    toast.apiError(err, 'Sürücü eklenemedi')
  } finally {
    savingDriver.value = false
  }
}

function resetDriverForm() {
  newDriver.value = {
    nationalId: '',
    firstName: '',
    lastName: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    licenseClass: '',
    phone: ''
  }
}

function getDriverDisplayName(driver: Driver): string {
  if (driver.fullName) return driver.fullName
  return `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'İsimsiz Sürücü'
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

        <section class="card drivers-card">
          <div class="card-header">
            <h2>Sürücüler</h2>
            <button class="btn btn-primary btn-sm" @click="showDriverForm = !showDriverForm">
              {{ showDriverForm ? '✕ İptal' : '+ Sürücü Ekle' }}
            </button>
          </div>

          <div v-if="showDriverForm" class="driver-form">
            <div class="form-grid">
              <div class="form-group">
                <label>Ad *</label>
                <input v-model="newDriver.firstName" type="text" placeholder="Ad" />
              </div>
              <div class="form-group">
                <label>Soyad *</label>
                <input v-model="newDriver.lastName" type="text" placeholder="Soyad" />
              </div>
              <div class="form-group">
                <label>TC Kimlik No *</label>
                <input v-model="newDriver.nationalId" type="text" maxlength="11" placeholder="11 haneli TC No" />
              </div>
              <div class="form-group">
                <label>Telefon</label>
                <input v-model="newDriver.phone" type="tel" placeholder="05XX..." />
              </div>
              <div class="form-group">
                <label>Ehliyet No *</label>
                <input v-model="newDriver.licenseNumber" type="text" placeholder="Ehliyet numarası" />
              </div>
              <div class="form-group">
                <label>Ehliyet Sınıfı</label>
                <input v-model="newDriver.licenseClass" type="text" placeholder="B" />
              </div>
              <div class="form-group full">
                <label>Ehliyet Geçerlilik Tarihi *</label>
                <input v-model="newDriver.licenseExpiryDate" type="date" />
              </div>
            </div>
            <div class="form-actions">
              <button class="btn btn-outline" @click="showDriverForm = false; resetDriverForm()">İptal</button>
              <button class="btn btn-primary" :disabled="savingDriver" @click="createDriver">
                {{ savingDriver ? 'Kaydediliyor...' : 'Kaydet' }}
              </button>
            </div>
          </div>

          <div v-if="loadingDrivers" class="loading-small">Yükleniyor...</div>
          <div v-else-if="drivers.length === 0" class="empty-state">
            Henüz kayıtlı sürücü yok
          </div>
          <div v-else class="drivers-list">
            <div v-for="driver in drivers" :key="driver.id" class="driver-item">
              <div class="driver-avatar">{{ driver.firstName?.charAt(0) || '?' }}</div>
              <div class="driver-info">
                <div class="driver-name">
                  {{ getDriverDisplayName(driver) }}
                  <span v-if="driver.primary" class="badge-primary">Ana Sürücü</span>
                  <span v-if="!driver.active" class="badge-inactive">Pasif</span>
                </div>
                <div class="driver-details">
                  TC: {{ driver.nationalId?.substring(0, 3) }}*** | 
                  Ehliyet: {{ driver.licenseNumber || '-' }}
                  <span v-if="driver.licenseClass"> | Sınıf: {{ driver.licenseClass }}</span>
                </div>
              </div>
              <div class="driver-expiry">
                <span class="label">Ehliyet Bitiş</span>
                <span class="value">{{ driver.licenseExpiryDate ? formatDate(driver.licenseExpiryDate) : '-' }}</span>
              </div>
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

.drivers-card {
  grid-column: span 2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h2 {
  margin: 0;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 13px;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.driver-form {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: span 2;
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
  gap: 12px;
}

.loading-small {
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px dashed var(--color-border);
}

.drivers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.driver-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.driver-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
}

.driver-info {
  flex: 1;
}

.driver-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.driver-details {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.badge-primary {
  padding: 2px 8px;
  background: var(--color-success-light);
  color: var(--color-success);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.badge-inactive {
  padding: 2px 8px;
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.driver-expiry {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.driver-expiry .label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.driver-expiry .value {
  font-size: 13px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-card,
  .drivers-card {
    grid-column: span 1;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.full {
    grid-column: span 1;
  }
}
</style>
