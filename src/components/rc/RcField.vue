<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { RcIcon } from '@/components/icons'

/** Onay işaretinin ekranda kaldığı süre. */
const VALID_MARK_MS = 1600

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  required?: boolean
  error?: string
}>(), {})

const showValid = ref(false)
let hadError = false
let timer: ReturnType<typeof setTimeout> | undefined

watch(() => props.error, (error) => {
  clearTimeout(timer)
  if (error) {
    hadError = true
    showValid.value = false
    return
  }
  if (!hadError) return
  hadError = false
  showValid.value = true
  timer = setTimeout(() => {
    showValid.value = false
  }, VALID_MARK_MS)
})

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <label class="rc-field" :class="{ 'rc-field--error': !!error }">
    <span v-if="label || showValid" class="rc-field__label">
      <template v-if="label">
        {{ label }}<span v-if="required" class="rc-field__required" aria-hidden="true">*</span>
      </template>
      <RcIcon v-if="showValid" name="check" :size="14" class="rc-icon--sm rc-field__valid" />
    </span>
    <slot />
    <span v-if="error" class="rc-field__error">{{ error }}</span>
    <span v-else-if="hint" class="rc-field__hint">{{ hint }}</span>
  </label>
</template>
