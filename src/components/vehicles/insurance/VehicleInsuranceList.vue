<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { vehicleInsurancesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleInsuranceResponse } from '@/types'
import { RcButton, RcBadge, RcEmpty } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import VehicleInsuranceCard from './VehicleInsuranceCard.vue'

const props = defineProps<{
  vehicleId: number
}>()

const emit = defineEmits<{
  createNew: []
}>()

const toast = useToast()
const insurances = ref<VehicleInsuranceResponse[]>([])
const loading = ref(true)
const showAll = ref(false)
const actionLoadingId = ref<number | null>(null)

const activeInsurances = computed(() => insurances.value.filter(ins => ins.active))

const displayInsurances = computed(() =>
  showAll.value ? insurances.value : activeInsurances.value
)

async function loadInsurances() {
  loading.value = true
  try {
    insurances.value = await vehicleInsurancesApi.getAllByVehicle(props.vehicleId)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Sigorta poliçeleri yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function handleActivate(id: number) {
  if (actionLoadingId.value !== null) return
  actionLoadingId.value = id
  try {
    await vehicleInsurancesApi.activate(id)
    toast.success('Poliçe aktif edildi')
    await loadInsurances()
  } catch (err: unknown) {
    toast.apiError(err, 'Poliçe aktif edilemedi')
  } finally {
    actionLoadingId.value = null
  }
}

async function handleDeactivate(id: number) {
  if (actionLoadingId.value !== null) return
  const confirmed = window.confirm(
    'Bu poliçeyi pasife almak istediğinize emin misiniz? Listede pasif olarak görünecektir.'
  )
  if (!confirmed) return
  actionLoadingId.value = id
  try {
    await vehicleInsurancesApi.deactivate(id)
    toast.success('Poliçe pasife alındı')
    await loadInsurances()
  } catch (err: unknown) {
    toast.apiError(err, 'Poliçe pasife alınamadı')
  } finally {
    actionLoadingId.value = null
  }
}

onMounted(loadInsurances)

defineExpose({ refresh: loadInsurances })
</script>

<template>
  <div class="rc-veh-insurance">
    <div class="rc-veh-insurance__header">
      <div class="rc-veh-insurance__title-row">
        <h2 class="rc-veh-insurance__title">Sigorta Poliçeleri</h2>
        <template v-if="!loading">
          <RcBadge variant="success">{{ activeInsurances.length }} Aktif</RcBadge>
          <RcBadge
            v-if="insurances.length > activeInsurances.length"
            variant="default"
          >
            {{ insurances.length - activeInsurances.length }} Pasif
          </RcBadge>
        </template>
      </div>
      <div class="rc-veh-insurance__actions">
        <label class="rc-veh-map__toggle toggle-pill">
          <input
            v-model="showAll"
            type="checkbox"
            class="toggle-input"
            aria-label="Pasif poliçeleri göster"
          />
          <span class="toggle-track" :class="{ active: showAll }">
            <span class="toggle-thumb" />
          </span>
          <span class="toggle-text">Pasif poliçeleri göster</span>
        </label>
        <RcButton variant="accent" size="sm" @click="emit('createNew')">
          <RcIcon name="plus" />
          Yeni Poliçe
        </RcButton>
      </div>
    </div>

    <div v-if="loading" class="rc-veh-map__loading loading-state">
      <div class="loading-spinner rc-veh-map__spinner" />
      <span>Poliçeler yükleniyor...</span>
    </div>

    <RcEmpty
      v-else-if="displayInsurances.length === 0"
      :title="showAll ? 'Henüz sigorta poliçesi yok' : 'Aktif poliçe yok'"
      :description="
        showAll
          ? 'Bu araca ait poliçe kaydı bulunmuyor.'
          : 'Pasif poliçeleri görmek için yukarıdaki seçeneği açın.'
      "
    >
      <template #icon>
        <RcIcon name="shield" :size="28" />
      </template>
      <template #action>
        <RcButton variant="accent" size="sm" @click="emit('createNew')">
          <RcIcon name="plus" />
          İlk Poliçeyi Ekle
        </RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rc-veh-insurance__grid">
      <VehicleInsuranceCard
        v-for="insurance in displayInsurances"
        :key="insurance.id"
        :insurance="insurance"
        :disabled="actionLoadingId !== null"
        @activate="handleActivate"
        @deactivate="handleDeactivate"
      />
    </div>
  </div>
</template>
