<script setup lang="ts">
import { computed } from 'vue'
import { fmtTRY } from '@/utils/format'

const props = defineProps<{
  data: number[]
  labels: string[]
}>()

const max = computed(() => Math.max(...props.data, 1))
</script>

<template>
  <div class="rc-revenue-bars" role="img" :aria-label="`${data.length} aylık ciro grafiği`">
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
  transition: background 200ms;
}

.rc-revenue-bars__bar--last {
  background: var(--rc-chart-bar-active);
}

.rc-revenue-bars__label {
  font-size: 10px;
  color: var(--rc-text-muted);
  font-family: var(--rc-font-mono);
}
</style>
