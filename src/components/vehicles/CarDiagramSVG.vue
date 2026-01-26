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
    fill: zone?.color || '#E8E8E8',
    stroke: isSelected ? '#000' : '#999',
    strokeWidth: isSelected ? '3' : '1.5',
    cursor: zone?.onClick ? 'pointer' : 'default',
    transition: 'all 0.2s'
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
  <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" class="car-diagram">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
      </filter>
    </defs>

    <!-- Araç Gövdesi Ana Hatları -->
    <g class="car-body">
      <!-- Ön Tampon Alanları -->
      <!-- Zone 4: Sol ön köşe -->
      <path
        :style="getZoneStyle(4)"
        d="M 120 100 L 180 100 L 180 140 L 120 140 Z"
        @click="handleZoneClick(4)"
        class="zone-path"
      />

      <!-- Zone 3: Kaput -->
      <path
        :style="getZoneStyle(3)"
        d="M 200 100 L 350 90 L 450 90 L 600 100 L 600 140 L 200 140 Z"
        @click="handleZoneClick(3)"
        class="zone-path"
      />

      <!-- Zone 1: Sağ ön köşe -->
      <path
        :style="getZoneStyle(1)"
        d="M 620 100 L 680 100 L 680 140 L 620 140 Z"
        @click="handleZoneClick(1)"
        class="zone-path"
      />

      <!-- Zone 2: Ön Cam -->
      <path
        :style="getZoneStyle(2)"
        d="M 220 60 L 580 60 L 600 90 L 200 90 Z"
        @click="handleZoneClick(2)"
        class="zone-path"
      />

      <!-- Yan Paneller -->
      <!-- Zone 6: Sol kapılar -->
      <path
        :style="getZoneStyle(6)"
        d="M 100 150 L 180 150 L 180 250 L 100 250 Z"
        @click="handleZoneClick(6)"
        class="zone-path"
      />

      <!-- Zone 13: İç Mekan/Tavan -->
      <path
        :style="getZoneStyle(13)"
        d="M 200 150 L 600 150 L 600 250 L 200 250 Z"
        @click="handleZoneClick(13)"
        class="zone-path"
      />

      <!-- Zone 12: Sağ kapılar -->
      <path
        :style="getZoneStyle(12)"
        d="M 620 150 L 700 150 L 700 250 L 620 250 Z"
        @click="handleZoneClick(12)"
        class="zone-path"
      />

      <!-- Arka Tampon Alanları -->
      <!-- Zone 7: Sol arka tekerlek bölgesi -->
      <path
        :style="getZoneStyle(7)"
        d="M 120 260 L 180 260 L 180 300 L 120 300 Z"
        @click="handleZoneClick(7)"
        class="zone-path"
      />

      <!-- Zone 8: Bagaj -->
      <path
        :style="getZoneStyle(8)"
        d="M 200 260 L 600 260 L 600 300 L 200 300 Z"
        @click="handleZoneClick(8)"
        class="zone-path"
      />

      <!-- Zone 10: Sağ arka tekerlek bölgesi -->
      <path
        :style="getZoneStyle(10)"
        d="M 620 260 L 680 260 L 680 300 L 620 300 Z"
        @click="handleZoneClick(10)"
        class="zone-path"
      />

      <!-- Zone 9: Arka Cam -->
      <path
        :style="getZoneStyle(9)"
        d="M 220 310 L 580 310 L 600 340 L 200 340 Z"
        @click="handleZoneClick(9)"
        class="zone-path"
      />

      <!-- Tekerlekler (görsel) -->
      <g class="wheels">
        <ellipse cx="150" cy="90" rx="25" ry="28" fill="#333" stroke="#000" stroke-width="2"/>
        <ellipse cx="650" cy="90" rx="25" ry="28" fill="#333" stroke="#000" stroke-width="2"/>
        <ellipse cx="150" cy="310" rx="25" ry="28" fill="#333" stroke="#000" stroke-width="2"/>
        <ellipse cx="650" cy="310" rx="25" ry="28" fill="#333" stroke="#000" stroke-width="2"/>
        
        <!-- Jant detayları -->
        <circle cx="150" cy="90" r="12" fill="#666"/>
        <circle cx="650" cy="90" r="12" fill="#666"/>
        <circle cx="150" cy="310" r="12" fill="#666"/>
        <circle cx="650" cy="310" r="12" fill="#666"/>
      </g>

      <!-- Araç Ana Hatları (üstten) -->
      <path
        d="M 120 100 L 100 150 L 100 250 L 120 300 L 200 340 L 600 340 L 680 300 L 700 250 L 700 150 L 680 100 L 600 100 L 600 90 L 450 90 L 350 90 L 200 90 L 200 100 Z"
        fill="none"
        stroke="#333"
        stroke-width="3"
      />
    </g>

    <!-- Zone Numaraları (Seçili Zone için) -->
    <g class="zone-labels" v-if="selectedZone">
      <circle v-if="selectedZone === 1" cx="650" cy="120" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 1" x="650" y="125" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">1</text>

      <circle v-if="selectedZone === 2" cx="400" cy="75" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 2" x="400" y="80" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">2</text>

      <circle v-if="selectedZone === 3" cx="400" cy="115" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 3" x="400" y="120" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">3</text>

      <circle v-if="selectedZone === 4" cx="150" cy="120" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 4" x="150" y="125" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">4</text>

      <circle v-if="selectedZone === 6" cx="140" cy="200" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 6" x="140" y="205" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">6</text>

      <circle v-if="selectedZone === 7" cx="150" cy="280" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 7" x="150" y="285" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">7</text>

      <circle v-if="selectedZone === 8" cx="400" cy="280" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 8" x="400" y="285" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">8</text>

      <circle v-if="selectedZone === 9" cx="400" cy="325" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 9" x="400" y="330" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">9</text>

      <circle v-if="selectedZone === 10" cx="650" cy="280" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 10" x="650" y="285" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">10</text>

      <circle v-if="selectedZone === 12" cx="660" cy="200" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 12" x="660" y="205" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">12</text>

      <circle v-if="selectedZone === 13" cx="400" cy="200" r="18" fill="rgba(0,0,0,0.7)"/>
      <text v-if="selectedZone === 13" x="400" y="205" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">13</text>
    </g>
  </svg>
</template>

<style scoped>
.car-diagram {
  width: 100%;
  max-width: 800px;
  height: auto;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.zone-path {
  transition: all 0.2s ease;
}

.zone-path:hover {
  opacity: 0.85;
  filter: brightness(1.1);
}

.wheels {
  pointer-events: none;
}
</style>
