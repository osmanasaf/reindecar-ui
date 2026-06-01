<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RcModal, RcButton } from '@/components/rc'
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

const toast = useToast()
const submitting = ref(false)
const amount = ref(0)
const method = ref<PaymentMethod>(PaymentMethod.CASH)
const transactionRef = ref('')
const notes = ref('')

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
}))

const { validateForm, getError, hasError, touch, reset } = useValidation(() => formRules.value)

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
    const payment = await paymentApi.recordPayment(
      props.rental.id,
      amount.value,
      method.value,
      transactionRef.value || undefined,
      undefined,
      notes.value || undefined,
    )
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
    @close="handleClose"
  >
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="cash" :size="20" style="color: var(--rc-blue-500); vertical-align: -3px; margin-right: 8px" />
          Ödeme al
        </h2>
        <div v-if="rental" class="rc-modal__sub">
          {{ rental.rentalNumber }}
        </div>
      </div>
    </template>

    <div
      v-if="roundedRemaining > 0"
      class="rcr-payment-modal-balance"
      role="status"
    >
      <div class="rcr-payment-modal-balance__main">
        <span class="rcr-payment-modal-balance__label">Tahsil edilecek kalan</span>
        <button
          type="button"
          class="rcr-payment-modal-balance__value rc-num"
          :disabled="roundedRemaining <= 0 || isFullRemaining"
          title="Kalan tutarı yaz"
          @click="setRemainingAmount"
        >
          {{ fmtTRY(roundedRemaining) }}
        </button>
      </div>
      <RcButton
        variant="ghost"
        size="sm"
        type="button"
        :disabled="isFullRemaining"
        @click="setRemainingAmount"
      >
        {{ isFullRemaining ? 'Kalanın tamamı seçili' : 'Kalanın tamamını al' }}
      </RcButton>
    </div>

    <div v-else class="rcr-payment-modal-balance rcr-payment-modal-balance--paid">
      <span>Tahsil edilecek bakiye kalmadı.</span>
    </div>

    <div class="rcr-modal-form-grid">
      <div class="rc-field rcr-modal-form-grid__full" :class="{ 'rc-field--error': hasError('amount') }">
        <label class="rc-field__label">Tutar (₺)</label>
        <div class="rcr-payment-modal-amount-row">
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
          <RcButton
            variant="ghost"
            size="sm"
            type="button"
            title="Kalan tutarı yaz"
            :disabled="roundedRemaining <= 0 || isFullRemaining"
            @click="setRemainingAmount"
          >
            <RcIcon name="cash" :size="14" />
            Kalanı yaz
          </RcButton>
        </div>
        <span class="rc-field__hint">
          En fazla {{ fmtTRY(roundedRemaining) }} tahsil edilebilir
        </span>
        <span v-if="hasError('amount')" class="rc-field__error">{{ getError('amount') }}</span>
      </div>
      <div class="rc-field">
        <label class="rc-field__label">Ödeme yöntemi</label>
        <select v-model="method" class="rc-select">
          <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>
      <div class="rc-field">
        <label class="rc-field__label">İşlem referansı (opsiyonel)</label>
        <input v-model="transactionRef" class="rc-input" type="text" placeholder="POS slip no, dekont…" />
      </div>
      <div class="rc-field rcr-modal-form-grid__full">
        <label class="rc-field__label">Not (opsiyonel)</label>
        <textarea v-model="notes" class="rc-textarea" rows="2" placeholder="Tahsilat notu" />
      </div>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="handleClose">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="submitting || roundedRemaining <= 0" @click="confirm">
        <RcIcon name="check" :size="14" />
        {{ submitting ? 'Kaydediliyor…' : 'Ödemeyi kaydet' }}
      </RcButton>
    </template>
  </RcModal>
</template>
