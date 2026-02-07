<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast, useEnumTranslations } from '@/composables'
import { PayableStatusBadge, PaymentModal } from '@/components/accounting'
import PaymentProgress from '@/components/accounting/PaymentProgress.vue'
import DueStatusBadge from '@/components/accounting/DueStatusBadge.vue'
import { formatCurrency, formatDate } from '@/utils/format'
import type { RecordPaymentRequest } from '@/types'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { translatePayableType } = useEnumTranslations()

const showPaymentModal = ref(false)

const payable = computed(() => accountingStore.selectedPayable)
const loading = computed(() => accountingStore.payablesLoading)

const canMakePayment = computed(() => {
  return payable.value && 
    payable.value.status !== 'FULLY_PAID' && 
    payable.value.status !== 'CANCELLED'
})

const canCancel = computed(() => {
  return payable.value && 
    payable.value.status === 'PENDING'
})

onMounted(() => {
  const id = Number(route.params.id)
  if (id) accountingStore.fetchPayableById(id)
})

const submitPayment = async (data: RecordPaymentRequest) => {
  if (!payable.value) return
  
  try {
    await accountingStore.recordPayablePayment(payable.value.id, data)
    toast.success('Ödeme başarıyla kaydedildi')
    showPaymentModal.value = false
  } catch (error: any) {
    toast.error(error.message || 'Ödeme kaydedilemedi')
  }
}

const handleCancel = async () => {
  if (!payable.value) return
  if (!confirm('Bu borcun ödemesini iptal etmek istediğinize emin misiniz?')) return
  
  try {
    await accountingStore.cancelPayable(payable.value.id)
    toast.success('Borç iptal edildi')
  } catch (error: any) {
    toast.error(error.message || 'İptal işlemi başarısız oldu')
  }
}
</script>

<template>
  <div class="page-container">
    <button class="back-btn" @click="router.push({ name: 'payables' })">← Geri</button>

    <div v-if="loading" class="loading">Yükleniyor...</div>
    <div v-else-if="!payable" class="error">Verecek bulunamadı</div>

    <div v-else class="detail-container">
      <div class="detail-header">
        <div>
          <h1 class="detail-title">{{ payable.payableNumber }}</h1>
          <p class="detail-subtitle">{{ payable.serviceProviderName }} - {{ translatePayableType(payable.type) }}</p>
        </div>
        <div class="header-actions">
          <DueStatusBadge :due-date="payable.dueDate" :status="payable.status" />
          <PayableStatusBadge :status="payable.status" size="lg" />
        </div>
      </div>

      <div class="action-buttons">
        <button
          v-if="canMakePayment"
          class="btn btn-primary"
          @click="showPaymentModal = true"
        >
          Ödeme Yap
        </button>
        <button
          v-if="canCancel"
          class="btn btn-danger"
          @click="handleCancel"
        >
          İptal Et
        </button>
      </div>

      <div class="detail-grid">
        <div class="detail-card">
          <h3 class="card-title">Genel Bilgiler</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Açıklama:</span>
              <span class="value">{{ payable.description }}</span>
            </div>
            <div v-if="payable.invoiceNumber" class="info-item">
              <span class="label">Fatura No:</span>
              <span class="value">{{ payable.invoiceNumber }}</span>
            </div>
            <div v-if="payable.invoiceDate" class="info-item">
              <span class="label">Fatura Tarihi:</span>
              <span class="value">{{ formatDate(payable.invoiceDate) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Vade Tarihi:</span>
              <span class="value">{{ formatDate(payable.dueDate) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Oluşturan:</span>
              <span class="value">{{ payable.createdBy }}</span>
            </div>
            <div class="info-item">
              <span class="label">Oluşturulma:</span>
              <span class="value">{{ formatDate(payable.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <h3 class="card-title">Tutar Bilgileri</h3>
          <div class="amounts">
            <div class="amount-row">
              <span class="label">Toplam Tutar:</span>
              <span class="value total">{{ formatCurrency(payable.amount, payable.currency) }}</span>
            </div>
            <div class="amount-row">
              <span class="label">Ödenen Tutar:</span>
              <span class="value paid">{{ formatCurrency(payable.paidAmount, payable.currency) }}</span>
            </div>
            <div class="amount-row highlight">
              <span class="label">Kalan Tutar:</span>
              <span class="value remaining">{{ formatCurrency(payable.remainingAmount, payable.currency) }}</span>
            </div>
          </div>

          <PaymentProgress 
            :amount="payable.amount"
            :paid-amount="payable.paidAmount"
            :currency="payable.currency"
          />
        </div>
      </div>
    </div>

    <PaymentModal
      v-if="payable"
      :show="showPaymentModal"
      :remaining-amount="payable.remainingAmount"
      :receivable-number="payable.payableNumber"
      @close="showPaymentModal = false"
      @submit="submitPayment"
    />
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
  flex-wrap: wrap;
  margin-bottom: 2rem;
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

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
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
  font-size: 0.875rem;
}

.info-item .label {
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
}

.amounts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-background, #f9fafb);
  border-radius: 0.375rem;
}

.amount-row {
  display: flex;
  justify-content: space-between;
}

.amount-row.highlight {
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.value.paid {
  color: #15803d;
  font-weight: 500;
}

.value.remaining {
  font-weight: 700;
  font-size: 1.125rem;
  color: #c2410c;
}

.btn {
  padding: 0.75rem 1.25rem;
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

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: flex-end;
  }
}
</style>
