<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast } from '@/composables'
import { ReceivableStatusBadge, PaymentModal } from '@/components/accounting'
import { formatCurrency, formatDate } from '@/utils/format'
import { useEnumTranslations } from '@/composables'
import type { RecordPaymentRequest } from '@/types'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { translateReceivableType } = useEnumTranslations()

const showPaymentModal = ref(false)

const receivable = computed(() => accountingStore.selectedReceivable)
const loading = computed(() => accountingStore.receivablesLoading)

onMounted(() => {
  const id = Number(route.params.id)
  if (id) {
    accountingStore.fetchReceivableById(id)
  }
})

const submitPayment = async (data: RecordPaymentRequest) => {
  if (!receivable.value) return
  
  try {
    await accountingStore.recordReceivablePayment(receivable.value.id, data)
    toast.success('Ödeme başarıyla kaydedildi')
    showPaymentModal.value = false
  } catch (error: any) {
    toast.error(error.message || 'Ödeme kaydedilemedi')
  }
}

const goBack = () => {
  router.push({ name: 'receivables' })
}
</script>

<template>
  <div class="page-container">
    <button class="back-btn" @click="goBack">← Geri</button>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="!receivable" class="error">Alacak bulunamadı</div>

    <div v-else class="detail-container">
      <div class="detail-header">
        <div>
          <h1 class="detail-title">{{ receivable.receivableNumber }}</h1>
          <p class="detail-subtitle">{{ translateReceivableType(receivable.type) }}</p>
        </div>
        <ReceivableStatusBadge :status="receivable.status" size="lg" />
      </div>

      <div class="detail-grid">
        <div class="detail-card">
          <h3 class="card-title">Genel Bilgiler</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Müşteri:</span>
              <span class="value">{{ receivable.customerName || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Açıklama:</span>
              <span class="value">{{ receivable.description }}</span>
            </div>
            <div class="info-item">
              <span class="label">Vade Tarihi:</span>
              <span class="value">{{ formatDate(receivable.dueDate) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Oluşturulma:</span>
              <span class="value">{{ formatDate(receivable.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <h3 class="card-title">Tutar Bilgileri</h3>
          <div class="amounts">
            <div class="amount-row">
              <span class="label">Toplam Tutar:</span>
              <span class="value total">{{ formatCurrency(receivable.amount) }}</span>
            </div>
            <div class="amount-row">
              <span class="label">Ödenen Tutar:</span>
              <span class="value paid">{{ formatCurrency(receivable.paidAmount) }}</span>
            </div>
            <div class="amount-row highlight">
              <span class="label">Kalan Tutar:</span>
              <span class="value remaining">{{ formatCurrency(receivable.remainingAmount) }}</span>
            </div>
          </div>

          <button
            v-if="receivable.status !== 'FULLY_PAID' && receivable.status !== 'CANCELLED'"
            class="btn btn-primary"
            @click="showPaymentModal = true"
          >
            Ödeme Al
          </button>
        </div>
      </div>
    </div>

    <PaymentModal
      v-if="receivable"
      :show="showPaymentModal"
      :remaining-amount="receivable.remainingAmount"
      :receivable-number="receivable.receivableNumber"
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

.back-btn:hover {
  text-decoration: underline;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.detail-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.detail-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text, #111827);
  margin: 0 0 0.5rem 0;
}

.detail-subtitle {
  font-size: 1rem;
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
  color: var(--color-text, #111827);
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

.info-item .value {
  color: var(--color-text, #111827);
  text-align: right;
}

.amounts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-background, #f9fafb);
  border-radius: 0.375rem;
  margin-bottom: 1rem;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.amount-row.highlight {
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.amount-row .value.total {
  font-weight: 600;
  color: var(--color-text, #111827);
}

.amount-row .value.paid {
  color: #15803d;
  font-weight: 500;
}

.amount-row .value.remaining {
  font-weight: 700;
  font-size: 1.125rem;
  color: #c2410c;
}

.btn {
  width: 100%;
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
</style>
