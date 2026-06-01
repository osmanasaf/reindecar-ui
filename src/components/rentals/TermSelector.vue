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
  if (!discounts.value || !Array.isArray(discounts.value)) return undefined
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
  <div class="term-selector rcr-term-selector" :class="{ disabled, loading }">
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

