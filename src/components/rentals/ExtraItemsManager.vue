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
  
  return iconMap[code] || iconMap['default']
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
  <div class="extra-items-manager">
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

<style scoped>
.extra-items-manager {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.manager-header h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.add-btn {
  padding: 8px 16px;
  border: 1px dashed var(--color-primary);
  border-radius: 8px;
  background: transparent;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  background: var(--color-primary-light);
}

.loading-state,
.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0 0 12px 0;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
}

.items-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  transition: all 0.2s;
}

.item-card:hover {
  background: var(--color-bg-tertiary);
}

.item-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 2px;
}

.item-calculation {
  font-size: 12px;
  color: var(--color-text-muted);
}

.item-amount {
  text-align: right;
}

.item-amount .amount {
  display: block;
  font-weight: 600;
  color: var(--color-text);
}

.item-amount .total {
  display: block;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.item-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  padding: 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
}

.action-btn:hover {
  opacity: 1;
}

.action-btn.edit:hover {
  background: var(--color-info-light);
}

.action-btn.delete:hover {
  background: var(--color-danger-light);
}

.total-section {
  padding: 16px 20px;
  background: var(--color-primary-light);
  border-top: 1px solid var(--color-border);
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-weight: 500;
  color: var(--color-text);
}

.total-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.total-note {
  display: block;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
