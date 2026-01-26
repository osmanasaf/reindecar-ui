<script setup lang="ts">
import { useEnumTranslations } from '@/composables'
import type { DamageHistoryItem } from '@/types'

interface Props {
  damage: DamageHistoryItem | null
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const { translateDamageType, translateSeverity, translateDamageLocation } = useEnumTranslations()

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible && damage" class="modal-overlay" @click="emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <div>
              <h2>{{ translateDamageType(damage.damageType) }}</h2>
              <span :class="['damage-status', { repaired: damage.repaired }]">
                {{ damage.repaired ? '✓ Onarıldı' : '⚠ Aktif Hasar' }}
              </span>
            </div>
            <button class="close-btn" @click="emit('close')">×</button>
          </div>

          <div class="modal-body">
            <div class="detail-section">
              <h3>Hasar Bilgileri</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Hasar Tipi</span>
                  <span class="value">{{ translateDamageType(damage.damageType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Lokasyon</span>
                  <span class="value">{{ translateDamageLocation(damage.location) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Şiddet</span>
                  <span class="value severity">{{ translateSeverity(damage.severity) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Rapor Tarihi</span>
                  <span class="value">{{ formatDate(damage.reportDate) }}</span>
                </div>
              </div>
            </div>

            <div v-if="damage.repaired" class="detail-section repair-section">
              <h3>Onarım Bilgileri</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Onarım Tarihi</span>
                  <span class="value">{{ damage.repairedDate ? formatDate(damage.repairedDate) : '-' }}</span>
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

.damage-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #FFF3CD;
  color: #856404;
}

.damage-status.repaired {
  background: var(--color-success-light);
  color: var(--color-success);
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

.repair-section {
  background: var(--color-success-light);
  padding: 16px;
  border-radius: 12px;
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

.detail-item .value.severity {
  font-size: 16px;
  font-weight: 700;
  color: #FF9800;
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
