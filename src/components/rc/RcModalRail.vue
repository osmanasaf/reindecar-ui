<script setup lang="ts">
import { RcIcon } from '@/components/icons'

/**
 * Modal başlığının altındaki işlem rayı: yapılan işlemin yaşam döngüsündeki
 * yerini gösterir. RentalStatusRail'den farkı, kiralamanın anlık durumunu
 * değil o modalın adımlarını çizmesidir.
 */
export interface ModalRailStep {
  label: string
  /** done = geçilmiş (✓), current = bu modal, upcoming = sonraki. */
  state?: 'done' | 'current' | 'upcoming'
  /** current adımı yıkıcı göstermek için (iptal akışı). */
  danger?: boolean
}

withDefaults(defineProps<{ steps: ModalRailStep[] }>(), {})

function stepClass(step: ModalRailStep): Record<string, boolean> {
  const state = step.state ?? 'upcoming'
  return {
    'rc-status-step--done': state === 'done',
    'rc-status-step--current': state === 'current',
    'rc-status-step--danger': state === 'current' && !!step.danger,
  }
}
</script>

<template>
  <div class="rc-status-rail">
    <template v-for="(step, idx) in steps" :key="step.label">
      <span class="rc-status-step" :class="stepClass(step)">
        <span class="rc-status-step__dot">
          <RcIcon v-if="step.state === 'done'" name="check" :size="10" />
          <template v-else>{{ idx + 1 }}</template>
        </span>
        {{ step.label }}
      </span>
      <RcIcon
        v-if="idx < steps.length - 1"
        name="chevronRight"
        :size="14"
        class="rc-status-step__chev"
      />
    </template>
  </div>
</template>
