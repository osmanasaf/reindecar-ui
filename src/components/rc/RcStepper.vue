<script setup lang="ts">
import { RcIcon } from '@/components/icons'

export interface StepperStep {
  id: number
  label: string
}

const props = defineProps<{
  steps: StepperStep[]
  current: number
  /** Tamamlanan adıma tıklanabilir */
  clickable?: boolean
}>()

const emit = defineEmits<{ select: [step: number] }>()

function stepClass(stepId: number): Record<string, boolean> {
  return {
    'rc-step--current': stepId === props.current,
    'rc-step--done': stepId < props.current,
  }
}

function onSelect(stepId: number) {
  if (!props.clickable) return
  if (stepId <= props.current) emit('select', stepId)
}
</script>

<template>
  <div class="rc-stepper">
    <template v-for="(step, index) in steps" :key="step.id">
      <button
        type="button"
        class="rc-step"
        :class="stepClass(step.id)"
        :disabled="!clickable || step.id > current"
        @click="onSelect(step.id)"
      >
        <span class="rc-step__num">
          <RcIcon v-if="step.id < current" name="check" :size="12" />
          <template v-else>{{ step.id }}</template>
        </span>
        {{ step.label }}
      </button>
      <RcIcon
        v-if="index < steps.length - 1"
        name="chevronRight"
        :size="14"
        class="rc-step__chev"
      />
    </template>
  </div>
</template>
