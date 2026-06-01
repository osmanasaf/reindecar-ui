<script setup lang="ts">
import type { RentalHistoryItem } from '@/types'
import { RcModal, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatCurrency } from '@/utils/format'

interface Props {
  rental: RentalHistoryItem | null
  visible: boolean
}

defineProps<Props>()

const emit = defineEmits<{ close: [] }>()

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}
</script>

<template>
  <RcModal
    :open="visible && rental !== null"
    wide
    :title="rental?.rentalNumber ?? 'Kiralama Detayı'"
    @close="emit('close')"
  >
    <div v-if="rental" class="rc-veh-detail-modal">
      <div class="rc-veh-detail-modal__badges">
        <RcBadge variant="default">
          {{ rental.rentalTypeDisplayName || rental.rentalType }}
        </RcBadge>
        <RcBadge :variant="rental.overdue ? 'danger' : 'info'">
          {{ rental.statusDisplayName || rental.status }}
        </RcBadge>
      </div>

      <div v-if="rental.overdue" class="rc-veh-detail-modal__alert">
        <RcIcon name="warning" :size="16" />
        Bu kiralama {{ rental.overdueDays }} gün gecikmiş durumda
      </div>

      <div class="detail-section">
        <h3>Müşteri Bilgileri</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Müşteri Adı</span>
            <span class="value">{{ rental.customerName }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Müşteri Tipi</span>
            <span class="value">
              {{ rental.customerType === 'PERSONAL' ? 'Bireysel' : 'Kurumsal' }}
            </span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Şube Bilgileri</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Teslim Şubesi</span>
            <span class="value">{{ rental.branchName }}</span>
          </div>
          <div class="detail-item">
            <span class="label">İade Şubesi</span>
            <span class="value">{{ rental.returnBranchName || rental.branchName }}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Tarih ve Süre</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Başlangıç Tarihi</span>
            <span class="value">{{ formatDate(rental.startDate) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Planlanan Bitiş</span>
            <span class="value">{{ formatDate(rental.endDate) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Gerçek İade Tarihi</span>
            <span class="value">
              {{ rental.actualReturnDate ? formatDate(rental.actualReturnDate) : '—' }}
            </span>
          </div>
          <div class="detail-item">
            <span class="label">Planlanan / Gerçekleşen</span>
            <span class="value highlight">
              {{ rental.plannedDays }} / {{ rental.actualDays ?? '—' }} gün
            </span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>KM Bilgileri</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Başlangıç KM</span>
            <span class="value">
              {{ rental.startKm?.toLocaleString('tr-TR') ?? '—' }} km
            </span>
          </div>
          <div class="detail-item">
            <span class="label">Bitiş KM</span>
            <span class="value">{{ rental.endKm?.toLocaleString('tr-TR') ?? '—' }} km</span>
          </div>
          <div class="detail-item">
            <span class="label">Toplam KM</span>
            <span class="value highlight">
              {{ rental.totalKm?.toLocaleString('tr-TR') ?? '—' }} km
            </span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Ücret Bilgileri</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Günlük Ücret</span>
            <span class="value">{{ formatCurrency(rental.dailyPriceAmount) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Toplam Ücret</span>
            <span class="value">{{ formatCurrency(rental.totalPriceAmount) }}</span>
          </div>
          <div v-if="rental.discountAmount > 0" class="detail-item">
            <span class="label">İndirim</span>
            <span class="value" style="color: var(--rc-success-600)">
              −{{ formatCurrency(rental.discountAmount) }}
            </span>
          </div>
          <div v-if="rental.extraKmChargeAmount > 0" class="detail-item">
            <span class="label">Ekstra KM Ücreti</span>
            <span class="value" style="color: var(--rc-warning-700)">
              +{{ formatCurrency(rental.extraKmChargeAmount) }}
            </span>
          </div>
          <div class="detail-item full">
            <span class="label">Genel Toplam</span>
            <span class="value grand-total">{{ formatCurrency(rental.grandTotalAmount) }}</span>
          </div>
        </div>
      </div>

      <div v-if="rental.notes" class="detail-section">
        <h3>Notlar</h3>
        <p class="notes">{{ rental.notes }}</p>
      </div>
    </div>
  </RcModal>
</template>

<style scoped>
.rc-veh-detail-modal__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.rc-veh-detail-modal__alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: var(--rc-r-8);
  background: var(--rc-danger-50);
  border: 1px solid var(--rc-danger-200);
  color: var(--rc-danger-700);
  font-size: 13px;
  font-weight: 500;
}
</style>
