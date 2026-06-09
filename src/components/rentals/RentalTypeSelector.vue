<script setup lang="ts">
import { computed } from 'vue'
import { RcIcon } from '@/components/icons'
import { RentalType } from '@/types'

interface Props {
  modelValue: RentalType
  disabled?: boolean
  showAdvantages?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showAdvantages: true,
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
  { value: RentalType.DAILY, label: 'Günlük', icon: '📅', description: '1–6 gün', minDays: 1, maxDays: 6 },
  { value: RentalType.WEEKLY, label: 'Haftalık', icon: '📆', description: '7–29 gün', advantage: 'Haftalık fiyat avantajı', minDays: 7, maxDays: 29 },
  { value: RentalType.MONTHLY, label: 'Aylık', icon: '🗓️', description: '1–11 ay', advantage: 'Aylık fiyat avantajı', minDays: 30, maxDays: 364 },
  { value: RentalType.LEASING, label: 'Leasing', icon: '📋', description: '12+ ay', advantage: 'Kurumsal uzun dönem', minDays: 365 },
  { value: RentalType.SERVICE, label: 'Servis', icon: '🚌', description: 'Minibüs / shuttle', advantage: 'Personel taşıma servisi', minDays: 30 },
]

const selectedType = computed(() => rentalTypes.find((t) => t.value === props.modelValue))

function selectType(type: RentalType) {
  if (props.disabled) return
  emit('update:modelValue', type)
}

function isSelected(type: RentalType): boolean {
  return props.modelValue === type
}
</script>

<template>
  <div class="rcr-type-selector" :class="{ 'rcr-type-selector--disabled': disabled }">
    <div class="rcr-type-grid">
      <button
        v-for="type in rentalTypes"
        :key="type.value"
        type="button"
        class="rcr-type-card"
        :class="{ 'rcr-type-card--selected': isSelected(type.value) }"
        :disabled="disabled"
        @click="selectType(type.value)"
      >
        <span class="rcr-type-card__icon">{{ type.icon }}</span>
        <span class="rcr-type-card__label">{{ type.label }}</span>
        <span class="rcr-type-card__desc">{{ type.description }}</span>
        <span v-if="showAdvantages && type.advantage" class="rcr-type-card__adv">{{ type.advantage }}</span>
        <RcIcon v-if="isSelected(type.value)" name="check" :size="16" class="rcr-type-card__check" />
      </button>
    </div>

    <div v-if="selectedType" class="rc-alert rc-alert--info">
      <RcIcon name="info" :size="16" />
      <span>
        <strong>{{ selectedType.label }}</strong> seçildi.
        <template v-if="selectedType.minDays && selectedType.maxDays">
          {{ selectedType.minDays }}–{{ selectedType.maxDays }} gün arası kiralama yapabilirsiniz.
        </template>
        <template v-else-if="selectedType.minDays">
          Minimum {{ selectedType.minDays }} gün kiralama yapabilirsiniz.
        </template>
      </span>
    </div>
  </div>
</template>
