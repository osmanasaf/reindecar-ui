<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { maintenanceSchedulesApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcField, RcButton } from '@/components/rc'
import { formatKm } from '@/utils/format'
import type { CompletableSchedule } from '@/types/entities'

const props = defineProps<{
  open: boolean
  schedule: CompletableSchedule | null
}>()

const emit = defineEmits<{
  close: []
  completed: []
}>()

const toast = useToast()

const submitting = ref(false)
const completedAtKm = ref<number | null>(null)

const subtitle = computed(() => {
  if (!props.schedule?.plateNumber) return undefined
  const vehicleName = [props.schedule.brand, props.schedule.model].filter(Boolean).join(' ')
  return vehicleName ? `${props.schedule.plateNumber} · ${vehicleName}` : props.schedule.plateNumber
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.schedule) completedAtKm.value = props.schedule.vehicleCurrentKm
  },
)

async function handleSubmit() {
  if (!props.schedule) return
  if (completedAtKm.value == null || completedAtKm.value < 0) {
    toast.error('Yapılan km girilmelidir')
    return
  }
  submitting.value = true
  try {
    await maintenanceSchedulesApi.complete(props.schedule.scheduleId, completedAtKm.value)
    toast.success('Bakım tamamlandı olarak işaretlendi')
    emit('completed')
  } catch (error: unknown) {
    toast.apiError(error, 'Bakım tamamlanamadı')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal
    :open="open"
    icon="wrench"
    intent="success"
    title="Bakımı Tamamla"
    :subtitle="subtitle"
    @close="emit('close')"
  >
    <form id="maintenance-schedule-complete-form" @submit.prevent="handleSubmit">
      <RcField
        label="Bakımın yapıldığı km"
        required
        :hint="schedule ? `Araç güncel km: ${formatKm(schedule.vehicleCurrentKm)}` : undefined"
      >
        <input v-model.number="completedAtKm" type="number" class="rc-input" min="0" required />
      </RcField>
    </form>

    <template #footer>
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton type="submit" variant="accent" form="maintenance-schedule-complete-form" :loading="submitting">
        Tamamla
      </RcButton>
    </template>
  </RcModal>
</template>
