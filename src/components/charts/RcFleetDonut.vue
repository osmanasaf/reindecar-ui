<script setup lang="ts">
import { computed } from 'vue'

export interface FleetDonutItem {
  key: string
  label: string
  count: number
  color: string
}

const props = defineProps<{
  items: FleetDonutItem[]
}>()

const total = computed(() => props.items.reduce((sum, item) => sum + item.count, 0))

const segments = computed(() => {
  const r = 56
  const circumference = 2 * Math.PI * r
  let offset = 0
  const t = total.value || 1
  return props.items.map((item) => {
    const len = (item.count / t) * circumference
    const segment = { ...item, len, offset, circumference }
    offset += len
    return segment
  })
})
</script>

<template>
  <div class="rc-fleet-donut" role="img" :aria-label="`Filo durumu, toplam ${total} araç`">
    <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
      <circle cx="70" cy="70" r="56" fill="none" stroke="var(--rc-donut-track)" stroke-width="14" />
      <circle
        v-for="seg in segments"
        :key="seg.key"
        cx="70"
        cy="70"
        r="56"
        fill="none"
        :stroke="seg.color"
        stroke-width="14"
        :stroke-dasharray="`${seg.len} ${seg.circumference}`"
        :stroke-dashoffset="-seg.offset"
        transform="rotate(-90 70 70)"
      />
      <text
        x="70"
        y="68"
        text-anchor="middle"
        font-family="var(--rc-font-display)"
        font-size="26"
        font-weight="600"
        fill="var(--rc-text)"
        letter-spacing="-0.025em"
      >{{ total }}</text>
      <text
        x="70"
        y="86"
        text-anchor="middle"
        font-size="10"
        fill="var(--rc-text-muted)"
        letter-spacing="0.08em"
      >ARAÇ</text>
    </svg>
    <div class="rc-fleet-donut__legend">
      <div v-for="item in items" :key="item.key" class="rc-fleet-donut__row">
        <span class="rc-dot" :style="{ background: item.color }" />
        <span class="rc-fleet-donut__label">{{ item.label }}</span>
        <span class="rc-num rc-fleet-donut__count">{{ item.count }}</span>
        <span class="rc-num rc-fleet-donut__pct">
          {{ total ? Math.round((item.count / total) * 100) : 0 }}%
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rc-fleet-donut {
  display: flex;
  align-items: center;
  gap: 24px;
}

.rc-fleet-donut__legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rc-fleet-donut__row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.rc-fleet-donut__label {
  flex: 1;
}

.rc-fleet-donut__count {
  font-weight: 500;
}

.rc-fleet-donut__pct {
  color: var(--rc-text-muted);
  width: 36px;
  text-align: right;
}

@media (max-width: 640px) {
  .rc-fleet-donut {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
