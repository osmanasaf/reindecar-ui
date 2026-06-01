<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { extraItemTypeApi } from '@/api'
import type { ExtraItemType, RentalExtraItem, CalculationType } from '@/types'
import ExtraItemForm from './ExtraItemForm.vue'

interface Props {
  modelValue?: RentalExtraItem[]
  termMonths?: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  termMonths: 1,
  readonly: false
})

const emit = defineEmits<{
  'update:modelValue': [items: RentalExtraItem[]]
  'total-changed': [total: number]
}>()

const itemTypes = ref<ExtraItemType[]>([])
const showForm = ref(false)
const editingItem = ref<RentalExtraItem | null>(null)
const loading = ref(false)

const items = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val)
})

const totalAmount = computed(() => {
  return items.value.reduce((sum, item) => {
    return sum + calculateItemTotal(item)
  }, 0)
})

function calculateItemTotal(item: RentalExtraItem): number {
  switch (item.calculationType) {
    case 'FIXED':
      return item.amount
    case 'PER_MONTH':
      return item.amount * props.termMonths
    case 'PERCENTAGE':
      return item.amount
    default:
      return item.amount
  }
}

function getCalculationLabel(type: CalculationType): string {
  switch (type) {
    case 'FIXED': return 'Sabit tutar'
    case 'PER_MONTH': return 'Aylık bazlı'
    case 'PERCENTAGE': return 'Yüzdelik'
    default: return ''
  }
}

function getItemIcon(item: RentalExtraItem): string {
  const type = itemTypes.value?.find(t => t.id === item.itemTypeId)
  const code = type?.code || item.name?.toLowerCase() || 'default'
  
  const iconMap: Record<string, string> = {
    'insurance': '🛡️',
    'kasko': '🛡️',
    'maintenance': '🔧',
    'bakim': '🔧',
    'tax': '📄',
    'mtv': '📄',
    'service': '⚙️',
    'cleaning': '🧹',
    'default': '📦'
  }
  
  return iconMap[code] ?? iconMap.default ?? '📦'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { 
    style: 'currency', 
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatAmount(item: RentalExtraItem): string {
  const formatted = formatCurrency(item.amount)
  if (item.calculationType === 'PER_MONTH') {
    return `${formatted}/ay`
  }
  if (item.calculationType === 'PERCENTAGE') {
    return `%${item.amount}`
  }
  return formatted
}

function openAddForm() {
  editingItem.value = null
  showForm.value = true
}

function openEditForm(item: RentalExtraItem) {
  editingItem.value = item
  showForm.value = true
}

function handleFormSubmit(item: RentalExtraItem) {
  if (editingItem.value) {
    const index = items.value.findIndex(i => i.id === editingItem.value!.id)
    if (index > -1) {
      const newItems = [...items.value]
      newItems[index] = item
      items.value = newItems
    }
  } else {
    const newItem = {
      ...item,
      id: Date.now()
    }
    items.value = [...items.value, newItem]
  }
  showForm.value = false
  editingItem.value = null
}

function removeItem(itemId: number) {
  items.value = items.value.filter(i => i.id !== itemId)
}

async function fetchItemTypes() {
  loading.value = true
  try {
    itemTypes.value = await extraItemTypeApi.getAll()
  } catch {
    itemTypes.value = []
  } finally {
    loading.value = false
  }
}

watch(totalAmount, (val) => {
  emit('total-changed', val)
}, { immediate: true })

onMounted(() => {
  fetchItemTypes()
})
</script>

<template>
  <div class="extra-items-manager rcr-extra-items">
    <div class="manager-header">
      <h4>Ek Kalemler</h4>
      <button 
        v-if="!readonly"
        class="add-btn"
        @click="openAddForm"
      >
        + Ekle
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="items.length === 0" class="empty-state">
      <span class="empty-icon">📦</span>
      <p>Henüz ek kalem eklenmedi</p>
      <button 
        v-if="!readonly"
        class="btn-link"
        @click="openAddForm"
      >
        İlk kalemi ekle
      </button>
    </div>

    <div v-else class="items-list">
      <div 
        v-for="item in items" 
        :key="item.id"
        class="item-card"
      >
        <span class="item-icon">{{ getItemIcon(item) }}</span>
        
        <div class="item-info">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-calculation">{{ getCalculationLabel(item.calculationType) }}</span>
        </div>
        
        <div class="item-amount">
          <span class="amount">{{ formatAmount(item) }}</span>
          <span v-if="item.calculationType === 'PER_MONTH'" class="total">
            Toplam: {{ formatCurrency(calculateItemTotal(item)) }}
          </span>
        </div>
        
        <div v-if="!readonly" class="item-actions">
          <button class="action-btn edit" @click="openEditForm(item)" title="Düzenle">
            ✏️
          </button>
          <button class="action-btn delete" @click="removeItem(item.id)" title="Sil">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <div v-if="items.length > 0" class="total-section">
      <div class="total-row">
        <span class="total-label">Ek Kalemler Toplamı</span>
        <span class="total-value">{{ formatCurrency(totalAmount) }}</span>
      </div>
      <span v-if="termMonths > 1" class="total-note">
        ({{ termMonths }} ay için hesaplanmış)
      </span>
    </div>

    <ExtraItemForm
      :visible="showForm"
      :item="editingItem"
      :item-types="itemTypes || []"
      @close="showForm = false"
      @submit="handleFormSubmit"
    />
  </div>
</template>

