<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { rentalsApi } from '@/api'
import { useToast } from '@/composables'
import type { Rental, RentalStatus, RentalType } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const rental = ref<Rental | null>(null)
const loading = ref(true)

const rentalId = computed(() => Number(route.params.id))

const statusLabels: Record<RentalStatus, string> = {
  PENDING: 'Beklemede',
  RESERVED: 'Rezerve',
  ACTIVE: 'Aktif',
  RETURNING: 'İade Sürecinde',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal'
}

const statusColors: Record<RentalStatus, string> = {
  PENDING: 'warning',
  RESERVED: 'info',
  ACTIVE: 'success',
  RETURNING: 'primary',
  COMPLETED: 'muted',
  CANCELLED: 'danger'
}

const typeLabels: Record<RentalType, string> = {
  DAILY: 'Günlük Kiralama',
  MONTHLY: 'Aylık Kiralama',
  LEASING: 'Uzun Dönem Leasing'
}

async function fetchRental() {
  loading.value = true
  try {
    rental.value = await rentalsApi.getById(rentalId.value)
  } catch {
    toast.error('Kiralama bilgileri yüklenemedi')
    router.push('/rentals')
  } finally {
    loading.value = false
  }
}

async function handleActivate() {
  if (!rental.value) return
  try {
    await rentalsApi.activate(rental.value.id, { startKm: 0, fuelLevel: 'FULL' })
    toast.success('Araç teslim edildi')
    fetchRental()
  } catch {
    toast.error('İşlem başarısız')
  }
}

async function handleComplete() {
  if (!rental.value) return
  try {
    await rentalsApi.complete(rental.value.id, { endKm: 0, fuelLevel: 'FULL' })
    toast.success('Kiralama tamamlandı')
    fetchRental()
  } catch {
    toast.error('İşlem başarısız')
  }
}

async function handleCancel() {
  if (!rental.value) return
  if (!confirm('Kiralamayı iptal etmek istediğinizden emin misiniz?')) return
  try {
    await rentalsApi.cancel(rental.value.id)
    toast.success('Kiralama iptal edildi')
    fetchRental()
  } catch {
    toast.error('İşlem başarısız')
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR')
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('tr-TR')
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

onMounted(fetchRental)
</script>

<template>
  <div class="rental-detail">
    <div v-if="loading" class="loading">Yükleniyor...</div>

    <template v-else-if="rental">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="router.back()">← Geri</button>
          <div class="title-group">
            <h1>Kiralama #{{ rental.id }}</h1>
            <span :class="['status-badge', statusColors[rental.status]]">
              {{ statusLabels[rental.status] }}
            </span>
          </div>
          <span class="rental-type">{{ typeLabels[rental.rentalType] }}</span>
        </div>
        <div class="header-actions">
          <button 
            v-if="rental.status === 'RESERVED'" 
            class="btn btn-success"
            @click="handleActivate"
          >
            🚗 Teslim Et
          </button>
          <button 
            v-if="rental.status === 'ACTIVE'" 
            class="btn btn-primary"
            @click="handleComplete"
          >
            ✓ Tamamla
          </button>
          <button 
            v-if="rental.status !== 'COMPLETED' && rental.status !== 'CANCELLED'"
            class="btn btn-danger"
            @click="handleCancel"
          >
            ✕ İptal Et
          </button>
        </div>
      </header>

      <div class="detail-grid">
        <section class="card customer-card">
          <h2>👤 Müşteri</h2>
          <div class="info-content">
            <RouterLink :to="`/customers/${rental.customer?.id}`" class="customer-link">
              <span class="avatar">{{ rental.customer?.displayName?.charAt(0) }}</span>
              <div>
                <strong>{{ rental.customer?.displayName }}</strong>
                <span>{{ rental.customer?.phone }}</span>
              </div>
            </RouterLink>
          </div>
        </section>

        <section class="card vehicle-card">
          <h2>🚗 Araç</h2>
          <div class="info-content">
            <RouterLink :to="`/vehicles/${rental.vehicle?.id}`" class="vehicle-link">
              <strong class="plate">{{ rental.vehicle?.plateNumber }}</strong>
              <span>{{ rental.vehicle?.brand }} {{ rental.vehicle?.model }}</span>
            </RouterLink>
          </div>
        </section>

        <section class="card dates-card">
          <h2>📅 Tarihler</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Başlangıç</span>
              <span class="value">{{ formatDate(rental.startDate) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Bitiş</span>
              <span class="value">{{ formatDate(rental.endDate) }}</span>
            </div>
            <div class="info-item" v-if="rental.actualStartDate">
              <span class="label">Fiili Başlangıç</span>
              <span class="value">{{ formatDateTime(rental.actualStartDate) }}</span>
            </div>
            <div class="info-item" v-if="rental.actualEndDate">
              <span class="label">Fiili Bitiş</span>
              <span class="value">{{ formatDateTime(rental.actualEndDate) }}</span>
            </div>
          </div>
        </section>

        <section class="card km-card">
          <h2>📍 Kilometre</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Başlangıç KM</span>
              <span class="value">{{ rental.startKm ? formatKm(rental.startKm) : '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Bitiş KM</span>
              <span class="value">{{ rental.endKm ? formatKm(rental.endKm) : '-' }}</span>
            </div>
          </div>
        </section>

        <section class="card payment-card full-width">
          <h2>💰 Ödeme Bilgileri</h2>
          <div class="payment-grid">
            <div class="payment-item">
              <span class="label">Günlük Fiyat</span>
              <span class="value">{{ formatCurrency(rental.dailyRate) }}</span>
            </div>
            <div class="payment-item">
              <span class="label">İndirim</span>
              <span class="value">{{ formatCurrency(rental.discountAmount || 0) }}</span>
            </div>
            <div class="payment-item">
              <span class="label">Ekstra Ücret</span>
              <span class="value">{{ formatCurrency(rental.extraCharges || 0) }}</span>
            </div>
            <div class="payment-item total">
              <span class="label">Toplam</span>
              <span class="value">{{ formatCurrency(rental.totalAmount) }}</span>
            </div>
            <div class="payment-item">
              <span class="label">Ödenen</span>
              <span class="value success">{{ formatCurrency(rental.paidAmount || 0) }}</span>
            </div>
            <div class="payment-item">
              <span class="label">Kalan</span>
              <span class="value danger">{{ formatCurrency((rental.totalAmount || 0) - (rental.paidAmount || 0)) }}</span>
            </div>
          </div>
        </section>
      </div>

      <section class="card notes-card" v-if="rental.notes">
        <h2>📝 Notlar</h2>
        <p>{{ rental.notes }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.rental-detail {
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
  margin-bottom: 32px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 8px;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-group h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.success { background: var(--color-success-light); color: var(--color-success); }
.status-badge.warning { background: var(--color-warning-light); color: var(--color-warning); }
.status-badge.info { background: var(--color-info-light); color: var(--color-info); }
.status-badge.primary { background: var(--color-primary-light); color: var(--color-primary); }
.status-badge.danger { background: var(--color-danger-light); color: var(--color-danger); }
.status-badge.muted { background: var(--color-bg-secondary); color: var(--color-text-muted); }

.rental-type {
  font-size: 14px;
  color: var(--color-text-secondary);
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

.btn-success { background: var(--color-success); color: white; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-danger { background: var(--color-danger); color: white; }

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

.card.full-width {
  grid-column: span 2;
}

.card h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: var(--color-text-secondary);
}

.customer-link,
.vehicle-link {
  display: flex;
  align-items: center;
  gap: 16px;
  text-decoration: none;
  color: inherit;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.15s;
}

.customer-link:hover,
.vehicle-link:hover {
  background: var(--color-bg-secondary);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
}

.customer-link div,
.vehicle-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-link span:last-child {
  font-size: 13px;
  color: var(--color-text-muted);
}

.plate {
  font-size: 20px;
  font-weight: 700;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.info-item .value {
  font-size: 15px;
  font-weight: 500;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.payment-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.payment-item .label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.payment-item .value {
  font-size: 18px;
  font-weight: 600;
}

.payment-item.total .value {
  font-size: 24px;
  color: var(--color-primary);
}

.payment-item .value.success {
  color: var(--color-success);
}

.payment-item .value.danger {
  color: var(--color-danger);
}

.notes-card {
  margin-top: 24px;
}

.notes-card p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .card.full-width {
    grid-column: span 1;
  }
  
  .payment-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
