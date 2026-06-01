<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { PayableType } from '@/types'
import type { CreatePayableRequest, ServiceProviderResponse } from '@/types'
import { useForm, useToast } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField, RcInput } from '@/components/rc'
import { useAccountingStore } from '@/stores'

interface Props {
  show?: boolean
  open?: boolean
  sourceId?: number
  sourceType?: string
  defaultDescription?: string
  defaultAmount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  submit: [data: CreatePayableRequest]
}>()

const isOpen = computed(() => props.open ?? props.show ?? false)

const toast = useToast()
const accountingStore = useAccountingStore()

const payableTypes: { value: PayableType; label: string }[] = [
  { value: PayableType.REPAIR_COST, label: 'Onarım Maliyeti' },
  { value: PayableType.MAINTENANCE_COST, label: 'Bakım Maliyeti' },
  { value: PayableType.PARTS_COST, label: 'Parça Maliyeti' },
  { value: PayableType.SUPPLIER_COST, label: 'Tedarikçi Maliyeti' },
  { value: PayableType.OTHER, label: 'Diğer' },
]

const providers = ref<ServiceProviderResponse[]>([])

const providerOptions = computed(() =>
  providers.value.map(p => ({ value: p.id as number, label: `${p.name} (${p.code})` }))
)

function validate(formValues: CreatePayableRequest): Partial<Record<keyof CreatePayableRequest, string>> {
  const err: Partial<Record<keyof CreatePayableRequest, string>> = {}
  if (!formValues.type) err.type = 'Verecek türü seçilmelidir'
  if (!formValues.serviceProviderId) err.serviceProviderId = 'Servis sağlayıcı seçilmelidir'
  if (!formValues.description) {
    err.description = 'Açıklama zorunludur'
  } else if (formValues.description.length < 10) {
    err.description = 'Açıklama en az 10 karakter olmalıdır'
  } else if (formValues.description.length > 500) {
    err.description = 'Açıklama 500 karakterden uzun olamaz'
  }
  if (!formValues.amount || formValues.amount <= 0) err.amount = 'Tutar 0\'dan büyük olmalıdır'
  if (formValues.invoiceNumber && formValues.invoiceNumber.length > 50) {
    err.invoiceNumber = 'Fatura numarası 50 karakterden uzun olamaz'
  }
  return err
}

const { values, errors, touched, handleSubmit, validateField, reset, isSubmitting } = useForm({
  initialValues: {
    type: PayableType.MAINTENANCE_COST,
    serviceProviderId: 0,
    description: props.defaultDescription || '',
    amount: props.defaultAmount || 0,
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
  } satisfies CreatePayableRequest,
  validate,
  async onSubmit(data) {
    emit('submit', data)
    reset()
  }
})

onMounted(async () => {
  try {
    providers.value = await accountingStore.fetchServiceProviders(true)
  } catch {
    toast.error('Servis sağlayıcılar yüklenemedi')
  }
})

watch(isOpen, (open) => {
  if (!open) reset()
})

const onSubmit = () => handleSubmit()

function handleClose() {
  reset()
  emit('close')
}
</script>

<template>
  <RcModal :open="isOpen" title="Yeni Verecek" wide @close="handleClose">
    <form style="display: flex; flex-direction: column; gap: 14px" @submit.prevent="onSubmit">
      <RcField label="Verecek türü" required>
        <SearchableSelect
          v-model="values.type"
          :options="payableTypes"
          placeholder="Seçiniz"
          search-placeholder="Ara..."
          :error="!!(touched.type && errors.type)"
          @blur="validateField('type')"
        />
      </RcField>

      <RcField label="Servis sağlayıcı" required>
        <SearchableSelect
          :model-value="values.serviceProviderId || null"
          :options="providerOptions"
          placeholder="Seçiniz"
          search-placeholder="Sağlayıcı ara..."
          :error="!!(touched.serviceProviderId && errors.serviceProviderId)"
          @update:model-value="(v) => values.serviceProviderId = v ?? 0"
          @blur="validateField('serviceProviderId')"
        />
      </RcField>

      <RcField label="Açıklama" required>
        <textarea
          v-model="values.description"
          class="rc-input"
          rows="3"
          maxlength="500"
          placeholder="Verecek açıklaması"
          @blur="validateField('description')"
        />
      </RcField>

      <RcField label="Tutar (TL)" required>
        <RcInput
          v-model.number="values.amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          @blur="validateField('amount')"
        />
      </RcField>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
        <RcField label="Fatura numarası">
          <RcInput
            v-model="values.invoiceNumber"
            placeholder="FT2026-001"
            maxlength="50"
            @blur="validateField('invoiceNumber')"
          />
        </RcField>
        <DatePicker
          v-model="values.invoiceDate"
          label="Fatura tarihi"
          placeholder="Fatura tarihi"
        />
      </div>

      <DatePicker
        v-model="values.dueDate"
        label="Vade tarihi"
        placeholder="Vade tarihi"
      />
    </form>

    <template #footer>
      <RcButton variant="secondary" @click="handleClose">İptal</RcButton>
      <RcButton variant="accent" :disabled="isSubmitting" @click="onSubmit">
        {{ isSubmitting ? 'Oluşturuluyor...' : 'Verecek oluştur' }}
      </RcButton>
    </template>
  </RcModal>
</template>
