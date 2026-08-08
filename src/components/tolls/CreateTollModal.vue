<script setup lang="ts">
import { ref } from 'vue'
import { tollsApi } from '@/api'
import { useToast } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { TollType } from '@/types'
import type { CreateTollRecordRequest } from '@/api'

const props = defineProps<{
  open: boolean
  rentalId: number
  vehicleId: number
  customerId: number
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const toast = useToast()
const submitting = ref(false)

const tollTypes = [
  { value: TollType.HGS, label: 'HGS Geçiş' },
  { value: TollType.OGS, label: 'OGS Geçiş' },
  { value: TollType.BRIDGE, label: 'Köprü Geçiş' },
  { value: TollType.TUNNEL, label: 'Tünel Geçiş' },
  { value: TollType.OTHER, label: 'Diğer' }
]

const form = ref({
  tollType: TollType.HGS as TollType,
  passageDate: new Date().toISOString().slice(0, 10),
  passageLocation: '',
  tollAmount: null as number | null,
  hgsTagNumber: '',
  description: ''
})

async function handleSubmit() {
  if (!form.value.tollAmount || form.value.tollAmount <= 0) {
    toast.error('Geçiş ücreti girilmelidir')
    return
  }

  submitting.value = true
  try {
    const request: CreateTollRecordRequest = {
      rentalId: props.rentalId,
      vehicleId: props.vehicleId,
      customerId: props.customerId,
      tollType: form.value.tollType,
      passageDate: form.value.passageDate ? `${form.value.passageDate}T00:00:00` : '',
      passageLocation: form.value.passageLocation || undefined,
      tollAmount: form.value.tollAmount,
      hgsTagNumber: form.value.hgsTagNumber || undefined,
      description: form.value.description || undefined
    }
    await tollsApi.create(request)
    toast.success('Geçiş kaydı oluşturuldu ve alacak olarak müşteriye yansıtıldı')
    emit('created')
  } catch (err: unknown) {
    toast.apiError(err, 'Geçiş kaydı oluşturulamadı')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal
    :open="open"
    wide
    icon="route"
    title="HGS/OGS geçiş kaydı"
    subtitle="Geçiş, müşteriye alacak olarak yansıtılır"
    @close="emit('close')"
  >

    <form id="create-toll-form" class="rc-modal-form" @submit.prevent="handleSubmit">
      <RcField label="Geçiş tipi" required>
        <SearchableSelect
          v-model="form.tollType"
          :options="tollTypes"
          placeholder="Geçiş tipi seçin"
          search-placeholder="Ara…"
        />
      </RcField>

      <DatePicker
        v-model="form.passageDate"
        label="Geçiş tarihi *"
        placeholder="Tarih seçin"
      />

      <RcField label="Geçiş noktası" hint="Opsiyonel">
        <input
          v-model="form.passageLocation"
          class="rc-input"
          type="text"
          placeholder="Örn: FSM Köprüsü, Osmangazi Köprüsü"
        />
      </RcField>

      <RcField label="Geçiş ücreti (₺)" required>
        <input
          v-model.number="form.tollAmount"
          class="rc-input"
          type="number"
          placeholder="0,00"
          step="0.01"
          min="0"
          required
        />
      </RcField>

      <RcField label="HGS etiket no" hint="Opsiyonel">
        <input
          v-model="form.hgsTagNumber"
          class="rc-input"
          type="text"
          placeholder="HGS-123456789"
        />
      </RcField>

      <RcField class="rc-modal-form__full" label="Açıklama" hint="Opsiyonel">
        <textarea
          v-model="form.description"
          class="rc-textarea"
          rows="3"
          placeholder="Ek bilgi…"
        />
      </RcField>
    </form>

    <template #footer>
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" type="submit" form="create-toll-form" :loading="submitting">
        <RcIcon name="check" :size="14" />
        Kaydet
      </RcButton>
    </template>
  </RcModal>
</template>

