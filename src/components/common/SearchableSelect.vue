<script setup lang="ts" generic="T extends string | number">
import { ref, computed, watch } from 'vue'

interface Option {
  value: T
  label: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: T | null
  options: Option[]
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  clearable?: boolean
  createable?: boolean
  loading?: boolean
}>(), {
  placeholder: 'Seçiniz',
  searchPlaceholder: 'Ara...',
  disabled: false,
  clearable: false,
  createable: false,
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: T | null]
  'create': [value: string]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const customValue = ref('')
const showCreateInput = ref(false)

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

const filteredOptions = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return props.options
  
  return props.options.filter(opt => 
    opt.label.toLowerCase().includes(query)
  )
})

const hasResults = computed(() => filteredOptions.value.length > 0)

function selectOption(option: Option) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  closeDropdown()
}

function clearSelection() {
  emit('update:modelValue', null)
  searchQuery.value = ''
}

function openDropdown() {
  if (props.disabled) return
  isOpen.value = true
  searchQuery.value = ''
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
  showCreateInput.value = false
  customValue.value = ''
}

function handleCreateNew() {
  if (!customValue.value.trim()) return
  emit('create', customValue.value.trim())
  customValue.value = ''
  showCreateInput.value = false
  closeDropdown()
}

function toggleCreateInput() {
  showCreateInput.value = !showCreateInput.value
  if (showCreateInput.value) {
    customValue.value = searchQuery.value
  }
}

watch(() => props.modelValue, () => {
  searchQuery.value = ''
})
</script>

<template>
  <div class="searchable-select" :class="{ disabled, open: isOpen }">
    <div class="select-trigger" @click="openDropdown">
      <span v-if="selectedOption" class="selected-value">
        {{ selectedOption.label }}
      </span>
      <span v-else class="placeholder">
        {{ placeholder }}
      </span>
      <div class="select-actions">
        <button
          v-if="clearable && modelValue !== null"
          type="button"
          class="clear-btn"
          @click.stop="clearSelection"
        >
          ✕
        </button>
        <span class="dropdown-icon">▼</span>
      </div>
    </div>

    <div v-if="isOpen" class="dropdown-panel">
      <div class="search-box">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="search-input"
          @keydown.esc="closeDropdown"
        />
      </div>

      <div v-if="loading" class="loading-state">
        Yükleniyor...
      </div>

      <div v-else-if="!hasResults && !createable" class="empty-state">
        Sonuç bulunamadı
      </div>

      <div v-else class="options-list">
        <div
          v-for="option in filteredOptions"
          :key="option.value"
          :class="['option-item', { 
            selected: option.value === modelValue,
            disabled: option.disabled 
          }]"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </div>

        <div v-if="createable && !hasResults && searchQuery" class="create-section">
          <div v-if="!showCreateInput" class="create-prompt">
            <p>Sonuç bulunamadı</p>
            <button type="button" class="btn-create" @click="toggleCreateInput">
              + "{{ searchQuery }}" ekle
            </button>
          </div>
          <div v-else class="create-input-box">
            <input
              v-model="customValue"
              type="text"
              placeholder="Yeni değer"
              class="create-input"
              @keydown.enter="handleCreateNew"
            />
            <button type="button" class="btn-save" @click="handleCreateNew">
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isOpen" class="dropdown-overlay" @click="closeDropdown"></div>
  </div>
</template>

<style scoped>
.searchable-select {
  position: relative;
  width: 100%;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s;
  min-height: 42px;
}

.select-trigger:hover {
  border-color: var(--color-primary);
}

.searchable-select.open .select-trigger {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.searchable-select.disabled .select-trigger {
  background: var(--color-bg-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.selected-value {
  font-size: 14px;
  color: var(--color-text);
}

.placeholder {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.select-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  transition: color 0.2s;
}

.clear-btn:hover {
  color: var(--color-danger);
}

.dropdown-icon {
  font-size: 10px;
  color: var(--color-text-secondary);
  transition: transform 0.2s;
}

.searchable-select.open .dropdown-icon {
  transform: rotate(180deg);
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 998;
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 999;
  max-height: 300px;
  display: flex;
  flex-direction: column;
}

.search-box {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--color-bg-secondary);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.loading-state,
.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.options-list {
  overflow-y: auto;
  max-height: 240px;
}

.option-item {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s;
}

.option-item:hover {
  background: var(--color-bg-secondary);
}

.option-item.selected {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

.option-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-section {
  border-top: 1px solid var(--color-border);
  padding: 12px;
}

.create-prompt {
  text-align: center;
}

.create-prompt p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.btn-create {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-create:hover {
  background: var(--color-primary-hover);
}

.create-input-box {
  display: flex;
  gap: 8px;
}

.create-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
}

.create-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-save {
  background: var(--color-success);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-save:hover {
  background: var(--color-success-hover);
}
</style>
