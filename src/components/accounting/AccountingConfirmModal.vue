<script setup lang="ts">
import { ref } from 'vue'
import { RcModal, RcButton } from '@/components/rc'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'warning'
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const submitting = ref(false)

async function onConfirm() {
  submitting.value = true
  try {
    emit('confirm')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal
    :open="open"
    :icon="variant === 'danger' ? 'warning' : 'info'"
    :intent="variant === 'danger' ? 'destructive' : 'warning'"
    :title="title"
    @close="emit('close')"
  >
    <p class="rc-modal-prose">{{ message }}</p>
    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton
        :variant="variant === 'danger' ? 'danger' : 'accent'"
        :loading="submitting"
        @click="onConfirm"
      >
        {{ confirmLabel || 'Onayla' }}
      </RcButton>
    </template>
  </RcModal>
</template>
