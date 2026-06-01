<script setup lang="ts">
import { ref } from 'vue'
import { insuranceClaimsApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton, RcField } from '@/components/rc'

interface Props {
  show: boolean
  claimId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const reason = ref('')
const isSubmitting = ref(false)
const error = ref('')

function validateReason() {
  if (!reason.value.trim()) {
    error.value = 'Red sebebi zorunludur'
    return false
  }
  if (reason.value.length > 500) {
    error.value = 'Red sebebi en fazla 500 karakter olabilir'
    return false
  }
  error.value = ''
  return true
}

async function handleSubmit() {
  if (!validateReason()) return

  isSubmitting.value = true
  try {
    await insuranceClaimsApi.reject(props.claimId, { reason: reason.value.trim() })
    toast.success('Başvuru reddedildi')
    emit('success')
    emit('close')
  } catch (err: unknown) {
    toast.error((err as Error).message || 'Başvuru reddedilirken hata oluştu')
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  reason.value = ''
  error.value = ''
  emit('close')
}
</script>

<template>
  <RcModal :open="show" title="Başvuruyu reddet" @close="handleClose">
    <div class="rca-pay-alert rca-pay-alert--warn">
      Bu sigorta başvurusunu reddetmek üzeresiniz. Red sebebini belirtiniz.
    </div>
    <form id="reject-claim-form" @submit.prevent="handleSubmit">
      <RcField label="Red sebebi">
        <textarea
          v-model="reason"
          class="rc-input"
          rows="4"
          maxlength="500"
          placeholder="Red sebebini açıklayın…"
          style="resize: vertical; min-height: 96px"
          @input="validateReason"
        />
      </RcField>
      <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 4px">
        <span v-if="error" class="rc-field__error">{{ error }}</span>
        <span class="rc-field__hint" style="margin-left: auto">{{ reason.length }}/500</span>
      </div>
    </form>
    <template #footer>
      <RcButton variant="secondary" @click="handleClose">İptal</RcButton>
      <RcButton variant="danger" type="submit" form="reject-claim-form" :disabled="isSubmitting">
        {{ isSubmitting ? 'Reddediliyor…' : 'Reddet' }}
      </RcButton>
    </template>
  </RcModal>
</template>
