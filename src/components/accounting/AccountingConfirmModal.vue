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
  <RcModal :open="open" :title="title" @close="emit('close')">
    <p style="margin: 0; font-size: 14px; color: var(--rc-text-muted); line-height: 1.5">
      {{ message }}
    </p>
    <template #footer>
      <RcButton variant="secondary" @click="emit('close')">Vazgeç</RcButton>
      <RcButton
        :variant="variant === 'warning' ? 'secondary' : 'primary'"
        :disabled="submitting"
        @click="onConfirm"
      >
        {{ confirmLabel || 'Onayla' }}
      </RcButton>
    </template>
  </RcModal>
</template>
