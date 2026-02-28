<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { vehicleInsurancesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleInsuranceResponse } from '@/types'
import VehicleInsuranceCard from './VehicleInsuranceCard.vue'

interface Props {
  vehicleId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  createNew: []
}>()

const toast = useToast()
const insurances = ref<VehicleInsuranceResponse[]>([])
const loading = ref(true)
const showAll = ref(false)

const activeInsurances = computed(() => {
  return insurances.value.filter(ins => ins.active)
})

const displayInsurances = computed(() => {
  return showAll.value ? insurances.value : activeInsurances.value
})

const loadInsurances = async () => {
  loading.value = true
  try {
    insurances.value = showAll.value 
      ? await vehicleInsurancesApi.getAllByVehicle(props.vehicleId)
      : await vehicleInsurancesApi.getByVehicle(props.vehicleId)
  } catch (error: any) {
    toast.error(error.message || 'Sigorta poliçeleri yüklenemedi')
  } finally {
    loading.value = false
  }
}

const handleToggleShowAll = async () => {
  showAll.value = !showAll.value
  await loadInsurances()
}

onMounted(() => {
  loadInsurances()
})

defineExpose({
  refresh: loadInsurances
})
</script>

<template>
  <div class="insurance-list">
    <div class="list-header">
      <div class="header-title-group">
        <h2 class="list-title">Sigorta Poliçeleri</h2>
        <div v-if="!loading" class="summary-badges">
          <span class="badge badge-active">{{ activeInsurances.length }} Aktif</span>
          <span v-if="insurances.length > activeInsurances.length" class="badge badge-passive">
            {{ insurances.length - activeInsurances.length }} Pasif
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button class="toggle-label" type="button" @click="handleToggleShowAll" :aria-pressed="showAll">
          <span class="toggle-track" :class="{ active: showAll }">
            <span class="toggle-thumb"></span>
          </span>
          <span class="toggle-text">Pasif poliçeleri göster</span>
        </button>
        <button class="btn btn-primary" @click="emit('createNew')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Poliçe
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>Poliçeler yükleniyor...</span>
    </div>

    <div v-else-if="displayInsurances.length === 0" class="empty-state">
      <div class="empty-icon-wrap">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <p class="empty-title">{{ showAll ? 'Henüz sigorta poliçesi bulunmamaktadır.' : 'Aktif sigorta poliçesi bulunmamaktadır.' }}</p>
      <p class="empty-subtitle">{{ showAll ? '' : 'Pasif poliçeleri görmek için yukarıdaki seçeneği açın.' }}</p>
      <button class="btn btn-primary" @click="emit('createNew')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        İlk Poliçeyi Ekle
      </button>
    </div>

    <div v-else class="insurance-grid">
      <VehicleInsuranceCard
        v-for="insurance in displayInsurances"
        :key="insurance.id"
        :insurance="insurance"
      />
    </div>
  </div>
</template>

<style scoped>
.insurance-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.list-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.summary-badges {
  display: flex;
  gap: 0.375rem;
}

.badge {
  padding: 0.2rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-active {
  background: #dcfce7;
  color: #166534;
}

.badge-passive {
  background: #f3f4f6;
  color: #4b5563;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
}

.toggle-track {
  position: relative;
  display: inline-block;
  width: 2.25rem;
  height: 1.25rem;
  background: var(--color-border, #d1d5db);
  border-radius: 9999px;
  transition: background 0.2s;
  cursor: pointer;
}

.toggle-track.active {
  background: var(--color-primary, #2563eb);
}

.toggle-thumb {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1rem;
  height: 1rem;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-track.active .toggle-thumb {
  transform: translateX(1rem);
}

.toggle-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border, #e5e7eb);
  border-top-color: var(--color-primary, #2563eb);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1.5rem;
  background: var(--color-surface, white);
  border: 2px dashed var(--color-border, #e5e7eb);
  border-radius: 1rem;
  gap: 0.75rem;
}

.empty-icon-wrap {
  width: 4rem;
  height: 4rem;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.empty-icon-wrap svg {
  width: 2rem;
  height: 2rem;
  color: var(--color-text-secondary, #9ca3af);
}

.empty-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text, #374151);
  margin: 0;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.insurance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .insurance-grid {
    grid-template-columns: 1fr;
  }
}
</style>
