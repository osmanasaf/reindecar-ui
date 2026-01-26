<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import type { Vehicle, VehicleStatus } from '@/types'
import VehicleEditModal from '@/components/vehicles/VehicleEditModal.vue'
import VehicleDamageMap from '@/components/vehicles/VehicleDamageMap.vue'
import VehicleMaintenanceMap from '@/components/vehicles/VehicleMaintenanceMap.vue'
import VehicleHistory from '@/components/vehicles/VehicleHistory.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const vehicle = ref<Vehicle | null>(null)
const loading = ref(true)
const showEditModal = ref(false)
const activeTab = ref<'info' | 'history' | 'damages' | 'maintenance'>('info')

const vehicleId = computed(() => Number(route.params.id))

const statusLabels: Record<VehicleStatus, string> = {
  AVAILABLE: 'Müsait',
  RENTED: 'Kirada',
  MAINTENANCE: 'Bakımda',
  RESERVED: 'Rezerve',
  OUT_OF_SERVICE: 'Hizmet Dışı'
}

const statusColors: Record<VehicleStatus, string> = {
  AVAILABLE: 'success',
  RENTED: 'warning',
  MAINTENANCE: 'info',
  RESERVED: 'primary',
  OUT_OF_SERVICE: 'danger'
}

async function fetchVehicle() {
  loading.value = true
  try {
    vehicle.value = await vehiclesApi.getById(vehicleId.value)
  } catch {
    toast.error('Araç bilgileri yüklenemedi')
    router.push('/vehicles')
  } finally {
    loading.value = false
  }
}

function safeNumber(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue
  const num = Number(value)
  return Number.isNaN(num) ? defaultValue : num
}

function formatKm(km: unknown): string {
  const num = safeNumber(km)
  return new Intl.NumberFormat('tr-TR').format(num) + ' km'
}

function formatDate(date: unknown): string {
  if (!date) return '-'
  const d = new Date(String(date))
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('tr-TR')
}

function formatCurrency(amount: unknown): string {
  const num = safeNumber(amount)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num)
}

function handleVehicleSaved(updatedVehicle: Vehicle) {
  vehicle.value = updatedVehicle
  toast.success('Araç güncellendi')
}

onMounted(fetchVehicle)
</script>

<template>
  <div class="vehicle-detail">
    <div v-if="loading" class="loading">Yükleniyor...</div>

    <template v-else-if="vehicle">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="router.back()">← Geri</button>
          <div class="title-group">
            <h1>{{ vehicle.plateNumber }}</h1>
            <span :class="['status-badge', statusColors[vehicle.status]]">
              {{ statusLabels[vehicle.status] }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" @click="showEditModal = true">Düzenle</button>
        </div>
      </header>

      <div class="tabs">
        <button
          :class="['tab', { active: activeTab === 'info' }]"
          @click="activeTab = 'info'"
        >
          Bilgiler
        </button>
        <button
          :class="['tab', { active: activeTab === 'history' }]"
          @click="activeTab = 'history'"
        >
          Araç Geçmişi
        </button>
        <button
          :class="['tab', { active: activeTab === 'damages' }]"
          @click="activeTab = 'damages'"
        >
          Hasar Haritası
        </button>
        <button
          :class="['tab', { active: activeTab === 'maintenance' }]"
          @click="activeTab = 'maintenance'"
        >
          Bakım Haritası
        </button>
      </div>

      <div v-if="activeTab === 'info'" class="tab-content">
        <div class="detail-grid">
          <section class="card info-card">
            <h2>Araç Bilgileri</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Marka</span>
                <span class="value">{{ vehicle.brand }}</span>
              </div>
              <div class="info-item">
                <span class="label">Model</span>
                <span class="value">{{ vehicle.model }}</span>
              </div>
              <div class="info-item">
                <span class="label">Yıl</span>
                <span class="value">{{ vehicle.year }}</span>
              </div>
              <div class="info-item">
                <span class="label">Renk</span>
                <span class="value">{{ vehicle.color }}</span>
              </div>
              <div class="info-item">
                <span class="label">Yakıt Tipi</span>
                <span class="value">{{ vehicle.fuelType }}</span>
              </div>
              <div class="info-item">
                <span class="label">Vites</span>
                <span class="value">{{ vehicle.transmission }}</span>
              </div>
              <div class="info-item">
                <span class="label">Motor Hacmi</span>
                <span class="value">{{ vehicle.engineCapacity }} cc</span>
              </div>
              <div class="info-item">
                <span class="label">Koltuk Sayısı</span>
                <span class="value">{{ vehicle.seatCount }}</span>
              </div>
            </div>
          </section>

          <section class="card status-card">
            <h2>Durum Bilgileri</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Güncel KM</span>
                <span class="value highlight">{{ formatKm(vehicle.currentKm) }}</span>
              </div>
              <div class="info-item">
                <span class="label">Günlük Fiyat</span>
                <span class="value highlight">{{ formatCurrency(vehicle.dailyPrice) }}</span>
              </div>
              <div class="info-item">
                <span class="label">Şube</span>
                <span class="value">{{ vehicle.branch?.name || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Kategori</span>
                <span class="value">{{ vehicle.category?.name || '-' }}</span>
              </div>
            </div>
          </section>

          <section class="card dates-card">
            <h2>Tarihler</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Sigorta Bitiş</span>
                <span class="value">{{ formatDate(vehicle.insuranceExpiryDate) }}</span>
              </div>
              <div class="info-item">
                <span class="label">Muayene Bitiş</span>
                <span class="value">{{ formatDate(vehicle.inspectionExpiryDate) }}</span>
              </div>
              <div class="info-item">
                <span class="label">Tescil Tarihi</span>
                <span class="value">{{ formatDate(vehicle.registrationDate) }}</span>
              </div>
            </div>
          </section>

          <section class="card id-card">
            <h2>Kimlik Bilgileri</h2>
            <div class="info-grid">
              <div class="info-item full">
                <span class="label">VIN Numarası</span>
                <span class="value mono">{{ vehicle.vinNumber }}</span>
              </div>
            </div>
          </section>

          <section class="card notes-card" v-if="vehicle.notes">
            <h2>Notlar</h2>
            <p>{{ vehicle.notes }}</p>
          </section>
        </div>
      </div>

      <div v-else-if="activeTab === 'history'" class="tab-content">
        <VehicleHistory :vehicle-id="vehicleId" />
      </div>

      <div v-else-if="activeTab === 'damages'" class="tab-content">
        <VehicleDamageMap :vehicle-id="vehicleId" />
      </div>

      <div v-else-if="activeTab === 'maintenance'" class="tab-content">
        <VehicleMaintenanceMap :vehicle-id="vehicleId" />
      </div>

      <VehicleEditModal
        :visible="showEditModal"
        :vehicle-id="vehicleId"
        @close="showEditModal = false"
        @saved="handleVehicleSaved"
      />
    </template>
  </div>
</template>

<style scoped>
.vehicle-detail {
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
  gap: 12px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.back-btn:hover {
  color: var(--color-primary);
}

.title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-group h1 {
  font-size: 32px;
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

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
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
  color: var(--color-text);
}

.info-item .value.highlight {
  font-size: 18px;
  color: var(--color-primary);
}

.info-item .value.mono {
  font-family: monospace;
  font-size: 14px;
}

.notes-card {
  margin-top: 24px;
}

.notes-card p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--color-border);
}

.tab {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab:hover {
  color: var(--color-text);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-content {
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
