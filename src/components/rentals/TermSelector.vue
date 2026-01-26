<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { termDiscountApi } from '@/api'
import type { TermDiscount } from '@/types'

interface Props {
  modelValue: number
  categoryId?: number
  monthlyPrice?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 12,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'discount-calculated': [amount: number]
}>()

const loading = ref(false)
const discounts = ref<TermDiscount[]>([])

const termOptions = [
  { months: 12, label: '12 Ay', badge: null },
  { months: 24, label: '24 Ay', badge: null },
  { months: 36, label: '36 Ay', badge: 'En Popüler' },
  { months: 48, label: '48 Ay', badge: 'En Avantajlı' }
]

const selectedTerm = computed(() => props.modelValue)

const selectedDiscount = computed(() => 
  discounts.value.find(d => d.termMonths === props.modelValue)
)

const calculatedSavings = computed(() => {
  if (!props.monthlyPrice || !selectedDiscount.value) return 0
  
  const discount = selectedDiscount.value
  const baseTotal = props.monthlyPrice * props.modelValue
  
  if (discount.discountType === 'PERCENTAGE') {
    return baseTotal * (discount.discountValue / 100)
  }
  return discount.discountValue
})

function selectTerm(months: number) {
  if (props.disabled) return
  emit('update:modelValue', months)
}

function getDiscountForTerm(months: number): TermDiscount | undefined {
  return discounts.value.find(d => d.termMonths === months)
}

function formatDiscount(discount: TermDiscount): string {
  if (discount.discountType === 'PERCENTAGE') {
    return `%${discount.discountValue} indirim`
  }
  return new Intl.NumberFormat('tr-TR', { 
    style: 'currency', 
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(discount.discountValue) + ' indirim'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { 
    style: 'currency', 
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(amount)
}

async function fetchDiscounts() {
  loading.value = true
  try {
    if (props.categoryId) {
      discounts.value = await termDiscountApi.getByCategory(props.categoryId)
    } else {
      discounts.value = await termDiscountApi.getAll()
    }
  } catch {
    discounts.value = []
  } finally {
    loading.value = false
  }
}

watch(calculatedSavings, (val) => {
  emit('discount-calculated', val)
})

watch(() => props.categoryId, () => {
  fetchDiscounts()
})

onMounted(() => {
  fetchDiscounts()
})
</script>

<template>
  <div class="term-selector" :class="{ disabled, loading }">
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>

    <div class="term-grid">
      <button 
        v-for="term in termOptions" 
        :key="term.months"
        :class="[
          'term-card', 
          { 
            selected: selectedTerm === term.months,
            'has-discount': getDiscountForTerm(term.months)
          }
        ]"
        :disabled="disabled"
        @click="selectTerm(term.months)"
      >
        <span v-if="term.badge" class="term-badge">{{ term.badge }}</span>
        
        <span class="term-months">{{ term.label }}</span>
        
        <span v-if="selectedTerm === term.months" class="check-icon">✓</span>
        
        <span 
          v-if="getDiscountForTerm(term.months)" 
          class="term-discount"
        >
          {{ formatDiscount(getDiscountForTerm(term.months)!) }}
        </span>
      </button>
    </div>

    <div v-if="selectedDiscount && props.monthlyPrice" class="savings-info">
      <span class="savings-icon">💡</span>
      <div class="savings-text">
        <strong>{{ selectedTerm }} aylık vade</strong> ile 
        <strong class="highlight">{{ formatDiscount(selectedDiscount) }}</strong> kazanırsınız.
        <br>
        <span class="savings-amount">
          Tahmini tasarruf: <strong>{{ formatCurrency(calculatedSavings) }}</strong>
        </span>
      </div>
    </div>

    <div v-else-if="!selectedDiscount && !loading" class="no-discount-info">
      <span class="info-icon">ℹ️</span>
      <span>Bu vade için tanımlı indirim bulunmuyor.</span>
    </div>
  </div>
</template>

<style scoped>
.term-selector {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.term-selector.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.term-selector.loading {
  min-height: 120px;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  z-index: 10;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.term-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.term-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px 20px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
}

.term-card:hover:not(:disabled) {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.term-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.term-card.has-discount {
  border-color: var(--color-success-light);
}

.term-card.selected.has-discount {
  border-color: var(--color-primary);
}

.term-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: white;
  background: var(--color-warning);
  padding: 3px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

.term-months {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
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

.term-discount {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-success);
  background: var(--color-success-light);
  padding: 4px 12px;
  border-radius: 12px;
}

.savings-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, var(--color-success-light), var(--color-primary-light));
  border-radius: 12px;
  border: 1px solid var(--color-success);
}

.savings-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.savings-text {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.6;
}

.savings-text .highlight {
  color: var(--color-success);
}

.savings-amount {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.savings-amount strong {
  color: var(--color-success);
  font-size: 16px;
}

.no-discount-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.info-icon {
  font-size: 16px;
}

@media (max-width: 768px) {
  .term-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .term-grid {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  
  .term-card {
    padding: 16px 12px;
  }
  
  .term-months {
    font-size: 16px;
  }
  
  .term-badge {
    font-size: 9px;
    padding: 2px 8px;
  }
}
</style>
