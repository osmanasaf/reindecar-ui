<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    disabled?: boolean
    inputId?: string
  }>(),
  { disabled: false, inputId: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

interface FuelStep {
  label: string
  value: number
}

const STEPS: readonly FuelStep[] = [
  { label: 'Boş', value: 0 },
  { label: '⅛', value: 12.5 },
  { label: '¼', value: 25 },
  { label: '⅜', value: 37.5 },
  { label: '½', value: 50 },
  { label: '⅝', value: 62.5 },
  { label: '¾', value: 75 },
  { label: '⅞', value: 87.5 },
  { label: 'Dolu', value: 100 },
]

const STEP_MATCH_TOLERANCE = 0.01
const MIN_PERCENT = 0
const MAX_PERCENT = 100
const LOW_THRESHOLD = 25
const MID_THRESHOLD = 50

const percent = computed(() => (props.modelValue == null ? null : clamp(props.modelValue)))

const fillWidth = computed(() => `${percent.value ?? 0}%`)

const fillColor = computed(() => {
  const value = percent.value ?? 0
  if (value < LOW_THRESHOLD) return 'var(--rc-red-500)'
  if (value < MID_THRESHOLD) return 'var(--rc-warning-500)'
  return 'var(--rc-green-500)'
})

const readout = computed(() => {
  if (percent.value == null) return '—'
  const matched = STEPS.find((step) => Math.abs(step.value - percent.value!) < STEP_MATCH_TOLERANCE)
  const fraction = matched && matched.value !== 0 && matched.value !== 100 ? ` (${matched.label})` : ''
  return `%${formatNumber(percent.value)}${fraction}`
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
      <div class="rc-fuel__track">
        <div class="rc-fuel__fill" :style="{ width: fillWidth, background: fillColor }" />
        <span v-for="tick in 7" :key="tick" class="rc-fuel__tick" :style="{ left: `${tick * 12.5}%` }" />
      </div>
      <span class="rc-fuel__endcap">F</span>
      <span class="rc-fuel__readout rc-num">{{ readout }}</span>
    </div>

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
      <label :for="inputId" class="rc-fuel__custom-label">Elle:</label>
      <div class="rc-fuel__custom-input">
        <input
          :id="inputId"
          class="rc-input rc-num"
          type="number"
          min="0"
          max="100"
          step="1"
          inputmode="numeric"
          placeholder="0–100"
          :value="modelValue ?? ''"
          :disabled="disabled"
          @input="onNumberInput"
        />
        <span class="rc-fuel__custom-suffix">%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rc-fuel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rc-fuel__gauge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rc-fuel__endcap {
  font-size: var(--rc-fs-13, 13px);
  font-weight: 700;
  color: var(--rc-text-muted);
  width: 12px;
  text-align: center;
}

.rc-fuel__track {
  position: relative;
  flex: 1;
  height: 14px;
  background: var(--rc-surface-2);
  border: 1px solid var(--rc-border);
  border-radius: 999px;
  overflow: hidden;
}

.rc-fuel__fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  transition: width var(--rc-dur-fast, 0.15s) var(--rc-ease-out, ease-out),
    background var(--rc-dur-fast, 0.15s);
}

.rc-fuel__tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--rc-border);
  opacity: 0.6;
}

.rc-fuel__readout {
  min-width: 78px;
  text-align: right;
  font-weight: 600;
  font-size: var(--rc-fs-13, 13px);
  color: var(--rc-text);
}

.rc-fuel__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rc-fuel__step {
  flex: 1;
  min-width: 42px;
  padding: 5px 4px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-6, 6px);
  font-size: var(--rc-fs-13, 13px);
  font-weight: 600;
  color: var(--rc-text-muted);
  cursor: pointer;
  transition: border-color var(--rc-dur-fast, 0.15s), background var(--rc-dur-fast, 0.15s),
    color var(--rc-dur-fast, 0.15s);
}

.rc-fuel__step:hover:not(:disabled) {
  border-color: var(--rc-accent);
  color: var(--rc-text);
}

.rc-fuel__step--active {
  background: var(--rc-accent-subtle);
  border-color: var(--rc-accent);
  color: var(--rc-accent);
}

.rc-fuel__step:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rc-fuel__custom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rc-fuel__custom-label {
  font-size: var(--rc-fs-13, 13px);
  color: var(--rc-text-muted);
}

.rc-fuel__custom-input {
  position: relative;
  width: 120px;
}

.rc-fuel__custom-input .rc-input {
  padding-right: 24px;
}

.rc-fuel__custom-suffix {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--rc-fs-13, 13px);
  color: var(--rc-text-muted);
  pointer-events: none;
}
</style>
