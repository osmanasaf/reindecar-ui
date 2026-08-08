<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    disabled?: boolean
    inputId?: string
    referencePercent?: number | null
    referenceLabel?: string
  }>(),
  { disabled: false, inputId: undefined, referencePercent: null, referenceLabel: 'Çıkış' },
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

interface FuelStep {
  label: string
  value: number
}

const STEPS: readonly FuelStep[] = [
  { label: 'Boş', value: 0 },
  { label: '¼', value: 25 },
  { label: '½', value: 50 },
  { label: '¾', value: 75 },
  { label: 'Dolu', value: 100 },
]

const STEP_MATCH_TOLERANCE = 0.01
const SNAP_TOLERANCE = 3
const MIN_PERCENT = 0
const MAX_PERCENT = 100
const LOW_THRESHOLD = 25
const MID_THRESHOLD = 50

const trackEl = ref<HTMLElement | null>(null)
const dragging = ref(false)

const percent = computed(() => (props.modelValue == null ? null : clamp(props.modelValue)))

const fillWidth = computed(() => `${percent.value ?? 0}%`)

const fillColor = computed(() => {
  const value = percent.value ?? 0
  if (value < LOW_THRESHOLD) return 'var(--rc-danger-500)'
  if (value < MID_THRESHOLD) return 'var(--rc-warning-500)'
  return 'var(--rc-success-500)'
})

const readout = computed(() => (percent.value == null ? '—' : `%${formatNumber(percent.value)}`))

const reference = computed(() =>
  props.referencePercent == null ? null : clamp(props.referencePercent),
)

interface FuelDelta {
  type: 'deficit' | 'even' | 'surplus'
  amount: number
}

const delta = computed<FuelDelta | null>(() => {
  if (reference.value == null || percent.value == null) return null
  const diff = percent.value - reference.value
  if (diff < 0) return { type: 'deficit', amount: Math.abs(diff) }
  if (diff > 0) return { type: 'surplus', amount: diff }
  return { type: 'even', amount: 0 }
})

const deltaText = computed(() => {
  if (!delta.value) return ''
  if (delta.value.type === 'deficit')
    return `${props.referenceLabel} seviyesine göre %${formatNumber(delta.value.amount)} eksik`
  if (delta.value.type === 'surplus')
    return `${props.referenceLabel} seviyesine göre %${formatNumber(delta.value.amount)} fazla`
  return `${props.referenceLabel} seviyesiyle aynı`
})

function clamp(value: number): number {
  if (Number.isNaN(value)) return MIN_PERCENT
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value))
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('tr-TR')
}

function isActive(step: FuelStep): boolean {
  return percent.value != null && Math.abs(step.value - percent.value) < STEP_MATCH_TOLERANCE
}

function selectStep(step: FuelStep): void {
  if (props.disabled) return
  emit('update:modelValue', step.value)
}

function percentFromPointer(event: PointerEvent): number {
  const rect = trackEl.value!.getBoundingClientRect()
  const raw = ((event.clientX - rect.left) / rect.width) * 100
  const rounded = Math.round(clamp(raw))
  const snap = STEPS.find((step) => Math.abs(step.value - rounded) <= SNAP_TOLERANCE)
  return snap ? snap.value : rounded
}

function onTrackPointerDown(event: PointerEvent): void {
  if (props.disabled || !trackEl.value) return
  dragging.value = true
  ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
  emit('update:modelValue', percentFromPointer(event))
}

function onTrackPointerMove(event: PointerEvent): void {
  if (!dragging.value || !trackEl.value) return
  emit('update:modelValue', percentFromPointer(event))
}

function onTrackPointerUp(): void {
  dragging.value = false
}

function onTrackKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const current = percent.value ?? 0
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    event.preventDefault()
    emit('update:modelValue', clamp(current + (event.shiftKey ? 25 : 5)))
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    event.preventDefault()
    emit('update:modelValue', clamp(current - (event.shiftKey ? 25 : 5)))
  }
}

function onNumberInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  if (raw === '') {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', clamp(Number(raw)))
}
</script>

<template>
  <div class="rc-fuel" role="group" aria-label="Yakıt seviyesi">
    <div class="rc-fuel__gauge">
      <span class="rc-fuel__endcap">E</span>
      <div
        ref="trackEl"
        class="rc-fuel__track"
        :class="{ 'rc-fuel__track--disabled': disabled }"
        role="slider"
        :tabindex="disabled ? -1 : 0"
        aria-label="Yakıt yüzdesi"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="percent ?? 0"
        @pointerdown="onTrackPointerDown"
        @pointermove="onTrackPointerMove"
        @pointerup="onTrackPointerUp"
        @pointercancel="onTrackPointerUp"
        @keydown="onTrackKeydown"
      >
        <div class="rc-fuel__fill" :style="{ width: fillWidth, background: fillColor }" />
        <span v-for="tick in 3" :key="tick" class="rc-fuel__tick" :style="{ left: `${tick * 25}%` }" />
        <span
          v-if="reference != null"
          class="rc-fuel__ref"
          :style="{ left: `${reference}%` }"
          :title="`${referenceLabel}: %${formatNumber(reference)}`"
          aria-hidden="true"
        />
        <span
          v-if="percent != null"
          class="rc-fuel__thumb"
          :style="{ left: fillWidth, borderColor: fillColor }"
          aria-hidden="true"
        />
      </div>
      <span class="rc-fuel__endcap">F</span>
      <span class="rc-fuel__readout rc-num">{{ readout }}</span>
    </div>

    <div class="rc-fuel__controls">
      <div class="rc-fuel__steps">
        <button
          v-for="step in STEPS"
          :key="step.value"
          type="button"
          class="rc-fuel__step"
          :class="{ 'rc-fuel__step--active': isActive(step) }"
          :disabled="disabled"
          :aria-pressed="isActive(step)"
          @click="selectStep(step)"
        >
          {{ step.label }}
        </button>
      </div>
      <div class="rc-fuel__custom">
        <input
          :id="inputId"
          class="rc-fuel__custom-field rc-num"
          type="number"
          min="0"
          max="100"
          step="1"
          inputmode="numeric"
          placeholder="0"
          :value="modelValue ?? ''"
          :disabled="disabled"
          aria-label="Yakıt yüzdesi (elle)"
          @input="onNumberInput"
        />
        <span class="rc-fuel__custom-suffix">%</span>
      </div>
    </div>

    <div v-if="delta" class="rc-fuel__delta" :class="`rc-fuel__delta--${delta.type}`" role="status">
      <span class="rc-fuel__delta-dot" aria-hidden="true" />
      {{ deltaText }}
    </div>
  </div>
</template>

<style scoped>
.rc-fuel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: var(--rc-surface-2);
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-8);
}

.rc-fuel__gauge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rc-fuel__endcap {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--rc-text-faint);
  width: 10px;
  text-align: center;
  flex-shrink: 0;
}

.rc-fuel__track {
  position: relative;
  flex: 1;
  height: 12px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border-subtle);
  border-radius: 999px;
  cursor: pointer;
  touch-action: none;
}

.rc-fuel__track:focus-visible {
  outline: 2px solid var(--rc-accent);
  outline-offset: 3px;
}

.rc-fuel__track--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.rc-fuel__fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  transition: width var(--rc-dur-fast) var(--rc-ease-out), background var(--rc-dur-fast);
}

.rc-fuel__tick {
  position: absolute;
  top: 1px;
  bottom: 1px;
  width: 1px;
  background: var(--rc-border);
}

.rc-fuel__ref {
  position: absolute;
  top: -5px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--rc-text-muted);
  pointer-events: none;
}

.rc-fuel__thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--rc-surface);
  border: 2px solid var(--rc-border-strong);
  box-shadow: var(--rc-shadow-sm);
  pointer-events: none;
  transition: left var(--rc-dur-fast) var(--rc-ease-out), border-color var(--rc-dur-fast);
}

.rc-fuel__controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rc-fuel__steps {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-8);
}

.rc-fuel__step {
  height: 24px;
  padding: 0 10px;
  border: none;
  border-radius: var(--rc-r-6);
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--rc-text-muted);
  cursor: pointer;
  transition: background var(--rc-dur-fast), color var(--rc-dur-fast), box-shadow var(--rc-dur-fast);
}

.rc-fuel__step:hover:not(:disabled) {
  color: var(--rc-text);
}

.rc-fuel__step--active {
  background: var(--rc-surface-2);
  color: var(--rc-text);
  font-weight: 600;
  box-shadow: var(--rc-shadow-sm);
}

.rc-fuel__step:focus-visible {
  outline: 2px solid var(--rc-accent);
  outline-offset: 1px;
}

.rc-fuel__step:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rc-fuel__custom {
  position: relative;
  width: 72px;
  margin-left: auto;
}

.rc-fuel__custom-field {
  width: 100%;
  height: 28px;
  padding: 0 22px 0 8px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-6);
  font-size: 12.5px;
  color: var(--rc-text);
  transition: border-color var(--rc-dur-fast), box-shadow var(--rc-dur-fast);
}

.rc-fuel__custom-field:focus {
  outline: none;
  border-color: var(--rc-accent);
  box-shadow: var(--rc-focus-ring);
}

.rc-fuel__custom-suffix {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--rc-text-muted);
  pointer-events: none;
}

.rc-fuel__readout {
  font-size: 14px;
  font-weight: 700;
  color: var(--rc-text);
  min-width: 48px;
  text-align: right;
  flex-shrink: 0;
}

.rc-fuel__delta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.rc-fuel__delta-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.rc-fuel__delta--deficit {
  color: var(--rc-danger-700);
  background: var(--rc-danger-50);
}

.rc-fuel__delta--surplus,
.rc-fuel__delta--even {
  color: var(--rc-success-700);
  background: var(--rc-success-50);
}
</style>
