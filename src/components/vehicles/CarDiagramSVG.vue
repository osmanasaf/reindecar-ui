<script setup lang="ts">
interface ZoneConfig {
  color: string
  onClick?: () => void
}

interface Props {
  zones: Record<number, ZoneConfig>
  selectedZone?: number
}

const props = withDefaults(defineProps<Props>(), {
  selectedZone: undefined
})

const getZoneStyle = (zoneId: number) => {
  const zone = props.zones[zoneId]
  const isSelected = props.selectedZone === zoneId

  return {
    fill: zone?.color || '#f5f5f5',
    stroke: isSelected ? 'var(--color-primary, #2563eb)' : '#333',
    strokeWidth: isSelected ? '2.5' : '1',
    cursor: zone?.onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease'
  }
}

const handleZoneClick = (zoneId: number) => {
  const zone = props.zones[zoneId]
  if (zone?.onClick) {
    zone.onClick()
  }
}
</script>

<template>
  <svg
    viewBox="0 0 300 500"
    xmlns="http://www.w3.org/2000/svg"
    class="car-diagram"
    aria-label="Araç bölge haritası"
  >
    <defs>
      <filter id="selectedGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="var(--color-primary, #2563eb)" flood-opacity="0.5" />
      </filter>
    </defs>

    <g class="car-zones">
      <path
        :style="getZoneStyle(4)"
        :filter="selectedZone === 4 ? 'url(#selectedGlow)' : ''"
        d="M 30 60 L 80 40 L 80 100 L 30 100 Z"
        @click="handleZoneClick(4)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(3)"
        :filter="selectedZone === 3 ? 'url(#selectedGlow)' : ''"
        d="M 85 40 L 150 25 L 215 40 L 215 100 L 85 100 Z"
        @click="handleZoneClick(3)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(1)"
        :filter="selectedZone === 1 ? 'url(#selectedGlow)' : ''"
        d="M 220 40 L 270 60 L 270 100 L 220 100 Z"
        @click="handleZoneClick(1)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(2)"
        :filter="selectedZone === 2 ? 'url(#selectedGlow)' : ''"
        d="M 60 105 L 95 75 L 205 75 L 240 105 L 240 145 L 60 145 Z"
        @click="handleZoneClick(2)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(6)"
        :filter="selectedZone === 6 ? 'url(#selectedGlow)' : ''"
        d="M 20 105 L 55 105 L 55 245 L 20 245 Z"
        @click="handleZoneClick(6)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(13)"
        :filter="selectedZone === 13 ? 'url(#selectedGlow)' : ''"
        d="M 60 150 L 240 150 L 240 340 L 60 340 Z"
        @click="handleZoneClick(13)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(12)"
        :filter="selectedZone === 12 ? 'url(#selectedGlow)' : ''"
        d="M 245 105 L 280 105 L 280 245 L 245 245 Z"
        @click="handleZoneClick(12)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(7)"
        :filter="selectedZone === 7 ? 'url(#selectedGlow)' : ''"
        d="M 20 250 L 55 250 L 55 395 L 20 395 Z"
        @click="handleZoneClick(7)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(10)"
        :filter="selectedZone === 10 ? 'url(#selectedGlow)' : ''"
        d="M 245 250 L 280 250 L 280 395 L 245 395 Z"
        @click="handleZoneClick(10)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(9)"
        :filter="selectedZone === 9 ? 'url(#selectedGlow)' : ''"
        d="M 60 345 L 240 345 L 240 395 L 205 425 L 95 425 L 60 395 Z"
        @click="handleZoneClick(9)"
        class="zone-path"
      />

      <path
        :style="getZoneStyle(8)"
        :filter="selectedZone === 8 ? 'url(#selectedGlow)' : ''"
        d="M 85 400 L 215 400 L 215 460 L 150 475 L 85 460 Z"
        @click="handleZoneClick(8)"
        class="zone-path"
      />
    </g>

    <g class="car-outline" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 150 20 C 100 20 60 35 45 55 L 25 95 L 20 105 L 20 395 L 25 405 L 45 445 C 60 465 100 480 150 480 C 200 480 240 465 255 445 L 275 405 L 280 395 L 280 105 L 275 95 L 255 55 C 240 35 200 20 150 20 Z" />
      
      <path d="M 55 100 L 95 70 L 205 70 L 245 100" />
      <path d="M 55 100 L 55 145 L 245 145 L 245 100" />
      
      <path d="M 55 345 L 55 400 L 95 430 L 205 430 L 245 400 L 245 345" />
      
      <line x1="55" y1="245" x2="55" y2="250" />
      <line x1="245" y1="245" x2="245" y2="250" />
      
      <line x1="150" y1="25" x2="150" y2="65" />
      <line x1="150" y1="435" x2="150" y2="475" />
    </g>

    <g class="wheels" fill="#333" stroke="#222" stroke-width="1.5">
      <ellipse cx="30" cy="75" rx="12" ry="25" />
      <ellipse cx="270" cy="75" rx="12" ry="25" />
      <ellipse cx="30" cy="420" rx="12" ry="25" />
      <ellipse cx="270" cy="420" rx="12" ry="25" />
    </g>

    <g class="mirrors" fill="#555" stroke="#333" stroke-width="1">
      <ellipse cx="12" cy="130" rx="8" ry="14" />
      <ellipse cx="288" cy="130" rx="8" ry="14" />
    </g>

    <g class="zone-labels" v-if="selectedZone">
      <g v-if="selectedZone === 1">
        <circle cx="245" cy="70" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="245" y="75" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">1</text>
      </g>
      <g v-if="selectedZone === 2">
        <circle cx="150" cy="115" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="150" y="120" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">2</text>
      </g>
      <g v-if="selectedZone === 3">
        <circle cx="150" cy="65" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="150" y="70" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">3</text>
      </g>
      <g v-if="selectedZone === 4">
        <circle cx="55" cy="70" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="55" y="75" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">4</text>
      </g>
      <g v-if="selectedZone === 6">
        <circle cx="38" cy="175" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="38" y="180" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">6</text>
      </g>
      <g v-if="selectedZone === 7">
        <circle cx="38" cy="320" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="38" y="325" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">7</text>
      </g>
      <g v-if="selectedZone === 8">
        <circle cx="150" cy="440" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="150" y="445" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">8</text>
      </g>
      <g v-if="selectedZone === 9">
        <circle cx="150" cy="380" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="150" y="385" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">9</text>
      </g>
      <g v-if="selectedZone === 10">
        <circle cx="262" cy="320" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="262" y="325" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">10</text>
      </g>
      <g v-if="selectedZone === 12">
        <circle cx="262" cy="175" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="262" y="180" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">12</text>
      </g>
      <g v-if="selectedZone === 13">
        <circle cx="150" cy="245" r="14" fill="var(--color-primary, #2563eb)" />
        <text x="150" y="250" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">13</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.car-diagram {
  width: 100%;
  max-width: 280px;
  height: auto;
  display: block;
  margin: 0 auto;
}

.zone-path {
  transition: all 0.2s ease;
}

.zone-path:hover {
  filter: brightness(0.95);
  stroke-width: 2;
}

.car-outline,
.wheels,
.mirrors {
  pointer-events: none;
}

.zone-labels text {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  pointer-events: none;
}
</style>
