<script setup lang="ts">
import { ref } from 'vue'
import { insuranceClaimsApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton, RcField } from '@/components/rc'

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

function validateAmount() {
  if (!amount.value || amount.value <= 0) {
    error.value = 'Ödeme tutarı 0\'dan büyük olmalıdır'
    return false
  }
  if (props.remainingAmount && amount.value > props.remainingAmount) {
    error.value = `Ödeme tutarı kalan tutardan (${props.remainingAmount}) fazla olamaz`
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
  <RcModal :open="show" title="Ödeme kaydet" @close="handleClose">
    <div class="rca-pay-alert rca-pay-alert--info">
      Sigorta şirketinden alınan tazminat ödemesini kaydedin.
    </div>
    <form id="record-claim-payment-form" @submit.prevent="handleSubmit">
      <RcField
        label="Ödeme tutarı (TL)"
        :hint="remainingAmount ? `Kalan tutar: ${remainingAmount.toLocaleString('tr-TR')} TL` : undefined"
      >
        <input
          v-model.number="amount"
          type="number"
          step="0.01"
          class="rc-input"
          placeholder="0.00"
          @input="validateAmount"
        />
      </RcField>
      <span v-if="error" class="rc-field__error">{{ error }}</span>
    </form>
    <template #footer>
      <RcButton variant="secondary" @click="handleClose">İptal</RcButton>
      <RcButton variant="primary" type="submit" form="record-claim-payment-form" :disabled="isSubmitting">
        {{ isSubmitting ? 'Kaydediliyor…' : 'Kaydet' }}
      </RcButton>
    </template>
  </RcModal>
</template>
