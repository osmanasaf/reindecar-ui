<script setup lang="ts">
import { computed } from 'vue'
import { fmtTRY } from '@/utils/format'

const props = withDefaults(defineProps<{
  data: number[]
  labels: string[]
  /** İlk yüklemede çubukların büyüyerek girmesi. Yenileme/filtrede kapalı. */
  intro?: boolean
}>(), {
  intro: false,
})

const max = computed(() => Math.max(...props.data, 1))
</script>

<template>
  <div
    class="rc-revenue-bars"
    :class="{ 'rc-revenue-bars--intro': intro }"
    role="img"
    :aria-label="`${data.length} aylık ciro grafiği`"
  >
    <div
      v-for="(value, i) in data"
      :key="i"
      class="rc-revenue-bars__col"
    >
      <div
        class="rc-revenue-bars__bar"
        :class="{ 'rc-revenue-bars__bar--last': i === data.length - 1 }"
        :style="{ height: `${(value / max) * 100}%` }"
        :title="fmtTRY(value)"
      />
      <span class="rc-revenue-bars__label">{{ labels[i] }}</span>
    </div>
  </div>
</template>

<style scoped>
.rc-revenue-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 140px;
  padding: 8px 4px;
}

.rc-revenue-bars__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
  justify-content: flex-end;
}

.rc-revenue-bars__bar {
  width: 100%;
  min-height: 4px;
  background: var(--rc-chart-bar);
  border-radius: 3px;
  transform-origin: bottom center;
  transition: background 200ms;
}

.rc-revenue-bars__bar--last {
  background: var(--rc-chart-bar-active);
}

/* Giriş: çubuklar tabandan yukarı doğru büyür. */
.rc-revenue-bars--intro .rc-revenue-bars__bar {
  animation: rcGrowY 520ms var(--rc-ease-out) both;
}
.rc-revenue-bars--intro .rc-revenue-bars__col:nth-child(1) .rc-revenue-bars__bar { animation-delay: 0ms; }
.rc-revenue-bars--intro .rc-revenue-bars__col:nth-child(2) .rc-revenue-bars__bar { animation-delay: 50ms; }
.rc-revenue-bars--intro .rc-revenue-bars__col:nth-child(3) .rc-revenue-bars__bar { animation-delay: 100ms; }
.rc-revenue-bars--intro .rc-revenue-bars__col:nth-child(4) .rc-revenue-bars__bar { animation-delay: 150ms; }
.rc-revenue-bars--intro .rc-revenue-bars__col:nth-child(5) .rc-revenue-bars__bar { animation-delay: 200ms; }
.rc-revenue-bars--intro .rc-revenue-bars__col:nth-child(6) .rc-revenue-bars__bar { animation-delay: 250ms; }
.rc-revenue-bars--intro .rc-revenue-bars__col:nth-child(n + 7) .rc-revenue-bars__bar { animation-delay: 300ms; }

@keyframes rcGrowY {
  from { transform: scaleY(0.04); }
  to   { transform: scaleY(1); }
}

@media (prefers-reduced-motion: reduce) {
  .rc-revenue-bars--intro .rc-revenue-bars__bar {
    animation: none !important;
  }
}

.rc-revenue-bars__label {
  font-size: 10px;
  color: var(--rc-text-muted);
  font-family: var(--rc-font-mono);
}
</style>
