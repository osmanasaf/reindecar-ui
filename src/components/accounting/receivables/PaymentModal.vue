<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PaymentMethod } from '@/types'
import type { RecordPaymentRequest } from '@/types'
import { useForm, useToast } from '@/composables'
import { SearchableSelect } from '@/components/common'
import { RcModal, RcButton, RcField, RcInput } from '@/components/rc'
import { formatCurrency } from '@/utils/format'

interface Props {
  show?: boolean
  open?: boolean
  remainingAmount: number
  receivableNumber?: string
  referenceNumber?: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Ödeme Al',
})

const emit = defineEmits<{
  close: []
  submit: [data: RecordPaymentRequest]
}>()

const toast = useToast()

const isOpen = computed(() => props.open ?? props.show ?? false)
const docNumber = computed(() => props.receivableNumber || props.referenceNumber)

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.CASH, label: 'Nakit' },
  { value: PaymentMethod.CREDIT_CARD, label: 'Kredi Kartı' },
  { value: PaymentMethod.DEBIT_CARD, label: 'Banka Kartı' },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Havale/EFT' },
  { value: PaymentMethod.ONLINE, label: 'Online Ödeme' },
]

interface PaymentFormValues {
  [key: string]: unknown
  amount: number
  paymentMethod: PaymentMethod
  transactionRef: string
  notes: string
  discountAmount: number
  discountReason: string
}

const initialValues: PaymentFormValues = {
  amount: 0,
  paymentMethod: PaymentMethod.CASH,
  transactionRef: '',
  notes: '',
  discountAmount: 0,
  discountReason: '',
}

const validationRules = {
  amount: (value: number) => {
    if (!value || value <= 0) return 'Ödeme tutarı 0\'dan büyük olmalıdır'
    if (value > props.remainingAmount) {
      return `Tutar kalan tutardan (${formatCurrency(props.remainingAmount)}) fazla olamaz`
    }
    return ''
  },
  paymentMethod: (value: string) => (!value ? 'Ödeme yöntemi seçilmelidir' : ''),
  transactionRef: (value: string) => (value && value.length > 100 ? 'İşlem referansı 100 karakterden uzun olamaz' : ''),
  notes: (value: string) => (value && value.length > 500 ? 'Notlar 500 karakterden uzun olamaz' : ''),
  discountAmount: (value: number) => {
    if (value < 0) return 'İndirim tutarı negatif olamaz'
    if (value > values.amount) return 'İndirim tutarı ödeme tutarından fazla olamaz'
    return ''
  },
  discountReason: (value: string) => (value && value.length > 500 ? 'İndirim nedeni 500 karakterden uzun olamaz' : ''),
}

const { values, errors, touched, setFieldValue, validateField, validateAll, reset } = useForm<PaymentFormValues>({
  initialValues,
  validate: (formValues) => ({
    amount: validationRules.amount(formValues.amount),
    paymentMethod: validationRules.paymentMethod(formValues.paymentMethod),
    transactionRef: validationRules.transactionRef(formValues.transactionRef || ''),
    notes: validationRules.notes(formValues.notes || ''),
    discountAmount: validationRules.discountAmount(formValues.discountAmount || 0),
    discountReason: validationRules.discountReason(formValues.discountReason || ''),
  }),
})

const isSubmitting = ref(false)

watch(isOpen, (open) => {
  if (!open) reset()
})

const netAmount = computed(() => {
  const discount = values.discountAmount || 0
  return Math.max(0, values.amount - discount)
})

function setFullAmount() {
  setFieldValue('amount', props.remainingAmount)
}

async function onSubmit() {
  touched.value = {
    amount: true,
    paymentMethod: true,
    transactionRef: true,
    notes: true,
    discountAmount: true,
    discountReason: true,
  }
  if (!validateAll()) return

  isSubmitting.value = true
  try {
    emit('submit', {
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      transactionRef: values.transactionRef || undefined,
      notes: values.notes || undefined,
      discountAmount: values.discountAmount > 0 ? values.discountAmount : undefined,
      discountReason: values.discountReason || undefined,
    })
    reset()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ödeme kaydedilirken hata oluştu'
    toast.error(message)
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  reset()
  emit('close')
}
</script>

<template>
  <RcModal :open="isOpen" :title="title" wide @close="handleClose">
    <form style="display: flex; flex-direction: column; gap: 14px" @submit.prevent="onSubmit">
      <div v-if="docNumber" class="rca-pay-alert rca-pay-alert--info">
        <strong>Belge No:</strong> {{ docNumber }}
      </div>

      <div class="rca-pay-alert rca-pay-alert--warn">
        <strong>Kalan Tutar:</strong> {{ formatCurrency(remainingAmount) }}
        <button type="button" class="rca-pay-link" @click="setFullAmount">Tamamını öde</button>
      </div>

      <div v-if="values.discountAmount > 0" class="rca-pay-alert rca-pay-alert--info">
        <strong>Gerçek ödenecek:</strong> {{ formatCurrency(netAmount) }}
        <span>(İndirim: {{ formatCurrency(values.discountAmount) }})</span>
      </div>

      <RcField label="Ödeme tutarı" required>
        <RcInput
          v-model.number="values.amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          @blur="validateField('amount')"
        />
      </RcField>

      <RcField label="Ödeme yöntemi" required>
        <SearchableSelect
          v-model="values.paymentMethod"
          :options="paymentMethods"
          placeholder="Seçiniz"
          search-placeholder="Ara..."
          :error="!!(touched.paymentMethod && errors.paymentMethod)"
          @blur="validateField('paymentMethod')"
        />
      </RcField>

      <RcField label="İşlem referansı">
        <RcInput
          v-model="values.transactionRef"
          placeholder="Opsiyonel"
          maxlength="100"
          @blur="validateField('transactionRef')"
        />
      </RcField>

      <RcField label="İndirim tutarı">
        <RcInput
          v-model.number="values.discountAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          @blur="validateField('discountAmount')"
        />
      </RcField>

      <RcField label="İndirim nedeni">
        <textarea
          v-model="values.discountReason"
          class="rc-input"
          rows="2"
          maxlength="500"
          placeholder="Opsiyonel"
          @blur="validateField('discountReason')"
        />
      </RcField>

      <RcField label="Notlar">
        <textarea
          v-model="values.notes"
          class="rc-input"
          rows="3"
          maxlength="500"
          placeholder="Opsiyonel"
          @blur="validateField('notes')"
        />
      </RcField>
    </form>

    <template #footer>
      <RcButton variant="secondary" @click="handleClose">İptal</RcButton>
      <RcButton variant="accent" :disabled="isSubmitting" @click="onSubmit">
        {{ isSubmitting ? 'Kaydediliyor...' : 'Ödemeyi kaydet' }}
      </RcButton>
    </template>
  </RcModal>
</template>
