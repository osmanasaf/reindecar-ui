<script setup lang="ts">
import { ref, watch } from 'vue'
import { maintenanceSchedulesApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcField, RcButton, RcSkeletonText } from '@/components/rc'
import DatePicker from '@/components/base/DatePicker.vue'
import type { UpcomingMaintenance, UpdateMaintenanceScheduleForm } from '@/types'

const props = defineProps<{
  open: boolean
  schedule: UpcomingMaintenance | null
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const toast = useToast()

const loadingDetail = ref(false)
const submitting = ref(false)

const form = ref({
  intervalKm: null as number | null,
  intervalDays: null as number | null,
  nextMaintenanceKm: null as number | null,
  nextMaintenanceDate: '' as string,
  notes: '',
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.schedule) void loadDetail(props.schedule)
  },
)

async function loadDetail(target: UpcomingMaintenance) {
  loadingDetail.value = true
  form.value = {
    intervalKm: null,
    intervalDays: null,
    nextMaintenanceKm: target.nextMaintenanceKm,
    nextMaintenanceDate: target.nextMaintenanceDate?.slice(0, 10) ?? '',
    notes: '',
  }
  try {
    const schedules = await maintenanceSchedulesApi.getByVehicle(target.vehicleId)
    const detail = schedules.find((item) => item.id === target.scheduleId)
    if (detail) {
      form.value = {
        intervalKm: detail.maintenanceIntervalKm,
        intervalDays: detail.maintenanceIntervalDays,
        nextMaintenanceKm: detail.nextMaintenanceKm,
        nextMaintenanceDate: detail.nextMaintenanceDate?.slice(0, 10) ?? '',
        notes: detail.notes ?? '',
      }
    }
  } catch (error: unknown) {
    toast.apiError(error, 'Plan detayı yüklenemedi')
  } finally {
    loadingDetail.value = false
  }
}

async function handleSubmit() {
  if (!props.schedule) return
  submitting.value = true
  try {
    const payload: UpdateMaintenanceScheduleForm = {
      intervalKm: form.value.intervalKm ?? undefined,
      intervalDays: form.value.intervalDays ?? undefined,
      nextMaintenanceKm: form.value.nextMaintenanceKm ?? undefined,
      nextMaintenanceDate: form.value.nextMaintenanceDate || undefined,
      notes: form.value.notes.trim() || undefined,
    }
    await maintenanceSchedulesApi.update(props.schedule.scheduleId, payload)
    toast.success('Bakım planı güncellendi')
    emit('updated')
  } catch (error: unknown) {
    toast.apiError(error, 'Bakım planı güncellenemedi')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal
    :open="open"
    title="Bakım Planını Düzenle"
    :subtitle="schedule ? `${schedule.plateNumber} · ${schedule.brand} ${schedule.model}` : undefined"
    @close="emit('close')"
  >
    <RcSkeletonText v-if="loadingDetail" :lines="5" />

    <form v-else id="maintenance-schedule-edit-form" class="mse-form" @submit.prevent="handleSubmit">
      <div class="mse-grid">
        <RcField label="Bakım aralığı (km)">
          <input v-model.number="form.intervalKm" type="number" class="rc-input" min="1" placeholder="Örn: 10000" />
        </RcField>

        <RcField label="Bakım aralığı (gün)">
          <input v-model.number="form.intervalDays" type="number" class="rc-input" min="1" placeholder="Örn: 180" />
        </RcField>

        <RcField label="Sonraki bakım km">
          <input v-model.number="form.nextMaintenanceKm" type="number" class="rc-input" min="0" placeholder="Örn: 52000" />
        </RcField>

        <RcField label="Sonraki bakım tarihi">
          <DatePicker v-model="form.nextMaintenanceDate" placeholder="Tarih seçin" />
        </RcField>
      </div>

      <RcField label="Notlar">
        <textarea v-model="form.notes" class="rc-input" rows="3" placeholder="Ek bilgi…"></textarea>
      </RcField>
    </form>

    <template #footer>
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton
        type="submit"
        variant="primary"
        form="maintenance-schedule-edit-form"
        :loading="submitting"
        :disabled="loadingDetail"
      >
        Kaydet
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.mse-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mse-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 560px) {
  .mse-grid {
    grid-template-columns: 1fr;
  }
}
</style>
