<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { installmentsApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcModal, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { VehicleInstallmentResponse } from '@/types'

const props = defineProps<{
  installment: VehicleInstallmentResponse
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const loading = ref(false)
const notes = ref('')

const outstandingBalance = computed(() => props.installment.outstandingBalance || 0)

const discountPercentage = ref<number | ''>(0)
const paymentAmount = ref<number | ''>(0)

watch(
  () => props.visible,
  isVisible => {
    if (isVisible) {
      paymentAmount.value = outstandingBalance.value
      discountPercentage.value = 0
      notes.value = ''
    }
  },
  { immediate: true }
)

const discountAmount = computed(() => {
  const amount = Number(paymentAmount.value) || 0
  return Math.max(0, outstandingBalance.value - amount)
})

function onDiscountRateChange() {
  if (discountPercentage.value === '' || Number(discountPercentage.value) < 0) {
    paymentAmount.value = outstandingBalance.value
    return
  }
  const rate = Number(discountPercentage.value)
  const discount = outstandingBalance.value * (rate / 100)
  paymentAmount.value = Number((outstandingBalance.value - discount).toFixed(2))
}

function onPaymentAmountChange() {
  if (paymentAmount.value === '' || Number(paymentAmount.value) < 0) {
    discountPercentage.value = 0
    return
  }
  let amount = Number(paymentAmount.value)
  if (amount > outstandingBalance.value) {
    amount = outstandingBalance.value
    paymentAmount.value = amount
  }
  if (outstandingBalance.value > 0) {
    const discount = outstandingBalance.value - amount
    const rate = (discount / outstandingBalance.value) * 100
    discountPercentage.value = Number(rate.toFixed(2))
  } else {
    discountPercentage.value = 0
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: props.installment.totalCurrency || 'TRY'
  }).format(amount)
}

async function handleSubmit() {
  if (
    !window.confirm(
      'Taksit planını erken kapatmak üzeresiniz. Bu işlem geri alınamaz. Onaylıyor musunuz?'
    )
  ) {
    return
  }
  loading.value = true
  try {
    await installmentsApi.closeEarly(props.installment.id, {
      paymentAmount: Number(paymentAmount.value) || 0,
      paymentCurrency: props.installment.outstandingCurrency || 'TRY',
      discountPercentage: Number(discountPercentage.value) || 0,
      notes: notes.value
    })
    toast.success('Taksit planı başarıyla kapatıldı')
    emit('success')
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <RcModal :open="visible" wide @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="cash" :size="20" class="rc-modal__title-icon" />
          Taksit erken kapatma
        </h2>
        <div class="rc-modal__sub">
          Kalan {{ props.installment.remainingInstallments }} taksit toplu ödenip plan kapatılacak
        </div>
      </div>
    </template>

    <div class="rc-modal-callout" role="status">
      <div class="rc-modal-callout__main">
        <span class="rc-modal-callout__label">Kalan bakiye</span>
        <span class="rc-modal-callout__value rc-num">{{ formatCurrency(outstandingBalance) }}</span>
      </div>
    </div>

    <div class="rc-modal-form">
      <RcField label="İndirim oranı" hint="Tutarı otomatik hesaplar">
        <div class="rc-input-group">
          <input
            v-model.number="discountPercentage"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            @input="onDiscountRateChange"
          />
          <span class="rc-input-group__affix">%</span>
        </div>
      </RcField>

      <RcField label="Erken kapatma tutarı" hint="Oranı otomatik hesaplar">
        <div class="rc-input-group">
          <input
            v-model.number="paymentAmount"
            type="number"
            min="0"
            :max="outstandingBalance"
            step="0.01"
            placeholder="0"
            @input="onPaymentAmountChange"
          />
          <span class="rc-input-group__affix">
            {{ props.installment.totalCurrency || 'TRY' }}
          </span>
        </div>
      </RcField>

      <div class="rc-modal-form__full rc-veh-installment-close__calc">
        <div class="rc-veh-installment-close__calc-row">
          <span>Kalan tutar</span>
          <span class="rc-num">{{ formatCurrency(outstandingBalance) }}</span>
        </div>
        <div
          v-if="discountAmount > 0"
          class="rc-veh-installment-close__calc-row rc-veh-installment-close__calc-row--discount"
        >
          <span>İndirim tutarı</span>
          <span class="rc-num">−{{ formatCurrency(discountAmount) }}</span>
        </div>
        <div class="rc-veh-installment-close__calc-row rc-veh-installment-close__calc-row--total">
          <span>Ödenecek tutar</span>
          <span class="rc-num">{{ formatCurrency(Number(paymentAmount) || 0) }}</span>
        </div>
      </div>

      <RcField class="rc-modal-form__full" label="Not" hint="Opsiyonel">
        <textarea
          v-model="notes"
          class="rc-textarea"
          placeholder="Erken kapama ile ilgili notlar…"
          rows="3"
        />
      </RcField>
    </div>

    <template #footer>
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :loading="loading" @click="handleSubmit">
        <RcIcon name="check" :size="14" />
        Ödemeyi onayla ve kapat
      </RcButton>
    </template>
  </RcModal>
</template>
