<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { insuranceClaimsApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import { ClaimStatusBadge } from '@/components/accounting'
import ClaimDocumentList from '@/components/accounting/insurance-claims/ClaimDocumentList.vue'
import ClaimDocumentUploadModal from '@/components/accounting/insurance-claims/ClaimDocumentUploadModal.vue'
import ApproveClaimModal from '@/components/accounting/insurance-claims/ApproveClaimModal.vue'
import RejectClaimModal from '@/components/accounting/insurance-claims/RejectClaimModal.vue'
import RecordPaymentModal from '@/components/accounting/insurance-claims/RecordPaymentModal.vue'
import { formatCurrency, formatDate } from '@/utils/format'
import type { ClaimStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { translateClaimType } = useEnumTranslations()

const claim = computed(() => accountingStore.selectedClaim)
const loading = computed(() => accountingStore.claimsLoading)

const showApproveModal = ref(false)
const showRejectModal = ref(false)
const showPaymentModal = ref(false)
const showDocumentUploadModal = ref(false)
const documentListRef = ref<InstanceType<typeof ClaimDocumentList> | null>(null)

const availableActions = computed(() => {
  if (!claim.value) return []
  
  const status = claim.value.status
  const actions: string[] = []
  
  switch (status) {
    case 'DRAFT':
      actions.push('submit')
      break
    case 'SUBMITTED':
      actions.push('moveToReview', 'approve', 'reject')
      break
    case 'UNDER_REVIEW':
      actions.push('approve', 'reject')
      break
    case 'APPROVED':
      actions.push('recordPayment')
      break
    case 'PARTIAL_PAID':
      actions.push('recordPayment')
      break
  }
  
  return actions
})

const remainingAmount = computed(() => {
  if (!claim.value) return 0
  return claim.value.approvedAmount - claim.value.paidAmount
})

const handleSubmit = async () => {
  if (!claim.value) return
  
  try {
    await insuranceClaimsApi.submit(claim.value.id)
    toast.success('Başvuru sigorta şirketine gönderildi')
    await accountingStore.fetchClaimById(claim.value.id)
  } catch (error: any) {
    toast.error(error.message || 'Başvuru gönderilirken hata oluştu')
  }
}

const handleMoveToReview = async () => {
  if (!claim.value) return
  
  try {
    await insuranceClaimsApi.moveToReview(claim.value.id)
    toast.success('Başvuru incelemeye alındı')
    await accountingStore.fetchClaimById(claim.value.id)
  } catch (error: any) {
    toast.error(error.message || 'İşlem başarısız oldu')
  }
}

const handleApproveSuccess = async () => {
  if (!claim.value) return
  await accountingStore.fetchClaimById(claim.value.id)
}

const handleRejectSuccess = async () => {
  if (!claim.value) return
  await accountingStore.fetchClaimById(claim.value.id)
}

const handlePaymentSuccess = async () => {
  if (!claim.value) return
  await accountingStore.fetchClaimById(claim.value.id)
}

const handleDocumentUploadSuccess = () => {
  documentListRef.value?.refresh()
}

onMounted(() => {
  const id = Number(route.params.id)
  if (id) accountingStore.fetchClaimById(id)
})
</script>

<template>
  <div class="page-container">
    <button class="back-btn" @click="router.push({ name: 'insurance-claims' })">← Geri</button>

    <div v-if="loading" class="loading">Yükleniyor...</div>
    <div v-else-if="!claim" class="error">Sigorta başvurusu bulunamadı</div>

    <div v-else class="detail-container">
      <div class="detail-header">
        <div>
          <h1 class="detail-title">{{ claim.claimNumber }}</h1>
          <p class="detail-subtitle">{{ claim.vehiclePlate }}</p>
        </div>
        <div class="header-actions">
          <ClaimStatusBadge :status="claim.status" size="lg" />
        </div>
      </div>

      <div class="action-buttons" v-if="availableActions.length > 0">
        <button 
          v-if="availableActions.includes('submit')" 
          class="btn btn-primary"
          @click="handleSubmit"
        >
          Gönder
        </button>
        <button 
          v-if="availableActions.includes('moveToReview')" 
          class="btn btn-secondary"
          @click="handleMoveToReview"
        >
          İncelemeye Al
        </button>
        <button 
          v-if="availableActions.includes('approve')" 
          class="btn btn-success"
          @click="showApproveModal = true"
        >
          Onayla
        </button>
        <button 
          v-if="availableActions.includes('reject')" 
          class="btn btn-danger"
          @click="showRejectModal = true"
        >
          Reddet
        </button>
        <button 
          v-if="availableActions.includes('recordPayment')" 
          class="btn btn-primary"
          @click="showPaymentModal = true"
        >
          Ödeme Kaydet
        </button>
      </div>

      <div class="detail-card">
        <h3 class="card-title">Başvuru Bilgileri</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Başvuru Türü:</span>
            <span class="value">{{ translateClaimType(claim.claimType) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Olay Tarihi:</span>
            <span class="value">{{ formatDate(claim.incidentDate) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Talep Edilen:</span>
            <span class="value">{{ formatCurrency(claim.claimedAmount) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Onaylanan:</span>
            <span class="value">{{ formatCurrency(claim.approvedAmount) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Ödenen:</span>
            <span class="value paid">{{ formatCurrency(claim.paidAmount) }}</span>
          </div>
          <div v-if="claim.status === 'APPROVED' || claim.status === 'PARTIAL_PAID'" class="info-item">
            <span class="label">Kalan Tutar:</span>
            <span class="value highlight">{{ formatCurrency(remainingAmount) }}</span>
          </div>
          <div v-if="claim.submittedDate" class="info-item">
            <span class="label">Gönderim Tarihi:</span>
            <span class="value">{{ formatDate(claim.submittedDate) }}</span>
          </div>
          <div v-if="claim.approvedDate" class="info-item">
            <span class="label">Onay Tarihi:</span>
            <span class="value">{{ formatDate(claim.approvedDate) }}</span>
          </div>
        </div>
      </div>

      <div v-if="claim.description" class="detail-card">
        <h3 class="card-title">Açıklama</h3>
        <p class="description-text">{{ claim.description }}</p>
      </div>

      <div v-if="claim.status === 'REJECTED' && claim.rejectionReason" class="detail-card rejection-card">
        <h3 class="card-title">Red Sebebi</h3>
        <p class="rejection-text">{{ claim.rejectionReason }}</p>
      </div>

      <div v-if="claim.notes" class="detail-card">
        <h3 class="card-title">Notlar</h3>
        <p class="notes-text">{{ claim.notes }}</p>
      </div>

      <div class="detail-card">
        <ClaimDocumentList
          ref="documentListRef"
          :claim-id="claim.id"
          @upload-new="showDocumentUploadModal = true"
        />
      </div>

      <ApproveClaimModal
        v-if="claim"
        :show="showApproveModal"
        :claim-id="claim.id"
        :max-amount="claim.claimedAmount"
        @close="showApproveModal = false"
        @success="handleApproveSuccess"
      />

      <RejectClaimModal
        v-if="claim"
        :show="showRejectModal"
        :claim-id="claim.id"
        @close="showRejectModal = false"
        @success="handleRejectSuccess"
      />

      <RecordPaymentModal
        v-if="claim"
        :show="showPaymentModal"
        :claim-id="claim.id"
        :remaining-amount="remainingAmount"
        @close="showPaymentModal = false"
        @success="handlePaymentSuccess"
      />

      <ClaimDocumentUploadModal
        v-if="claim"
        :show="showDocumentUploadModal"
        :claim-id="claim.id"
        @close="showDocumentUploadModal = false"
        @success="handleDocumentUploadSuccess"
      />
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

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.detail-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.detail-subtitle {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.detail-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.info-item .label {
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
}

.value.paid {
  color: #15803d;
  font-weight: 500;
}

.value.highlight {
  color: var(--color-primary, #2563eb);
  font-weight: 600;
  font-size: 1rem;
}

.description-text,
.notes-text {
  margin: 0;
  line-height: 1.5;
  color: var(--color-text, #111827);
}

.rejection-card {
  border-left: 4px solid #ef4444;
}

.rejection-text {
  margin: 0;
  line-height: 1.5;
  color: #dc2626;
  font-weight: 500;
}
</style>
