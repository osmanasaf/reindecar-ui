<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceProviderResponse } from '@/types'
import { useEnumTranslations } from '@/composables'

interface Props {
  provider: ServiceProviderResponse
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: [id: number]
  edit: [id: number]
}>()

const { translateServiceType, translateProviderType } = useEnumTranslations()

const serviceTypesList = computed(() => {
  if (!props.provider.serviceTypes || props.provider.serviceTypes.length === 0) {
    return '-'
  }
  return props.provider.serviceTypes.map(t => translateServiceType(t)).join(', ')
})

const location = computed(() => {
  const parts = [props.provider.district, props.provider.city].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
})
</script>

<template>
  <div 
    class="provider-card" 
    :class="{ 'inactive': !provider.active }"
    @click="emit('click', provider.id)"
  >
    <div class="card-header">
      <div class="card-header-left">
        <h3 class="card-title">{{ provider.name }}</h3>
        <span class="card-code">{{ provider.code }}</span>
      </div>
      <div class="card-badges">
        <span :class="['status-badge', provider.active ? 'active' : 'inactive']">
          {{ provider.active ? 'Aktif' : 'Pasif' }}
        </span>
      </div>
    </div>

    <div class="type-row">
      <span class="type-badge">{{ translateProviderType(provider.type) }}</span>
    </div>

    <div class="card-body">
      <div v-if="location" class="info-row">
        <span class="label">Konum:</span>
        <span class="value">{{ location }}</span>
      </div>

      <div v-if="provider.phone" class="info-row">
        <span class="label">Telefon:</span>
        <span class="value">{{ provider.phone }}</span>
      </div>

      <div v-if="provider.email" class="info-row">
        <span class="label">E-posta:</span>
        <span class="value">{{ provider.email }}</span>
      </div>

      <div v-if="provider.contactPerson" class="info-row">
        <span class="label">İletişim:</span>
        <span class="value">{{ provider.contactPerson }}</span>
      </div>

      <div class="info-row services-row">
        <span class="label">Hizmetler:</span>
        <span class="value services">{{ serviceTypesList }}</span>
      </div>
    </div>

    <div class="card-footer">
      <button 
        class="btn btn-secondary" 
        @click.stop="emit('edit', provider.id)"
      >
        Düzenle
      </button>
      <button 
        class="btn btn-primary" 
        @click.stop="emit('click', provider.id)"
      >
        Detay
      </button>
    </div>
  </div>
</template>

<style scoped>
.provider-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary, #2563eb);
}

.provider-card.inactive {
  opacity: 0.7;
  background: #f9fafb;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.card-header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.card-code {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  font-family: monospace;
}

.card-badges {
  display: flex;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.active {
  background-color: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.status-badge.inactive {
  background-color: #f9fafb;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.type-row {
  margin-bottom: 1rem;
}

.type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  gap: 1rem;
}

.info-row .label {
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
  flex-shrink: 0;
}

.info-row .value {
  color: var(--color-text, #111827);
  text-align: right;
}

.services-row {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--color-border, #e5e7eb);
}

.services-row .value.services {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  display: flex;
  gap: 0.75rem;
}

.btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--color-background, #f3f4f6);
  color: var(--color-text, #111827);
  border: 1px solid var(--color-border, #e5e7eb);
}

.btn-secondary:hover {
  background: var(--color-background-hover, #e5e7eb);
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark, #1d4ed8);
}
</style>
