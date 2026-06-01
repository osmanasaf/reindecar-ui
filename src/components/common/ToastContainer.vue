<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { RcIcon } from '@/components/icons'
import type { IconName } from '@/components/icons/iconPaths'

const { toasts, removeToast } = useToast()

const iconByType: Record<string, IconName> = {
  success: 'check',
  error: 'close',
  warning: 'warning',
  info: 'info',
}
</script>

<template>
  <Teleport to="body">
    <div class="rc-toast-stack" aria-live="polite" aria-relevant="additions">
      <TransitionGroup name="rc-toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['rc-toast', `rc-toast--${toast.type}`]"
          role="alert"
          @click="removeToast(toast.id)"
        >
          <RcIcon :name="iconByType[toast.type] || 'info'" :size="16" class="rc-toast__icon" />
          <div class="rc-toast__body">{{ toast.message }}</div>
          <button
            type="button"
            class="rc-toast__close"
            aria-label="Kapat"
            @click.stop="removeToast(toast.id)"
          >
            <RcIcon name="close" :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
