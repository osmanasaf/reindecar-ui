<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { VehicleInstallmentResponse } from '@/types'
import { RcModal, RcButton, RcField } from '@/components/rc'

interface Props {
  open: boolean
  installment: VehicleInstallmentResponse
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  submit: [paymentAmount: number, discountPercentage: number | undefined, notes: string]
}>()

const processing = ref(false)
const discountPercentage = ref(0)
const discountAmountInput = ref<number | ''>('')
const notes = ref('')

const outstandingBalance = computed(() => Number(props.installment?.outstandingBalance ?? 0))

const discountAmount = computed(() => {
  if (discountAmountInput.value !== '' && typeof discountAmountInput.value === 'number' && discountAmountInput.value > 0) {
    return Math.min(discountAmountInput.value, outstandingBalance.value)
  }
  if (discountPercentage.value > 0) {
    return outstandingBalance.value * (discountPercentage.value / 100)
  }
  return 0
})

const finalAmount = computed(() => Math.max(0, outstandingBalance.value - discountAmount.value))

const effectiveDiscountPercentage = computed(() => {
  if (outstandingBalance.value <= 0 || discountAmount.value <= 0) return 0
  return Math.min(100, (discountAmount.value / outstandingBalance.value) * 100)
})

let skipSync = false
watch(discountPercentage, (pct) => {
  if (skipSync) return
  skipSync = true
  if (pct > 0 && outstandingBalance.value > 0) {
    discountAmountInput.value = Math.round(outstandingBalance.value * (pct / 100) * 100) / 100
  } else {
    discountAmountInput.value = ''
  }
  skipSync = false
})

watch(discountAmountInput, (val) => {
  if (skipSync) return
  if (val === '' || val <= 0) {
    skipSync = true
    discountPercentage.value = 0
    skipSync = false
    return
  }
  if (outstandingBalance.value > 0) {
    skipSync = true
    discountPercentage.value = Math.min(100, (Number(val) / outstandingBalance.value) * 100)
    skipSync = false
  }
})

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    discountPercentage.value = 0
    discountAmountInput.value = ''
    notes.value = ''
  }
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: props.installment.outstandingCurrency || props.installment.totalCurrency || 'TRY',
  }).format(amount)
}

function handleSubmit() {
  const discount = discountAmount.value > 0 ? effectiveDiscountPercentage.value : undefined
  emit('submit', finalAmount.value, discount, notes.value)
}
</script>

<template>
  <RcModal
    :open="open"
    title="Taksit erken kapatma"
    subtitle="Kalan bakiyeyi tek seferde kapatın"
    wide
    @close="emit('close')"
  >
    <div class="rci-closure__summary">
      <div class="rci-closure__metric">
        <span class="rci-closure__label">Toplam tutar</span>
        <strong>{{ formatCurrency(installment.totalAmount) }}</strong>
      </div>
      <div class="rci-closure__metric">
        <span class="rci-closure__label">Aylık ödeme</span>
        <strong>{{ formatCurrency(installment.monthlyPayment) }}</strong>
      </div>
      <div class="rci-closure__metric">
        <span class="rci-closure__label">Kalan taksit</span>
        <strong>{{ installment.remainingInstallments }} adet</strong>
      </div>
      <div class="rci-closure__metric rci-closure__metric--highlight">
        <span class="rci-closure__label">Kalan bakiye</span>
        <strong class="rci-closure__balance">{{ formatCurrency(installment.outstandingBalance) }}</strong>
      </div>
    </div>

    <div class="rci-closure__section">
      <h4 class="rci-closure__section-title">İndirim (opsiyonel)</h4>
      <p class="rci-closure__hint">Erken ödeme indirimi uygulamak isterseniz oran veya tutar girebilirsiniz.</p>
      <div class="rcs-modal-grid">
        <RcField label="İndirim oranı (%)" hint="0–100 arası">
          <input
            v-model.number="discountPercentage"
            type="number"
            class="rc-input"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
          />
        </RcField>
        <RcField label="İndirim tutarı (₺)" hint="Tutar girerseniz oran otomatik hesaplanır">
          <input
            v-model.number="discountAmountInput"
            type="number"
            class="rc-input"
            min="0"
            :max="installment.outstandingBalance"
            step="0.01"
            placeholder="0"
          />
        </RcField>
      </div>
    </div>

    <div class="rci-closure__calc">
      <div class="rci-closure__calc-row">
        <span>Kalan bakiye</span>
        <span>{{ formatCurrency(installment.outstandingBalance) }}</span>
      </div>
      <div v-if="discountAmount > 0" class="rci-closure__calc-row rci-closure__calc-row--discount">
        <span>İndirim ({{ effectiveDiscountPercentage.toFixed(1) }}%)</span>
        <span>−{{ formatCurrency(discountAmount) }}</span>
      </div>
      <div class="rci-closure__calc-row rci-closure__calc-row--total">
        <span>Ödenecek tutar</span>
        <strong>{{ formatCurrency(finalAmount) }}</strong>
      </div>
    </div>

    <RcField label="Notlar (opsiyonel)">
      <textarea
        v-model="notes"
        class="rc-input"
        rows="3"
        placeholder="Erken kapama ile ilgili notlarınız…"
        style="resize: vertical; min-height: 72px"
      />
    </RcField>

    <div class="rca-pay-alert rca-pay-alert--warn" style="margin-top: 16px">
      <strong>Dikkat:</strong> Erken kapama işlemi geri alınamaz. Tüm kalan taksitler ödendi olarak işaretlenecektir.
    </div>

    <template #footer>
      <RcButton variant="secondary" @click="emit('close')">İptal</RcButton>
      <RcButton variant="primary" :disabled="processing" @click="handleSubmit">
        {{ processing ? 'İşleniyor…' : `${formatCurrency(finalAmount)} öde ve kapat` }}
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rci-closure__summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 14px;
  background: var(--rc-bg-subtle);
  border-radius: var(--rc-radius-md);
  margin-bottom: 16px;
}

.rci-closure__metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rci-closure__metric--highlight {
  grid-column: 1 / -1;
  padding: 10px 12px;
  background: var(--rc-surface);
  border-radius: var(--rc-radius-sm);
  border-left: 3px solid var(--rc-accent);
}

.rci-closure__label {
  font-size: 12px;
  color: var(--rc-text-muted);
}

.rci-closure__balance {
  font-size: 18px;
  color: var(--rc-accent);
}

.rci-closure__section {
  margin-bottom: 16px;
}

.rci-closure__section-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.rci-closure__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--rc-text-muted);
}

.rci-closure__calc {
  padding: 14px;
  background: var(--rc-bg-subtle);
  border-radius: var(--rc-radius-md);
  margin-bottom: 16px;
}

.rci-closure__calc-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--rc-border-subtle);
  font-size: 14px;
}

.rci-closure__calc-row:last-child {
  border-bottom: none;
}

.rci-closure__calc-row--discount {
  color: var(--rc-green-600);
}

.rci-closure__calc-row--total {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 2px solid var(--rc-border-subtle);
  font-size: 15px;
}
</style>
