<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { insuranceClaimsApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { fmtTRY } from '@/utils/format'

interface Props {
  show: boolean
  claimId: number
  remainingAmount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const amount = ref<number>(props.remainingAmount || 0)
const isSubmitting = ref(false)
const error = ref('')

const remaining = computed(() => props.remainingAmount ?? 0)
const isFullRemaining = computed(
  () => remaining.value > 0 && Math.abs(amount.value - remaining.value) < 0.005,
)

// Modal her açılışta kalan tutarla başlasın; kapatılan modaldaki
// değer bir sonraki açılışa taşınmasın.
watch(
  () => props.show,
  (open) => {
    if (!open) return
    amount.value = remaining.value
    error.value = ''
  },
  { immediate: true },
)

function setFullAmount() {
  if (remaining.value <= 0) return
  amount.value = remaining.value
  validateAmount()
}

function validateAmount() {
  if (!amount.value || amount.value <= 0) {
    error.value = 'Ödeme tutarı 0\'dan büyük olmalıdır'
    return false
  }
  if (props.remainingAmount && amount.value > props.remainingAmount) {
    error.value = `Tutar kalan bakiyeden (${fmtTRY(props.remainingAmount)}) fazla olamaz`
    return false
  }
  error.value = ''
  return true
}

async function handleSubmit() {
  if (!validateAmount()) return

  isSubmitting.value = true
  try {
    await insuranceClaimsApi.recordPayment(props.claimId, amount.value)
    toast.success('Ödeme başarıyla kaydedildi')
    emit('success')
    emit('close')
  } catch (err: unknown) {
    toast.error((err as Error).message || 'Ödeme kaydedilirken hata oluştu')
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  amount.value = props.remainingAmount || 0
  error.value = ''
  emit('close')
}
</script>

<template>
  <RcModal :open="show" @close="handleClose">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="cash" :size="20" class="rc-modal__title-icon" />
          Ödeme kaydet
        </h2>
        <div class="rc-modal__sub">Sigorta şirketinden alınan tazminat ödemesi</div>
      </div>
    </template>

    <div v-if="remaining > 0" class="rc-modal-callout" role="status">
      <div class="rc-modal-callout__main">
        <span class="rc-modal-callout__label">Tahsil edilecek kalan</span>
        <button
          type="button"
          class="rc-modal-callout__value rc-num"
          :disabled="isFullRemaining"
          title="Kalan tutarı forma yaz"
          @click="setFullAmount"
        >
          {{ fmtTRY(remaining) }}
        </button>
      </div>
      <RcButton variant="ghost" size="sm" :disabled="isFullRemaining" @click="setFullAmount">
        {{ isFullRemaining ? 'Kalanın tamamı seçili' : 'Kalanın tamamını al' }}
      </RcButton>
    </div>

    <form id="record-claim-payment-form" class="rc-modal-form" @submit.prevent="handleSubmit">
      <RcField
        class="rc-modal-form__full"
        label="Tutar (₺)"
        required
        :error="error || undefined"
        :hint="remaining > 0 ? `En fazla ${fmtTRY(remaining)} tahsil edilebilir` : undefined"
      >
        <input
          v-model.number="amount"
          type="number"
          min="0"
          :max="remaining || undefined"
          step="0.01"
          class="rc-input"
          placeholder="0,00"
          @input="validateAmount"
        />
      </RcField>
    </form>

    <template #footer>
      <RcButton variant="ghost" @click="handleClose">Vazgeç</RcButton>
      <RcButton
        variant="accent"
        type="submit"
        form="record-claim-payment-form"
        :loading="isSubmitting"
      >
        <RcIcon name="check" :size="14" />
        Ödemeyi kaydet
      </RcButton>
    </template>
  </RcModal>
</template>
