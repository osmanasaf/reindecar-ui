<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PaymentMethod } from '@/types'
import type { RecordPaymentRequest } from '@/types'
import { useForm, useToast } from '@/composables'
import { RcModal, RcButton, RcField, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatCurrency } from '@/utils/format'

interface Props {
  open: boolean
  remainingAmount: number
  receivableNumber?: string
  referenceNumber?: string
  title?: string
  /** collect = alacak (bizim tahsil ettiğimiz), pay = borç (bizim ödediğimiz) */
  direction?: 'collect' | 'pay'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Ödeme al',
  direction: 'collect',
})

const isCollect = computed(() => props.direction === 'collect')
const balanceLabel = computed(() =>
  isCollect.value ? 'Tahsil edilecek kalan' : 'Ödenecek kalan',
)
const fullAmountLabel = computed(() =>
  isCollect.value ? 'Kalanın tamamını al' : 'Kalanın tamamını öde',
)
const amountHint = computed(() =>
  isCollect.value
    ? `En fazla ${formatCurrency(props.remainingAmount)} tahsil edilebilir`
    : `En fazla ${formatCurrency(props.remainingAmount)} ödenebilir`,
)
const emptyBalanceLabel = computed(() =>
  isCollect.value ? 'Tahsil edilecek bakiye kalmadı.' : 'Ödenecek bakiye kalmadı.',
)
const netLabel = computed(() =>
  isCollect.value ? 'Net tahsil edilecek tutar' : 'Net ödenecek tutar',
)

const emit = defineEmits<{
  close: []
  submit: [data: RecordPaymentRequest]
}>()

const toast = useToast()

const docNumber = computed(() => props.receivableNumber || props.referenceNumber)

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.CASH, label: 'Nakit' },
  { value: PaymentMethod.CREDIT_CARD, label: 'Kredi kartı' },
  { value: PaymentMethod.DEBIT_CARD, label: 'Banka kartı' },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Havale/EFT' },
  { value: PaymentMethod.ONLINE, label: 'Online' },
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
const applyDiscount = ref(false)

watch(() => props.open, (open) => {
  if (!open) {
    reset()
    applyDiscount.value = false
  }
})

// İndirim alanları kapatıldığında girilmiş değer hesaba katılmasın
watch(applyDiscount, (on) => {
  if (!on) {
    setFieldValue('discountAmount', 0)
    setFieldValue('discountReason', '')
  }
})

const netAmount = computed(() => {
  const discount = values.discountAmount || 0
  return Math.max(0, values.amount - discount)
})

const isFullRemaining = computed(
  () => props.remainingAmount > 0 && Math.abs(values.amount - props.remainingAmount) < 0.005,
)

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
  <RcModal :open="open" wide @close="handleClose">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="cash" :size="20" class="rc-modal__title-icon" />
          {{ title }}
        </h2>
        <div v-if="docNumber" class="rc-modal__sub">{{ docNumber }}</div>
      </div>
    </template>

    <div v-if="remainingAmount > 0" class="rc-modal-callout" role="status">
      <div class="rc-modal-callout__main">
        <span class="rc-modal-callout__label">{{ balanceLabel }}</span>
        <button
          type="button"
          class="rc-modal-callout__value rc-num"
          :disabled="isFullRemaining"
          title="Kalan tutarı forma yaz"
          @click="setFullAmount"
        >
          {{ formatCurrency(remainingAmount) }}
        </button>
      </div>
      <RcButton variant="ghost" size="sm" :disabled="isFullRemaining" @click="setFullAmount">
        {{ isFullRemaining ? 'Kalanın tamamı seçili' : fullAmountLabel }}
      </RcButton>
    </div>

    <div v-else class="rc-modal-callout rc-modal-callout--neutral">
      <span>{{ emptyBalanceLabel }}</span>
    </div>

    <form class="rc-modal-form" @submit.prevent="onSubmit">
      <RcField
        class="rc-modal-form__full"
        label="Tutar (₺)"
        required
        :error="touched.amount ? errors.amount : undefined"
        :hint="amountHint"
      >
        <RcInput
          v-model.number="values.amount"
          type="number"
          min="0"
          :max="remainingAmount"
          step="0.01"
          placeholder="0,00"
          @blur="validateField('amount')"
        />
      </RcField>

      <RcField
        label="Ödeme yöntemi"
        required
        :error="touched.paymentMethod ? errors.paymentMethod : undefined"
      >
        <select v-model="values.paymentMethod" class="rc-select">
          <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </RcField>

      <RcField
        label="İşlem referansı"
        hint="Opsiyonel"
        :error="touched.transactionRef ? errors.transactionRef : undefined"
      >
        <RcInput
          v-model="values.transactionRef"
          placeholder="POS slip no, dekont…"
          maxlength="100"
          @blur="validateField('transactionRef')"
        />
      </RcField>

      <RcField
        class="rc-modal-form__full"
        label="Not"
        hint="Opsiyonel"
        :error="touched.notes ? errors.notes : undefined"
      >
        <textarea
          v-model="values.notes"
          class="rc-textarea"
          rows="2"
          maxlength="500"
          placeholder="Tahsilat notu"
          @blur="validateField('notes')"
        />
      </RcField>

      <div class="rc-modal-form__full">
        <label class="rc-modal-check">
          <input v-model="applyDiscount" type="checkbox" />
          İndirim uygula
        </label>
      </div>

      <template v-if="applyDiscount">
        <RcField
          label="İndirim tutarı (₺)"
          :error="touched.discountAmount ? errors.discountAmount : undefined"
        >
          <RcInput
            v-model.number="values.discountAmount"
            type="number"
            min="0"
            :max="values.amount"
            step="0.01"
            placeholder="0,00"
            @blur="validateField('discountAmount')"
          />
        </RcField>

        <RcField
          label="İndirim sebebi"
          hint="Opsiyonel"
          :error="touched.discountReason ? errors.discountReason : undefined"
        >
          <RcInput
            v-model="values.discountReason"
            maxlength="500"
            placeholder="Vade iskontosu, kampanya…"
            @blur="validateField('discountReason')"
          />
        </RcField>

        <div class="rc-modal-form__full rc-modal-summary">
          <span>{{ netLabel }}</span>
          <span class="rc-modal-summary__value rc-num">{{ formatCurrency(netAmount) }}</span>
        </div>
      </template>
    </form>

    <template #footer>
      <RcButton variant="ghost" @click="handleClose">Vazgeç</RcButton>
      <RcButton
        variant="accent"
        :loading="isSubmitting"
        :disabled="remainingAmount <= 0"
        @click="onSubmit"
      >
        <RcIcon name="check" :size="14" />
        Ödemeyi kaydet
      </RcButton>
    </template>
  </RcModal>
</template>
