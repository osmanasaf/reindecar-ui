<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ExtraItemType, RentalExtraItem, CalculationType } from '@/types'

interface Props {
  visible: boolean
  item: RentalExtraItem | null
  itemTypes?: ExtraItemType[]
}

const props = withDefaults(defineProps<Props>(), {
  itemTypes: () => []
})

const emit = defineEmits<{
  close: []
  submit: [item: RentalExtraItem]
}>()

const selectedTypeId = ref<number | null>(null)
const customName = ref('')
const description = ref('')
const amount = ref<number | null>(null)
const calculationType = ref<CalculationType>('FIXED')

const isEditing = computed(() => !!props.item)

const calculationTypes: { value: CalculationType; label: string }[] = [
  { value: 'FIXED', label: 'Sabit Tutar' },
  { value: 'PER_MONTH', label: 'Aylık Bazlı' },
  { value: 'PERCENTAGE', label: 'Yüzdelik' }
]

function resetForm() {
  selectedTypeId.value = null
  customName.value = ''
  description.value = ''
  amount.value = null
  calculationType.value = 'FIXED'
}

function populateForm() {
  if (props.item) {
    selectedTypeId.value = props.item.itemTypeId
    customName.value = props.item.name
    description.value = props.item.description || ''
    amount.value = props.item.amount
    calculationType.value = props.item.calculationType
  } else {
    resetForm()
  }
}

function handleTypeSelect(typeId: number) {
  selectedTypeId.value = typeId
  const type = props.itemTypes?.find(t => t.id === typeId)
  if (type) {
    customName.value = type.name
    calculationType.value = type.calculationType
    if (type.defaultAmount) {
      amount.value = type.defaultAmount
    }
  }
}

function handleSubmit() {
  if (!amount.value || amount.value <= 0) return
  if (!customName.value.trim()) return

  const item: RentalExtraItem = {
    id: props.item?.id || 0,
    rentalId: props.item?.rentalId || 0,
    itemTypeId: selectedTypeId.value,
    name: customName.value.trim(),
    description: description.value.trim() || null,
    amount: amount.value,
    currency: 'TRY',
    calculationType: calculationType.value,
    calculatedTotal: null,
    createdAt: props.item?.createdAt || new Date().toISOString()
  }

  emit('submit', item)
  resetForm()
}

function handleClose() {
  resetForm()
  emit('close')
}

watch(() => props.visible, (val) => {
  if (val) populateForm()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="extra-item-modal-overlay" @click.self="handleClose">
      <div class="extra-item-modal-content">
        <div class="extra-item-modal-header">
          <h3>{{ isEditing ? 'Kalemi Düzenle' : 'Ek Kalem Ekle' }}</h3>
          <button type="button" class="extra-item-close-btn" @click="handleClose">×</button>
        </div>

        <div class="extra-item-modal-body">
          <div v-if="itemTypes && itemTypes.length > 0 && !isEditing" class="extra-item-form-group">
            <label for="item-type-chips">Kalem Türü</label>
            <div id="item-type-chips" class="extra-item-type-chips">
              <button
                v-for="type in itemTypes"
                :key="type.id"
                type="button"
                :class="['extra-item-type-chip', { selected: selectedTypeId === type.id }]"
                @click="handleTypeSelect(type.id)"
              >
                {{ type.name }}
              </button>
              <button
                type="button"
                :class="['extra-item-type-chip custom', { selected: selectedTypeId === null && customName }]"
                @click="selectedTypeId = null"
              >
                Özel
              </button>
            </div>
          </div>

          <div class="extra-item-form-group">
            <label for="item-name-input">Kalem Adı</label>
            <input 
              id="item-name-input"
              v-model="customName"
              type="text"
              placeholder="Örn: Bakım Paketi"
              :disabled="!!selectedTypeId"
            />
          </div>

          <div class="extra-item-form-group">
            <label for="item-description-input">Açıklama (Opsiyonel)</label>
            <input 
              id="item-description-input"
              v-model="description"
              type="text"
              placeholder="Kısa açıklama..."
            />
          </div>

          <div class="extra-item-form-group">
            <label for="item-amount-input">Tutar</label>
            <div class="extra-item-input-with-suffix">
              <input 
                id="item-amount-input"
                v-model.number="amount"
                type="number"
                min="0"
                step="100"
                placeholder="0"
              />
              <span class="suffix">{{ calculationType === 'PERCENTAGE' ? '%' : 'TL' }}</span>
            </div>
          </div>

          <div class="extra-item-form-group">
            <label for="calculation-type-group">Hesaplama Türü</label>
            <div id="calculation-type-group" class="extra-item-radio-group">
              <label 
                v-for="type in calculationTypes" 
                :key="type.value"
                class="extra-item-radio-item"
              >
                <input 
                  v-model="calculationType"
                  type="radio"
                  :value="type.value"
                />
                <span>{{ type.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="extra-item-modal-footer">
          <button type="button" class="extra-item-btn extra-item-btn-outline" @click="handleClose">İptal</button>
          <button 
            type="button"
            class="extra-item-btn extra-item-btn-primary"
            :disabled="!amount || !customName"
            @click="handleSubmit"
          >
            {{ isEditing ? 'Güncelle' : 'Ekle' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
.extra-item-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.extra-item-modal-content {
  background: var(--color-surface, #ffffff);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 16px;
}

.extra-item-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.extra-item-modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text, #1f2937);
}

.extra-item-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--color-bg-secondary, #f3f4f6);
  font-size: 20px;
  cursor: pointer;
  color: var(--color-text, #1f2937);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.extra-item-close-btn:hover {
  background: var(--color-bg-tertiary, #e5e7eb);
}

.extra-item-modal-body {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.extra-item-form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.extra-item-form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
}

.extra-item-form-group input[type="text"],
.extra-item-form-group input[type="number"] {
  padding: 12px 14px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary, #f3f4f6);
  color: var(--color-text, #1f2937);
  width: 100%;
  box-sizing: border-box;
}

.extra-item-form-group input[type="text"]:focus,
.extra-item-form-group input[type="number"]:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
  background: var(--color-surface, #ffffff);
}

.extra-item-form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.extra-item-type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.extra-item-type-chip {
  padding: 8px 14px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 20px;
  background: var(--color-surface, #ffffff);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text, #1f2937);
}

.extra-item-type-chip:hover {
  border-color: var(--color-primary, #3b82f6);
}

.extra-item-type-chip.selected {
  background: var(--color-primary, #3b82f6);
  color: white;
  border-color: var(--color-primary, #3b82f6);
}

.extra-item-type-chip.custom {
  border-style: dashed;
}

.extra-item-input-with-suffix {
  position: relative;
}

.extra-item-input-with-suffix input {
  width: 100%;
  padding-right: 40px;
  box-sizing: border-box;
}

.extra-item-input-with-suffix .suffix {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary, #6b7280);
  font-size: 14px;
  pointer-events: none;
}

.extra-item-radio-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.extra-item-radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--color-text, #1f2937);
}

.extra-item-radio-item input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.extra-item-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.extra-item-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.extra-item-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.extra-item-btn-outline {
  background: transparent;
  border: 1px solid var(--color-border, #e5e7eb);
  color: var(--color-text, #1f2937);
}

.extra-item-btn-outline:hover:not(:disabled) {
  background: var(--color-bg-secondary, #f3f4f6);
}

.extra-item-btn-primary {
  background: var(--color-primary, #3b82f6);
  border: none;
  color: white;
}

.extra-item-btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover, #2563eb);
}
</style>
