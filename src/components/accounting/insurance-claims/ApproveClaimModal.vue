<script setup lang="ts">
import { ref } from 'vue'
import { insuranceClaimsApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton, RcField } from '@/components/rc'

interface Props {
  show: boolean
  claimId: number
  maxAmount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const approvedAmount = ref<number>(props.maxAmount || 0)
const isSubmitting = ref(false)
const error = ref('')

function validateAmount() {
  if (!approvedAmount.value || approvedAmount.value <= 0) {
    error.value = 'Onaylanan tutar 0\'dan büyük olmalıdır'
    return false
  }
  if (props.maxAmount && approvedAmount.value > props.maxAmount) {
    error.value = `Onaylanan tutar talep edilen tutardan (${props.maxAmount}) fazla olamaz`
    return false
  }
  error.value = ''
  return true
}

async function handleSubmit() {
  if (!validateAmount()) return

  isSubmitting.value = true
  try {
    await insuranceClaimsApi.approve(props.claimId, { approvedAmount: approvedAmount.value })
    toast.success('Başvuru başarıyla onaylandı')
    emit('success')
    emit('close')
  } catch (err: unknown) {
    toast.error((err as Error).message || 'Başvuru onaylanırken hata oluştu')
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  approvedAmount.value = props.maxAmount || 0
  error.value = ''
  emit('close')
}
</script>

<template>
  <RcModal :open="show" title="Başvuruyu onayla" @close="handleClose">
    <div class="rca-pay-alert rca-pay-alert--info">
      Bu sigorta başvurusunu onaylamak üzeresiniz. Onaylanan tutarı girin.
    </div>
    <form id="approve-claim-form" @submit.prevent="handleSubmit">
      <RcField
        label="Onaylanan tutar (TL)"
        :hint="maxAmount ? `Talep edilen tutar: ${maxAmount.toLocaleString('tr-TR')} TL` : undefined"
      >
        <input
          v-model.number="approvedAmount"
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
      <RcButton variant="accent" type="submit" form="approve-claim-form" :disabled="isSubmitting">
        {{ isSubmitting ? 'Onaylanıyor…' : 'Onayla' }}
      </RcButton>
    </template>
  </RcModal>
</template>
