<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { vehiclesApi, branchesApi } from '@/api'
import { useToast, useValidation, rules } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { Branch, VehicleLocation } from '@/types'

const props = defineProps<{
  open: boolean
  vehicleId: number
  defaultBranchId?: number | null
}>()

const emit = defineEmits<{
  close: []
  recorded: [location: VehicleLocation]
}>()

const toast = useToast()
const submitting = ref(false)
const branches = ref<Branch[]>([])
const branchId = ref<number | null>(null)
const locationDate = ref('')
const notes = ref('')

function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const branchOptions = computed(() =>
  branches.value.map((b) => ({ value: b.id as number, label: b.name })),
)

const formRules = computed(() => ({
  branchId: { value: branchId.value, rules: [rules.required('Şube seçiniz')] },
  locationDate: { value: locationDate.value, rules: [rules.required('Tarih seçiniz')] },
}))

const { validateForm, getError, hasError, touch } = useValidation(() => formRules.value)

async function loadBranches() {
  try {
    branches.value = await branchesApi.getActive()
  } catch {
    branches.value = []
  }
}

watch(
  () => [props.open, props.defaultBranchId] as const,
  async ([isOpen, defaultBranch]) => {
    if (!isOpen) return
    locationDate.value = todayYmd()
    notes.value = ''
    branchId.value = defaultBranch ?? null
    await loadBranches()
    if (!branchId.value && branches.value.length > 0) {
      branchId.value = branches.value[0]?.id ?? null
    }
  },
  { immediate: true },
)

async function save() {
  if (!validateForm(formRules.value) || !branchId.value) return

  submitting.value = true
  try {
    const location = await vehiclesApi.recordLocation(props.vehicleId, {
      branchId: branchId.value,
      locationDate: locationDate.value,
      notes: notes.value.trim() || undefined,
    })
    toast.success('Araç konumu kaydedildi')
    emit('recorded', location)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Konum kaydedilemedi')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal :open="open" @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="pin" :size="20" style="vertical-align: -3px; margin-right: 8px" />
          Günlük konum kaydı
        </h2>
        <div class="rc-modal__sub">Aracın belirli bir günde bulunduğu şubeyi kaydedin</div>
      </div>
    </template>

    <div class="rcv-form-grid">
      <RcField label="Tarih" :class="{ 'rc-field--error': hasError('locationDate') }">
        <DatePicker
          v-model="locationDate"
          placeholder="Konum tarihi"
          @closed="touch('locationDate')"
        />
        <span v-if="hasError('locationDate')" class="rc-field__hint rc-field__hint--error">{{ getError('locationDate') }}</span>
      </RcField>
      <RcField label="Şube" :class="{ 'rc-field--error': hasError('branchId') }">
        <SearchableSelect
          :model-value="branchId"
          :options="branchOptions"
          placeholder="Şube seçin"
          @update:model-value="(v) => { branchId = v; touch('branchId') }"
        />
        <span v-if="hasError('branchId')" class="rc-field__hint rc-field__hint--error">{{ getError('branchId') }}</span>
      </RcField>
      <RcField label="Not (opsiyonel)" class="rcv-form-grid__full">
        <textarea
          v-model="notes"
          class="rc-input"
          rows="3"
          placeholder="Otopark, adres veya açıklama"
        />
      </RcField>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="submitting" @click="save">
        <RcIcon name="check" :size="14" />
        Kaydet
      </RcButton>
    </template>
  </RcModal>
</template>
