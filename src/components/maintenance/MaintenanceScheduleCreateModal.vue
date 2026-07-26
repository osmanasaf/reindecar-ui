<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { maintenanceSchedulesApi, vehiclesApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import { RcModal, RcField, RcButton } from '@/components/rc'
import { SearchableSelect } from '@/components/common'
import { MaintenanceType } from '@/types/enums'
import {
  MAINTENANCE_SCHEDULE_TYPE_LABELS,
  type MaintenanceScheduleType,
} from '@/types/entities'
import type { CreateMaintenanceScheduleForm } from '@/types'

const props = defineProps<{
  open: boolean
  preselectedVehicleId?: number
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const VEHICLE_PAGE_SIZE = 500

const toast = useToast()
const { translateMaintenanceType } = useEnumTranslations()

const submitting = ref(false)
const loadingVehicles = ref(false)
const vehicleOptions = ref<Array<{ value: number; label: string }>>([])

const form = ref({
  vehicleId: null as number | null,
  scheduleType: 'KM_BASED' as MaintenanceScheduleType,
  maintenanceType: MaintenanceType.SERVICE as MaintenanceType,
  intervalKm: null as number | null,
  intervalDays: null as number | null,
  currentKm: null as number | null,
  notes: '',
})

const scheduleTypeOptions = (
  Object.entries(MAINTENANCE_SCHEDULE_TYPE_LABELS) as Array<[MaintenanceScheduleType, string]>
).map(([value, label]) => ({ value, label }))

const maintenanceTypeOptions = Object.values(MaintenanceType).map((value) => ({
  value,
  label: translateMaintenanceType(value),
}))

const needsKmInterval = computed(
  () => form.value.scheduleType === 'KM_BASED' || form.value.scheduleType === 'HYBRID',
)
const needsDayInterval = computed(
  () => form.value.scheduleType === 'TIME_BASED' || form.value.scheduleType === 'HYBRID',
)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    resetForm()
    void loadVehicles()
  },
)

function resetForm() {
  form.value = {
    vehicleId: props.preselectedVehicleId ?? null,
    scheduleType: 'KM_BASED',
    maintenanceType: MaintenanceType.SERVICE,
    intervalKm: null,
    intervalDays: null,
    currentKm: null,
    notes: '',
  }
}

async function loadVehicles() {
  if (vehicleOptions.value.length > 0) return
  loadingVehicles.value = true
  try {
    const response = await vehiclesApi.getAll({ page: 0, size: VEHICLE_PAGE_SIZE })
    vehicleOptions.value = response.content.map((vehicle) => ({
      value: vehicle.id,
      label: `${vehicle.plateNumber} · ${vehicle.brand} ${vehicle.model}`,
    }))
  } catch (error: unknown) {
    toast.apiError(error, 'Araç listesi yüklenemedi')
  } finally {
    loadingVehicles.value = false
  }
}

function validate(): string | null {
  if (form.value.vehicleId == null) return 'Araç seçilmelidir'
  if (needsKmInterval.value && (form.value.intervalKm == null || form.value.intervalKm <= 0)) {
    return 'Km aralığı girilmelidir'
  }
  if (needsDayInterval.value && (form.value.intervalDays == null || form.value.intervalDays <= 0)) {
    return 'Gün aralığı girilmelidir'
  }
  return null
}

async function handleSubmit() {
  const validationError = validate()
  if (validationError) {
    toast.error(validationError)
    return
  }
  submitting.value = true
  try {
    const payload: CreateMaintenanceScheduleForm = {
      scheduleType: form.value.scheduleType,
      maintenanceType: form.value.maintenanceType,
      intervalKm: needsKmInterval.value && form.value.intervalKm != null ? form.value.intervalKm : undefined,
      intervalDays: needsDayInterval.value && form.value.intervalDays != null ? form.value.intervalDays : undefined,
      currentKm: form.value.currentKm ?? undefined,
      notes: form.value.notes.trim() || undefined,
    }
    await maintenanceSchedulesApi.createForVehicle(form.value.vehicleId as number, payload)
    toast.success('Bakım planı oluşturuldu')
    emit('created')
  } catch (error: unknown) {
    toast.apiError(error, 'Bakım planı oluşturulamadı')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal :open="open" title="Bakım Planı Oluştur" subtitle="Araç için km veya süre bazlı bakım hatırlatması tanımla" @close="emit('close')">
    <form id="maintenance-schedule-create-form" class="msc-form" @submit.prevent="handleSubmit">
      <RcField label="Araç" required>
        <SearchableSelect
          v-model="form.vehicleId"
          :options="vehicleOptions"
          :loading="loadingVehicles"
          :disabled="preselectedVehicleId != null"
          placeholder="Araç seçin"
          search-placeholder="Plaka veya marka ara…"
        />
      </RcField>

      <div class="msc-grid">
        <RcField label="Bakım tipi" required>
          <SearchableSelect
            v-model="form.maintenanceType"
            :options="maintenanceTypeOptions"
            placeholder="Seçiniz"
            search-placeholder="Ara…"
          />
        </RcField>

        <RcField label="Plan tipi" required>
          <select v-model="form.scheduleType" class="rc-input">
            <option v-for="option in scheduleTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </RcField>
      </div>

      <div class="msc-grid">
        <RcField v-if="needsKmInterval" label="Bakım aralığı (km)" required>
          <input v-model.number="form.intervalKm" type="number" class="rc-input" min="1" placeholder="Örn: 10000" />
        </RcField>

        <RcField v-if="needsDayInterval" label="Bakım aralığı (gün)" required>
          <input v-model.number="form.intervalDays" type="number" class="rc-input" min="1" placeholder="Örn: 180" />
        </RcField>

        <RcField v-if="needsKmInterval" label="Güncel km" hint="Boş bırakılırsa araç kilometresi kullanılır">
          <input v-model.number="form.currentKm" type="number" class="rc-input" min="0" placeholder="Örn: 42000" />
        </RcField>
      </div>

      <RcField label="Notlar">
        <textarea v-model="form.notes" class="rc-input" rows="3" placeholder="Ek bilgi…"></textarea>
      </RcField>
    </form>

    <template #footer>
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton type="submit" variant="primary" form="maintenance-schedule-create-form" :loading="submitting">
        Plan Oluştur
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.msc-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.msc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 560px) {
  .msc-grid {
    grid-template-columns: 1fr;
  }
}
</style>
