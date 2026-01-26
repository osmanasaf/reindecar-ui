<script setup lang="ts">
import type { RentalHistoryItem } from '@/types'

interface Props {
  rental: RentalHistoryItem | null
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible && rental" class="modal-overlay" @click="emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <div>
              <h2>{{ rental.rentalCode }}</h2>
              <span class="rental-status">{{ rental.status }}</span>
            </div>
            <button class="close-btn" @click="emit('close')">×</button>
          </div>

          <div class="modal-body">
            <div class="detail-section">
              <h3>Müşteri Bilgileri</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Müşteri Adı</span>
                  <span class="value">{{ rental.customerName }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h3>Kiralama Detayları</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Başlangıç Tarihi</span>
                  <span class="value">{{ formatDate(rental.startDate) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Bitiş Tarihi</span>
                  <span class="value">{{ formatDate(rental.endDate) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Toplam Gün</span>
                  <span class="value highlight">{{ rental.totalDays }} gün</span>
                </div>
                <div class="detail-item">
                  <span class="label">Toplam Tutar</span>
                  <span class="value highlight">{{ formatCurrency(rental.totalAmount) }}</span>
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

.rental-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: var(--color-primary-light);
  color: var(--color-primary);
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
