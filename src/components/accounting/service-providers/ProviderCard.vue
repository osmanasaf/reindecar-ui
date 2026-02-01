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

const { translateServiceType } = useEnumTranslations()

const serviceTypesList = computed(() => 
  props.provider.serviceTypes.map(t => translateServiceType(t)).join(', ')
)
</script>

<template>
  <div class="provider-card" @click="emit('click', provider.id)">
    <div class="card-header">
      <div class="card-header-left">
        <h3 class="card-title">{{ provider.name }}</h3>
        <span class="card-code">{{ provider.code }}</span>
      </div>
      <span :class="['status-badge', provider.active ? 'active' : 'inactive']">
        {{ provider.active ? 'Aktif' : 'Pasif' }}
      </span>
    </div>

    <div class="card-body">
      <div class="info-row">
        <span class="label">Hizmet Türleri:</span>
        <span class="value">{{ serviceTypesList }}</span>
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

      <div v-if="provider.address" class="info-row">
        <span class="label">Adres:</span>
        <span class="value">{{ provider.address }}</span>
      </div>
    </div>

    <div class="card-footer">
      <button 
        class="btn btn-secondary" 
        @click.stop="emit('edit', provider.id)"
      >
        Düzenle
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
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
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  font-family: monospace;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
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

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

.card-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.btn {
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
</style>
