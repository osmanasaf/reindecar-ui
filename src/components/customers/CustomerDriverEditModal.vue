<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { formatPhoneInput } from '@/utils/phone'
import type { Driver, UpdateDriverForm } from '@/types'

const props = defineProps<{
  open: boolean
  driver: Driver | null
  licenseClassOptions: { value: number; label: string }[]
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [form: UpdateDriverForm]
}>()

const form = ref<UpdateDriverForm>({})

const displayName = computed(() => {
  if (!props.driver) return ''
  return `${props.driver.firstName || ''} ${props.driver.lastName || ''}`.trim()
})

watch(
  () => [props.open, props.driver] as const,
  ([isOpen, driver]) => {
    if (!isOpen || !driver) return
    form.value = {
      firstName: driver.firstName,
      lastName: driver.lastName,
      nationalId: driver.nationalId,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      licenseClassId: driver.licenseClassId,
      licenseExpiryDate: driver.licenseExpiryDate,
      active: driver.active,
    }
  },
  { immediate: true },
)

function handlePhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.phone = formatPhoneInput(target.value)
}

function submit() {
  emit('save', { ...form.value })
}
</script>

<template>
  <RcModal :open="open && !!driver" wide @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="edit" :size="18" style="color: var(--rc-blue-500); vertical-align: -3px; margin-right: 8px" />
          Sürücü düzenle
        </h2>
        <div v-if="driver" class="rc-modal__sub">{{ displayName }}</div>
      </div>
    </template>

    <div class="rcv-form-grid">
      <RcField label="Ad">
        <input v-model="form.firstName" class="rc-input" type="text" />
      </RcField>
      <RcField label="Soyad">
        <input v-model="form.lastName" class="rc-input" type="text" />
      </RcField>
      <RcField label="TC Kimlik No">
        <input v-model="form.nationalId" class="rc-input rc-mono" type="text" maxlength="11" />
      </RcField>
      <RcField label="Telefon">
        <input
          :value="form.phone"
          class="rc-input rc-mono"
          type="tel"
          maxlength="13"
          @input="handlePhoneInput"
        />
      </RcField>
      <RcField label="Ehliyet no">
        <input v-model="form.licenseNumber" class="rc-input" type="text" />
      </RcField>
      <RcField label="Ehliyet sınıfı">
        <SearchableSelect
          :model-value="form.licenseClassId ?? null"
          :options="licenseClassOptions"
          placeholder="Sınıf seçin"
          search-placeholder="Ara..."
          clearable
          @update:model-value="form.licenseClassId = ($event as number | undefined) ?? undefined"
        />
      </RcField>
      <RcField label="Ehliyet geçerlilik" class="span-2">
        <DatePicker v-model="form.licenseExpiryDate" placeholder="Geçerlilik tarihi" />
      </RcField>
      <label class="rc-cust-edit__checkbox span-2">
        <input v-model="form.active" type="checkbox" />
        Aktif sürücü
      </label>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="saving" @click="submit">
        {{ saving ? 'Kaydediliyor…' : 'Kaydet' }}
      </RcButton>
    </template>
  </RcModal>
</template>
