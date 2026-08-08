<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { paymentApi } from '@/api'
import { useToast, useValidation, rules } from '@/composables'
import { fmtTRY } from '@/utils/format'
import { PaymentMethod } from '@/types'
import type { Payment, Rental } from '@/types'

const props = defineProps<{
  open: boolean
  rental: Rental | null
  remainingAmount: number
}>()

const emit = defineEmits<{ close: []; recorded: [payment: Payment] }>()

const modalSubtitle = computed(() => {
  if (!props.rental) return ''
  return [props.rental.rentalNumber, props.rental.customerName, props.rental.vehiclePlate]
    .filter(Boolean)
    .join(' · ')
})

const toast = useToast()
const submitting = ref(false)
const amount = ref(0)
const method = ref<PaymentMethod>(PaymentMethod.CASH)
const transactionRef = ref('')
const notes = ref('')
const applyDiscount = ref(false)
const discountAmount = ref(0)
const discountReason = ref('')

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.CASH, label: 'Nakit' },
  { value: PaymentMethod.CREDIT_CARD, label: 'Kredi kartı' },
  { value: PaymentMethod.DEBIT_CARD, label: 'Banka kartı' },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Havale/EFT' },
  { value: PaymentMethod.ONLINE, label: 'Online' },
]

watch(
  () => [props.open, props.remainingAmount] as const,
  ([isOpen, remaining]) => {
    if (!isOpen) return
    amount.value = remaining > 0 ? Math.round(remaining * 100) / 100 : 0
    method.value = PaymentMethod.CASH
    transactionRef.value = ''
    notes.value = ''
    applyDiscount.value = false
    discountAmount.value = 0
    discountReason.value = ''
  },
  { immediate: true },
)

const formRules = computed(() => ({
  amount: {
    value: amount.value,
    rules: [
      rules.required('Tutar zorunludur'),
      rules.minValue(0.01, 'Tutar 0\'dan büyük olmalıdır'),
      {
        validate: (v: unknown) => Number(v) <= props.remainingAmount,
        message: `Tutar kalan bakiyeden (${fmtTRY(props.remainingAmount)}) fazla olamaz`,
      },
    ],
  },
  discountAmount: {
    value: discountAmount.value,
    rules: applyDiscount.value
      ? [
          {
            validate: (v: unknown) => Number(v) > 0,
            message: 'İndirim tutarı 0\'dan büyük olmalıdır',
          },
          {
            validate: (v: unknown) => Number(v) <= amount.value,
            message: 'İndirim tutarı ödeme tutarından fazla olamaz',
          },
        ]
      : [],
  },
}))

const netAmount = computed(() =>
  applyDiscount.value && discountAmount.value > 0
    ? Math.max(0, Math.round((amount.value - discountAmount.value) * 100) / 100)
    : amount.value,
)

const { validateForm, getError, touch, reset } = useValidation(() => formRules.value)

const roundedRemaining = computed(() =>
  Math.round(props.remainingAmount * 100) / 100,
)

const isFullRemaining = computed(() =>
  roundedRemaining.value > 0 && Math.abs(amount.value - roundedRemaining.value) < 0.005,
)

function setRemainingAmount() {
  if (roundedRemaining.value <= 0) return
  amount.value = roundedRemaining.value
  touch('amount')
}

async function confirm() {
  if (!props.rental || !validateForm(formRules.value)) return
  submitting.value = true
  try {
    const payment = await paymentApi.recordPayment(props.rental.id, {
      amount: amount.value,
      method: method.value,
      transactionRef: transactionRef.value || undefined,
      notes: notes.value || undefined,
      discountAmount: applyDiscount.value && discountAmount.value > 0 ? discountAmount.value : undefined,
      discountReason: applyDiscount.value && discountReason.value ? discountReason.value : undefined,
    })
    toast.success('Ödeme kaydedildi')
    emit('recorded', payment)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Ödeme kaydedilemedi')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  reset()
  emit('close')
}
</script>

<template>
  <RcModal
    :open="open && !!rental"
    wide
    icon="cash"
    title="Ödeme al"
    :subtitle="modalSubtitle"
    @close="handleClose"
  >

    <div v-if="roundedRemaining > 0" class="rc-modal-callout" role="status">
      <div class="rc-modal-callout__main">
        <span class="rc-modal-callout__label">Tahsil edilecek kalan</span>
        <button
          type="button"
          class="rc-modal-callout__value rc-num"
          :disabled="isFullRemaining"
          title="Kalan tutarı forma yaz"
          @click="setRemainingAmount"
        >
          {{ fmtTRY(roundedRemaining) }}
        </button>
      </div>
      <RcButton variant="ghost" size="sm" :disabled="isFullRemaining" @click="setRemainingAmount">
        {{ isFullRemaining ? 'Kalanın tamamı seçili' : 'Kalanın tamamını al' }}
      </RcButton>
    </div>

    <div v-else class="rc-modal-callout rc-modal-callout--neutral">
      <span>Tahsil edilecek bakiye kalmadı.</span>
    </div>

    <div class="rc-modal-form">
      <RcField
        class="rc-modal-form__full"
        label="Tutar (₺)"
        required
        :error="getError('amount')"
        :hint="`En fazla ${fmtTRY(roundedRemaining)} tahsil edilebilir`"
      >
        <input
          v-model.number="amount"
          class="rc-input"
          type="number"
          min="0"
          :max="roundedRemaining"
          step="0.01"
          placeholder="0,00"
          @blur="touch('amount')"
        />
      </RcField>

      <RcField label="Ödeme yöntemi" required>
        <select v-model="method" class="rc-select">
          <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </RcField>

      <RcField label="İşlem referansı" hint="Opsiyonel">
        <input v-model="transactionRef" class="rc-input" type="text" placeholder="POS slip no, dekont…" />
      </RcField>

      <RcField class="rc-modal-form__full" label="Not" hint="Opsiyonel">
        <textarea v-model="notes" class="rc-textarea" rows="2" placeholder="Tahsilat notu" />
      </RcField>

      <div class="rc-modal-form__full">
        <label class="rc-modal-check">
          <input v-model="applyDiscount" type="checkbox" />
          İndirim uygula
        </label>
      </div>

      <template v-if="applyDiscount">
        <RcField label="İndirim tutarı (₺)" required :error="getError('discountAmount')">
          <input
            v-model.number="discountAmount"
            class="rc-input"
            type="number"
            min="0"
            :max="amount"
            step="0.01"
            placeholder="0,00"
            @blur="touch('discountAmount')"
          />
        </RcField>

        <RcField label="İndirim sebebi" hint="Opsiyonel">
          <input v-model="discountReason" class="rc-input" type="text" placeholder="Vade iskontosu, kampanya…" />
        </RcField>

        <div class="rc-modal-form__full rc-modal-summary">
          <span>Net tahsil edilecek tutar</span>
          <span class="rc-modal-summary__value rc-num">{{ fmtTRY(netAmount) }}</span>
        </div>
      </template>
    </div>

    <template #footer>
      <RcButton variant="ghost" @click="handleClose">Vazgeç</RcButton>
      <RcButton
        variant="accent"
        :loading="submitting"
        :disabled="roundedRemaining <= 0"
        @click="confirm"
      >
        <RcIcon name="check" :size="14" />
        Ödemeyi kaydet
      </RcButton>
    </template>
  </RcModal>
</template>
