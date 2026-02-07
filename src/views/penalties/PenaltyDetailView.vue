<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { penaltiesApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import PenaltyStatusBadge from '@/components/penalties/PenaltyStatusBadge.vue'
import { formatCurrency, formatDate } from '@/utils/format'
import type { PenaltyResponse, PenaltyStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { translateViolationType } = useEnumTranslations()

const penalty = ref<PenaltyResponse | null>(null)
const loading = ref(true)
const showNotifyModal = ref(false)
const showDisputeModal = ref(false)

const penaltyId = computed(() => Number(route.params.id))

const availableActions = computed(() => {
  if (!penalty.value) return []
  
  const status = penalty.value.status
  const actions: string[] = []
  
  switch (status) {
    case 'PENDING':
      actions.push('notify', 'markAsPaidByCompany', 'cancel')
      break
    case 'NOTIFIED':
      actions.push('dispute', 'markAsPaid')
      break
    case 'DISPUTED':
      actions.push('markAsPaid')
      break
    case 'PAID_BY_COMPANY':
      actions.push('notify')
      break
  }
  
  return actions
})

const loadPenalty = async () => {
  loading.value = true
  try {
    penalty.value = await penaltiesApi.getById(penaltyId.value)
  } catch (error: any) {
    toast.error(error.message || 'Ceza bilgisi yüklenemedi')
    router.push({ name: 'penalties' })
  } finally {
    loading.value = false
  }
}

const handleNotify = async () => {
  if (!penalty.value) return
  
  try {
    await penaltiesApi.notify(penalty.value.id)
    toast.success('Müşteriye bildirim gönderildi')
    await loadPenalty()
  } catch (error: any) {
    toast.error(error.message || 'Bildirim gönderilirken hata oluştu')
  }
}

const handleDispute = async () => {
  if (!penalty.value) return
  
  try {
    await penaltiesApi.dispute(penalty.value.id)
    toast.success('İtiraz kaydı oluşturuldu')
    await loadPenalty()
  } catch (error: any) {
    toast.error(error.message || 'İtiraz kaydedilirken hata oluştu')
  }
}

const handleMarkAsPaid = async () => {
  if (!penalty.value) return
  if (!confirm('Müşteri bu cezayı ödedi olarak işaretlensin mi?')) return
  
  try {
    await penaltiesApi.markAsPaid(penalty.value.id, false)
    toast.success('Ceza ödendi olarak işaretlendi')
    await loadPenalty()
  } catch (error: any) {
    toast.error(error.message || 'İşlem başarısız oldu')
  }
}

const handleMarkAsPaidByCompany = async () => {
  if (!penalty.value) return
  if (!confirm('Şirket bu cezayı ödedi olarak işaretlensin mi?')) return
  
  try {
    await penaltiesApi.markAsPaid(penalty.value.id, true)
    toast.success('Ceza şirket tarafından ödendi olarak işaretlendi')
    await loadPenalty()
  } catch (error: any) {
    toast.error(error.message || 'İşlem başarısız oldu')
  }
}

const handleCancel = async () => {
  if (!penalty.value) return
  if (!confirm('Bu cezayı iptal etmek istediğinizden emin misiniz?')) return
  
  try {
    await penaltiesApi.cancel(penalty.value.id)
    toast.success('Ceza iptal edildi')
    await loadPenalty()
  } catch (error: any) {
    toast.error(error.message || 'İptal işlemi başarısız oldu')
  }
}

onMounted(() => {
  loadPenalty()
})
</script>

<template>
  <div class="page-container">
    <button class="back-btn" @click="router.push({ name: 'penalties' })">← Geri</button>

    <div v-if="loading" class="loading">Yükleniyor...</div>
    <div v-else-if="!penalty" class="error">Ceza kaydı bulunamadı</div>

    <div v-else class="detail-container">
      <div class="detail-header">
        <div>
          <h1 class="detail-title">{{ penalty.penaltyNumber }}</h1>
          <p class="detail-subtitle">{{ penalty.plateNumber }}</p>
        </div>
        <div class="header-actions">
          <PenaltyStatusBadge :status="penalty.status" size="lg" />
        </div>
      </div>

      <div class="action-buttons" v-if="availableActions.length > 0">
        <button 
          v-if="availableActions.includes('notify')" 
          class="btn btn-primary"
          @click="handleNotify"
        >
          Müşteriye Bildir
        </button>
        <button 
          v-if="availableActions.includes('dispute')" 
          class="btn btn-secondary"
          @click="handleDispute"
        >
          İtiraz Kaydı
        </button>
        <button 
          v-if="availableActions.includes('markAsPaid')" 
          class="btn btn-success"
          @click="handleMarkAsPaid"
        >
          Müşteri Ödedi
        </button>
        <button 
          v-if="availableActions.includes('markAsPaidByCompany')" 
          class="btn btn-info"
          @click="handleMarkAsPaidByCompany"
        >
          Şirket Ödedi
        </button>
        <button 
          v-if="availableActions.includes('cancel')" 
          class="btn btn-danger"
          @click="handleCancel"
        >
          İptal Et
        </button>
      </div>

      <div class="detail-card">
        <h3 class="card-title">Ceza Bilgileri</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">İhlal Türü:</span>
            <span class="value">{{ translateViolationType(penalty.violationType) }}</span>
          </div>
          <div class="info-item">
            <span class="label">İhlal Tarihi:</span>
            <span class="value">{{ formatDate(penalty.violationDate) }}</span>
          </div>
          <div v-if="penalty.violationLocation" class="info-item full">
            <span class="label">İhlal Yeri:</span>
            <span class="value">{{ penalty.violationLocation }}</span>
          </div>
          <div class="info-item">
            <span class="label">Ceza Tutarı:</span>
            <span class="value amount">{{ formatCurrency(penalty.penaltyAmount, penalty.currency) }}</span>
          </div>
          <div v-if="penalty.dueDate" class="info-item">
            <span class="label">Vade Tarihi:</span>
            <span class="value" :class="{ 'overdue': penalty.isOverdue }">
              {{ formatDate(penalty.dueDate) }}
              <span v-if="penalty.isOverdue" class="overdue-text">(Vadesi Geçmiş)</span>
            </span>
          </div>
          <div v-if="penalty.ticketNumber" class="info-item">
            <span class="label">Ceza Makbuzu No:</span>
            <span class="value">{{ penalty.ticketNumber }}</span>
          </div>
          <div v-if="penalty.notificationDate" class="info-item">
            <span class="label">Bildirim Tarihi:</span>
            <span class="value">{{ formatDate(penalty.notificationDate) }}</span>
          </div>
          <div v-if="penalty.receivableId" class="info-item">
            <span class="label">Alacak No:</span>
            <span class="value link" @click="router.push({ name: 'receivable-detail', params: { id: penalty.receivableId } })">
              Alacak #{{ penalty.receivableId }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="penalty.description" class="detail-card">
        <h3 class="card-title">Açıklama</h3>
        <p class="description-text">{{ penalty.description }}</p>
      </div>

      <div v-if="penalty.notes" class="detail-card">
        <h3 class="card-title">Notlar</h3>
        <p class="notes-text">{{ penalty.notes }}</p>
      </div>

      <div class="detail-card">
        <h3 class="card-title">Sistem Bilgileri</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Kaynak:</span>
            <span class="value">{{ penalty.source === 'EXTERNAL' ? 'API Entegrasyonu' : 'Manuel' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Oluşturan:</span>
            <span class="value">{{ penalty.createdBy }}</span>
          </div>
          <div class="info-item">
            <span class="label">Oluşturma Tarihi:</span>
            <span class="value">{{ formatDate(penalty.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Son Güncelleme:</span>
            <span class="value">{{ formatDate(penalty.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-primary, #2563eb);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.detail-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.detail-subtitle {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
  font-size: 1.125rem;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark, #1d4ed8);
}

.btn-secondary {
  background: white;
  color: var(--color-text, #111827);
  border: 1px solid var(--color-border, #d1d5db);
}

.btn-secondary:hover {
  background: var(--color-background, #f3f4f6);
}

.btn-success {
  background: #22c55e;
  color: white;
}

.btn-success:hover {
  background: #16a34a;
}

.btn-info {
  background: #06b6d4;
  color: white;
}

.btn-info:hover {
  background: #0891b2;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.detail-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.info-item.full {
  grid-column: 1 / -1;
}

.info-item .label {
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
}

.info-item .value {
  text-align: right;
  color: var(--color-text, #111827);
}

.value.amount {
  font-weight: 600;
  font-size: 1.125rem;
  color: var(--color-primary, #2563eb);
}

.value.overdue {
  color: #dc2626;
}

.overdue-text {
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
}

.value.link {
  color: var(--color-primary, #2563eb);
  cursor: pointer;
  text-decoration: underline;
}

.value.link:hover {
  color: var(--color-primary-dark, #1d4ed8);
}

.description-text,
.notes-text {
  margin: 0;
  line-height: 1.5;
  color: var(--color-text, #111827);
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .info-item .value {
    text-align: left;
  }
}
</style>
