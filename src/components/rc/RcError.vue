<script setup lang="ts">
import RcButton from './RcButton.vue'
import { RcAntlerMark } from '@/components/icons'

withDefaults(defineProps<{
  title?: string
  message?: string
  retryLabel?: string
  retryable?: boolean
}>(), {
  title: 'Bir şeyler ters gitti',
  message: 'Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.',
  retryLabel: 'Tekrar dene',
  retryable: true,
})

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="rc-error" role="alert">
    <div class="rc-error__icon">
      <slot name="icon">
        <RcAntlerMark :size="32" />
      </slot>
    </div>
    <p v-if="title" class="rc-error__title">{{ title }}</p>
    <p v-if="message || $slots.default" class="rc-error__message">
      <slot>{{ message }}</slot>
    </p>
    <div v-if="$slots.action || retryable" class="rc-error__action">
      <slot name="action">
        <RcButton v-if="retryable" variant="secondary" size="sm" @click="emit('retry')">
          {{ retryLabel }}
        </RcButton>
      </slot>
    </div>
  </div>
</template>
