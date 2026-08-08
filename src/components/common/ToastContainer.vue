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

/* Kapanışta yüksekliğin akıcı daralması için gerçek yükseklik ölçülür;
   CSS tek başına `auto` yükseklikten 0'a geçiş yapamaz. */
function measureHeight(el: Element) {
  const node = el as HTMLElement
  node.style.maxHeight = `${node.offsetHeight}px`
}

function collapseHeight(el: Element) {
  const node = el as HTMLElement
  void node.offsetHeight
  node.style.maxHeight = '0px'
}

function clearHeight(el: Element) {
  ;(el as HTMLElement).style.maxHeight = ''
}
</script>

<template>
  <Teleport to="body">
    <div class="rc-toast-stack" aria-live="polite" aria-relevant="additions">
      <TransitionGroup
        name="rc-toast"
        @before-leave="measureHeight"
        @leave="collapseHeight"
        @after-leave="clearHeight"
      >
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
          <span
            v-if="toast.duration && toast.duration > 0"
            class="rc-toast__progress"
            :style="{ animationDuration: `${toast.duration}ms` }"
            aria-hidden="true"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
