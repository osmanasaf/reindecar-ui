<script setup lang="ts">
interface ZoneConfig {
  color: string
  onClick?: () => void
  opacity?: number
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
    fill: zone?.color || '#e8eaed',
    stroke: isSelected ? 'var(--color-primary, #2563eb)' : 'rgba(0,0,0,0.18)',
    strokeWidth: isSelected ? '2' : '1',
    cursor: zone?.onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    opacity: zone?.opacity ?? 1,
    filter: isSelected ? 'url(#selectedGlow)' : 'none'
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
  <!--
    Araç üstten görünüm (top-down) SVG haritası
    viewBox: 0 0 240 480
    Zone düzeni (yukarıdan aşağıya):
      Ön (üst): Zone 3 (Kaput+Ön Tampon), Zone 1 (Sağ Ön), Zone 4 (Sol Ön), Zone 2 (Ön Cam)
      Orta:     Zone 12 (Sağ Kapılar), Zone 13 (Tavan/İç), Zone 6 (Sol Kapılar)
      Arka:     Zone 10 (Sağ Arka), Zone 8 (Bagaj), Zone 7 (Arka Tampon+Sol Arka), Zone 9 (Arka Cam)
  -->
  <svg
    viewBox="0 0 240 430"
    xmlns="http://www.w3.org/2000/svg"
    class="car-diagram"
    aria-label="Araç bölge haritası"
  >
    <defs>
      <filter id="selectedGlow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="var(--color-primary, #2563eb)" flood-opacity="0.6" />
      </filter>
      <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.12" />
      </filter>
      <clipPath id="bodyClip">
        <path d="M 52 58 C 52 40 70 28 120 24 C 170 28 188 40 188 58 L 196 140 L 196 340 L 188 422 C 188 440 170 452 120 456 C 70 452 52 440 52 422 L 44 340 L 44 140 Z" />
      </clipPath>
    </defs>

    <!-- ===== ZONE PATH'LERİ ===== -->

    <!-- Zone 4: Sol Ön Çamurluk & Tekerlek -->
    <path
      :style="getZoneStyle(4)"
      d="M 52 58 C 52 40 70 28 120 24 L 120 90 L 68 90 L 52 100 Z"
      @click="handleZoneClick(4)"
      class="zone-path"
    />

    <!-- Zone 3: Kaput & Ön Tampon -->
    <path
      :style="getZoneStyle(3)"
      d="M 68 90 L 120 90 L 172 90 L 188 100 L 188 140 L 52 140 L 52 100 Z"
      @click="handleZoneClick(3)"
      class="zone-path"
    />

    <!-- Zone 1: Sağ Ön Çamurluk & Tekerlek -->
    <path
      :style="getZoneStyle(1)"
      d="M 120 24 C 170 28 188 40 188 58 L 188 100 L 172 90 L 120 90 Z"
      @click="handleZoneClick(1)"
      class="zone-path"
    />

    <!-- Zone 2: Ön Cam -->
    <path
      :style="getZoneStyle(2)"
      d="M 52 140 L 188 140 L 188 185 L 52 185 Z"
      @click="handleZoneClick(2)"
      class="zone-path"
    />

    <!-- Zone 6: Sol Kapılar & Ayna -->
    <path
      :style="getZoneStyle(6)"
      d="M 44 140 L 52 140 L 52 340 L 44 340 Z"
      @click="handleZoneClick(6)"
      class="zone-path"
    />

    <!-- Zone 13: Tavan & İç Mekan -->
    <path
      :style="getZoneStyle(13)"
      d="M 52 185 L 188 185 L 188 295 L 52 295 Z"
      @click="handleZoneClick(13)"
      class="zone-path"
    />

    <!-- Zone 12: Sağ Kapılar & Ayna -->
    <path
      :style="getZoneStyle(12)"
      d="M 188 140 L 196 140 L 196 340 L 188 340 Z"
      @click="handleZoneClick(12)"
      class="zone-path"
    />

    <!-- Zone 9: Arka Cam -->
    <path
      :style="getZoneStyle(9)"
      d="M 52 295 L 188 295 L 188 340 L 52 340 Z"
      @click="handleZoneClick(9)"
      class="zone-path"
    />

    <!-- Zone 7: Sol Arka Çamurluk & Arka Tampon Sol -->
    <path
      :style="getZoneStyle(7)"
      d="M 44 340 L 88 340 L 88 406 C 74 410 60 406 52 396 L 44 378 Z"
      @click="handleZoneClick(7)"
      class="zone-path"
    />

    <!-- Zone 8: Bagaj (arka merkez) -->
    <path
      :style="getZoneStyle(8)"
      d="M 88 340 L 152 340 L 152 406 C 144 412 136 414 120 414 C 104 414 96 412 88 406 Z"
      @click="handleZoneClick(8)"
      class="zone-path"
    />

    <!-- Zone 10: Sağ Arka Çamurluk & Arka Tampon Sağ -->
    <path
      :style="getZoneStyle(10)"
      d="M 152 340 L 196 340 L 196 378 L 188 396 C 180 406 166 410 152 406 Z"
      @click="handleZoneClick(10)"
      class="zone-path"
    />

    <!-- ===== DIŞ ÇERÇEVE (outline) ===== -->
    <path
      d="M 120 24 C 170 28 188 40 188 58 L 196 140 L 196 340 L 196 378 L 188 396 C 180 406 166 410 152 406 C 144 412 136 414 120 414 C 104 414 96 412 88 406 C 74 410 60 406 52 396 L 44 378 L 44 340 L 44 140 L 52 58 C 52 40 70 28 120 24 Z"
      fill="none"
      stroke="#1a1a2e"
      stroke-width="2.5"
      stroke-linejoin="round"
      class="car-outline"
    />

    <!-- Ön cam çerçevesi -->
    <rect x="60" y="143" width="120" height="39" rx="3"
      fill="none" stroke="#1a1a2e" stroke-width="1.5" class="car-outline" />

    <!-- Arka cam çerçevesi -->
    <rect x="60" y="298" width="120" height="39" rx="3"
      fill="none" stroke="#1a1a2e" stroke-width="1.5" class="car-outline" />

    <!-- Zone 7/8/10 ayırıcı dikey çizgiler -->
    <line x1="88" y1="340" x2="88" y2="406"
      stroke="rgba(0,0,0,0.18)" stroke-width="1" class="car-outline" />
    <line x1="152" y1="340" x2="152" y2="406"
      stroke="rgba(0,0,0,0.18)" stroke-width="1" class="car-outline" />

    <!-- Orta çizgi (araç ekseni) -->
    <line x1="120" y1="28" x2="120" y2="410"
      stroke="rgba(0,0,0,0.08)" stroke-width="1" stroke-dasharray="6,4" class="car-outline" />

    <!-- ===== TEKERLEKLER ===== -->
    <g class="wheels">
      <!-- Sol Ön -->
      <rect x="26" y="96" width="20" height="38" rx="5" fill="#2d3748" stroke="#1a202c" stroke-width="1.5" />
      <rect x="29" y="102" width="14" height="26" rx="3" fill="#4a5568" />
      <!-- Sağ Ön -->
      <rect x="194" y="96" width="20" height="38" rx="5" fill="#2d3748" stroke="#1a202c" stroke-width="1.5" />
      <rect x="197" y="102" width="14" height="26" rx="3" fill="#4a5568" />
      <!-- Sol Arka -->
      <rect x="26" y="348" width="20" height="38" rx="5" fill="#2d3748" stroke="#1a202c" stroke-width="1.5" />
      <rect x="29" y="354" width="14" height="26" rx="3" fill="#4a5568" />
      <!-- Sağ Arka -->
      <rect x="194" y="348" width="20" height="38" rx="5" fill="#2d3748" stroke="#1a202c" stroke-width="1.5" />
      <rect x="197" y="354" width="14" height="26" rx="3" fill="#4a5568" />
    </g>

    <!-- ===== AYNALAR ===== -->
    <g class="mirrors">
      <path d="M 44 158 C 36 158 32 163 32 170 C 32 177 36 182 44 182 Z"
        fill="#718096" stroke="#4a5568" stroke-width="1" />
      <path d="M 196 158 C 204 158 208 163 208 170 C 208 177 204 182 196 182 Z"
        fill="#718096" stroke="#4a5568" stroke-width="1" />
    </g>

    <!-- ===== ZONE ETİKETLERİ (her zaman görünür, küçük) ===== -->
    <g class="zone-labels-always">
      <text x="100" y="68" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">4</text>
      <text x="140" y="68" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">1</text>
      <text x="120" y="122" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">3</text>
      <text x="120" y="166" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">2</text>
      <text x="48" y="245" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">6</text>
      <text x="120" y="244" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">13</text>
      <text x="192" y="245" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">12</text>
      <text x="120" y="320" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">9</text>
      <text x="66" y="376" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">7</text>
      <text x="120" y="380" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">8</text>
      <text x="174" y="376" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.4)" font-weight="600" class="zone-label-text">10</text>
    </g>

    <!-- ===== SEÇİLİ ZONE ETİKETİ (büyük, vurgulu) ===== -->
    <g class="zone-label-selected" v-if="selectedZone">
      <g v-if="selectedZone === 4">
        <circle cx="100" cy="62" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="100" y="67" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">4</text>
      </g>
      <g v-if="selectedZone === 1">
        <circle cx="140" cy="62" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="140" y="67" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">1</text>
      </g>
      <g v-if="selectedZone === 3">
        <circle cx="120" cy="116" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="120" y="121" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">3</text>
      </g>
      <g v-if="selectedZone === 2">
        <circle cx="120" cy="162" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="120" y="167" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">2</text>
      </g>
      <g v-if="selectedZone === 6">
        <circle cx="48" cy="240" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="48" y="245" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">6</text>
      </g>
      <g v-if="selectedZone === 13">
        <circle cx="120" cy="240" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="120" y="245" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">13</text>
      </g>
      <g v-if="selectedZone === 12">
        <circle cx="192" cy="240" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="192" y="245" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">12</text>
      </g>
      <g v-if="selectedZone === 9">
        <circle cx="120" cy="316" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="120" y="321" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">9</text>
      </g>
      <g v-if="selectedZone === 7">
        <circle cx="66" cy="371" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="66" y="376" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">7</text>
      </g>
      <g v-if="selectedZone === 8">
        <circle cx="120" cy="375" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="120" y="380" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">8</text>
      </g>
      <g v-if="selectedZone === 10">
        <circle cx="174" cy="371" r="11" fill="var(--color-primary, #2563eb)" />
        <text x="174" y="376" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">10</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.car-diagram {
  width: 100%;
  max-width: 220px;
  height: auto;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
}

.zone-path {
  transition: all 0.2s ease;
}

.zone-path:hover {
  filter: brightness(0.9);
  stroke-width: 2 !important;
}

.car-outline,
.wheels,
.mirrors,
.zone-labels-always,
.zone-label-selected {
  pointer-events: none;
}

.zone-label-text {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
}

.zone-label-selected text {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
}
</style>
