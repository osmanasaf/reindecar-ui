<script setup lang="ts">
import { ref } from 'vue'
import { useInstallmentStore } from '@/stores/installment.store'
import { RcButton, RcModal } from '@/components/rc'

interface Props {
  installmentId: number
  paymentId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{ success: [] }>()

const installmentStore = useInstallmentStore()
const showConfirmDialog = ref(false)
const processing = ref(false)

async function handleConfirm(): Promise<void> {
  processing.value = true
  try {
    const result = await installmentStore.recordPayment(props.installmentId, props.paymentId)
    if (result) {
      showConfirmDialog.value = false
      emit('success')
    }
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <RcButton
    variant="accent"
    size="xs"
    :disabled="processing"
    @click="showConfirmDialog = true"
  >
    Ödeme Kaydet
  </RcButton>

  <RcModal
    :open="showConfirmDialog"
    title="Ödeme Kaydı"
    @close="showConfirmDialog = false"
  >
    <p style="margin: 0; font-size: 14px; color: var(--rc-text-soft); line-height: 1.55">
      Bu ödemeyi ödendi olarak işaretlemek istediğinizden emin misiniz?
    </p>
    <template #footer>
      <RcButton
        variant="secondary"
        :disabled="processing"
        @click="showConfirmDialog = false"
      >
        İptal
      </RcButton>
      <RcButton variant="accent" :disabled="processing" @click="handleConfirm">
        {{ processing ? 'Kaydediliyor…' : 'Onayla' }}
      </RcButton>
    </template>
  </RcModal>
</template>
