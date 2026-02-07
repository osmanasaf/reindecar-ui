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
      <h2 class="list-title">Sigorta Poliçeleri</h2>
      <div class="header-actions">
        <label class="toggle-label">
          <input 
            type="checkbox" 
            v-model="showAll"
            @change="handleToggleShowAll"
            class="toggle-checkbox"
          />
          <span class="toggle-text">Pasif poliçeleri göster</span>
        </label>
        <button class="btn btn-primary" @click="emit('createNew')">
          + Yeni Poliçe
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="displayInsurances.length === 0" class="empty-state">
      <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="empty-text">{{ showAll ? 'Henüz sigorta poliçesi bulunmamaktadır.' : 'Aktif sigorta poliçesi bulunmamaktadır.' }}</p>
      <button class="btn btn-primary" @click="emit('createNew')">
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

.list-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
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
}

.toggle-checkbox {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.toggle-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark, #1d4ed8);
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  gap: 1rem;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  color: var(--color-text-secondary, #9ca3af);
}

.empty-text {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.insurance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
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
