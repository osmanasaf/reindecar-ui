<script setup lang="ts">
import { computed } from 'vue'
import type { RentalType } from '@/types'

interface Props {
  modelValue: RentalType
  disabled?: boolean
  showAdvantages?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showAdvantages: true
})

const emit = defineEmits<{
  'update:modelValue': [value: RentalType]
}>()

interface RentalTypeOption {
  value: RentalType
  label: string
  icon: string
  description: string
  advantage?: string
  minDays?: number
  maxDays?: number
}

const rentalTypes: RentalTypeOption[] = [
  { 
    value: 'DAILY', 
    label: 'Günlük', 
    icon: '📅',
    description: '1-6 gün',
    minDays: 1,
    maxDays: 6
  },
  { 
    value: 'WEEKLY', 
    label: 'Haftalık', 
    icon: '📆',
    description: '7-29 gün',
    advantage: 'Haftalık fiyat avantajı',
    minDays: 7,
    maxDays: 29
  },
  { 
    value: 'MONTHLY', 
    label: 'Aylık', 
    icon: '🗓️',
    description: '1-11 ay',
    advantage: 'Aylık fiyat avantajı',
    minDays: 30,
    maxDays: 364
  },
  { 
    value: 'LEASING', 
    label: 'Leasing', 
    icon: '📋',
    description: '12+ ay',
    advantage: 'Özel kurumsal fiyat',
    minDays: 365
  }
]

const selectedType = computed(() => 
  rentalTypes.find(t => t.value === props.modelValue)
)

function selectType(type: RentalType) {
  if (props.disabled) return
  emit('update:modelValue', type)
}

function isSelected(type: RentalType): boolean {
  return props.modelValue === type
}
</script>

<template>
  <div class="rental-type-selector" :class="{ disabled }">
    <div class="type-grid">
      <button 
        v-for="type in rentalTypes" 
        :key="type.value"
        :class="['type-card', { selected: isSelected(type.value) }]"
        :disabled="disabled"
        @click="selectType(type.value)"
      >
        <span class="type-icon">{{ type.icon }}</span>
        <span class="type-label">{{ type.label }}</span>
        <span class="type-description">{{ type.description }}</span>
        <span v-if="showAdvantages && type.advantage" class="type-advantage">
          {{ type.advantage }}
        </span>
        <span v-if="isSelected(type.value)" class="check-mark">✓</span>
      </button>
    </div>
    
    <div v-if="selectedType" class="selected-info">
      <span class="info-icon">ℹ️</span>
      <span class="info-text">
        <strong>{{ selectedType.label }} Kiralama</strong> seçildi.
        <template v-if="selectedType.minDays && selectedType.maxDays">
          {{ selectedType.minDays }} - {{ selectedType.maxDays }} gün arası kiralama yapabilirsiniz.
        </template>
        <template v-else-if="selectedType.minDays">
          Minimum {{ selectedType.minDays }} gün kiralama yapabilirsiniz.
        </template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.rental-type-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rental-type-selector.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.type-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.type-card:hover:not(:disabled) {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.type-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.type-card:disabled {
  cursor: not-allowed;
}

.type-icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.type-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.type-description {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.type-advantage {
  font-size: 11px;
  color: var(--color-success);
  background: var(--color-success-light);
  padding: 4px 10px;
  border-radius: 12px;
  margin-top: 4px;
}

.check-mark {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.selected-info {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: var(--color-info-light);
  border-radius: 10px;
}

.info-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.info-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.info-text strong {
  color: var(--color-text);
}

@media (max-width: 768px) {
  .type-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .type-grid {
    grid-template-columns: 1fr;
  }
  
  .type-card {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
    gap: 16px;
  }
  
  .type-icon {
    font-size: 24px;
    margin-bottom: 0;
  }
  
  .check-mark {
    top: 50%;
    transform: translateY(-50%);
  }
}
</style>
