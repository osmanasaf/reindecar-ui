<script setup lang="ts">
import { useEnumTranslations } from '@/composables'
import type { MaintenanceHistoryItem } from '@/types'

interface Props {
  maintenance: MaintenanceHistoryItem | null
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const { translateMaintenanceType } = useEnumTranslations()

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function formatCurrency(amount: number | null): string {
  if (!amount) return '-'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount)
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible && maintenance" class="modal-overlay" @click="emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <div>
              <h2>{{ translateMaintenanceType(maintenance.maintenanceType) }}</h2>
              <span class="maintenance-badge">🔧 Bakım</span>
            </div>
            <button class="close-btn" @click="emit('close')">×</button>
          </div>

          <div class="modal-body">
            <div class="detail-section">
              <h3>Bakım Bilgileri</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Bakım Tipi</span>
                  <span class="value">{{ translateMaintenanceType(maintenance.maintenanceType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Bakım Tarihi</span>
                  <span class="value">{{ formatDate(maintenance.maintenanceDate) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Güncel KM</span>
                  <span class="value highlight">{{ formatKm(maintenance.currentKm) }}</span>
                </div>
                <div class="detail-item" v-if="maintenance.costAmount">
                  <span class="label">Maliyet</span>
                  <span class="value highlight">{{ formatCurrency(maintenance.costAmount) }}</span>
                </div>
              </div>
            </div>

            <div v-if="maintenance.serviceProvider" class="detail-section">
              <h3>Servis Bilgileri</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Servis Sağlayıcı</span>
                  <span class="value">{{ maintenance.serviceProvider }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
}

.maintenance-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #E3F2FD;
  color: #1976D2;
}

.close-btn {
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item .label {
  font-size: 13px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.detail-item .value {
  font-size: 15px;
  color: var(--color-text);
  font-weight: 500;
}

.detail-item .value.highlight {
  font-size: 18px;
  color: var(--color-primary);
  font-weight: 700;
}

.parts-list {
  background: var(--color-bg-secondary);
  padding: 16px;
  border-radius: 12px;
}

.parts-list h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.parts-list ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.parts-list li {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 6px 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content {
  transform: scale(0.9) translateY(20px);
}

.modal-leave-to .modal-content {
  transform: scale(0.9) translateY(20px);
}

@media (max-width: 640px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
