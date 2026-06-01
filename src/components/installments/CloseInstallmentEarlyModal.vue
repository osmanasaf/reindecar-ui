<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { installmentsApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcModal } from '@/components/rc'
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
  <RcModal :open="visible" title="Taksit Erken Kapatma" @close="emit('close')">
    <div class="rc-veh-modal-form">
      <div class="rc-veh-installment-close__info">
        <div class="rc-veh-installment-close__info-row">
          <span style="font-size: 13px; color: var(--rc-text-muted)">Kalan Bakiye</span>
          <strong>{{ formatCurrency(outstandingBalance) }}</strong>
        </div>
        <p class="rc-veh-installment-close__info-note">
          Kalan {{ props.installment.remainingInstallments }} taksit toplu olarak ödenecek ve plan
          kapatılacaktır.
        </p>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>İndirim Oranı (%)</label>
          <div class="input-with-suffix">
            <input
              v-model.number="discountPercentage"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="0"
              @input="onDiscountRateChange"
            />
            <span class="suffix">%</span>
          </div>
        </div>

        <div class="form-group">
          <label>Erken Kapatma Tutarı</label>
          <div class="input-with-suffix">
            <input
              v-model.number="paymentAmount"
              type="number"
              min="0"
              :max="outstandingBalance"
              step="0.01"
              placeholder="0"
              @input="onPaymentAmountChange"
            />
            <span class="suffix">{{ props.installment.totalCurrency || 'TRY' }}</span>
          </div>
        </div>
      </div>

      <div class="rc-veh-installment-close__calc">
        <div class="rc-veh-installment-close__calc-row">
          <span>Kalan Tutar</span>
          <span>{{ formatCurrency(outstandingBalance) }}</span>
        </div>
        <div
          v-if="discountAmount > 0"
          class="rc-veh-installment-close__calc-row rc-veh-installment-close__calc-row--discount"
        >
          <span>İndirim Tutarı</span>
          <span>−{{ formatCurrency(discountAmount) }}</span>
        </div>
        <div class="rc-veh-installment-close__calc-row rc-veh-installment-close__calc-row--total">
          <span>Ödenecek Tutar</span>
          <span>{{ formatCurrency(Number(paymentAmount) || 0) }}</span>
        </div>
      </div>

      <div class="form-group">
        <label>Notlar</label>
        <textarea
          v-model="notes"
          placeholder="Erken kapama ile ilgili notlar..."
          rows="3"
        />
      </div>
    </div>

    <template #footer>
      <RcButton variant="secondary" @click="emit('close')">İptal</RcButton>
      <RcButton variant="accent" :disabled="loading" @click="handleSubmit">
        {{ loading ? 'İşleniyor…' : 'Ödemeyi Onayla ve Kapat' }}
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-suffix input {
  width: 100%;
  padding-right: 40px;
}

.suffix {
  position: absolute;
  right: 12px;
  color: var(--rc-text-muted);
  font-size: 13px;
  font-weight: 500;
  pointer-events: none;
}
</style>
