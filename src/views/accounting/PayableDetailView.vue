<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { PayableStatusBadge } from '@/components/accounting'
import { formatCurrency, formatDate } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()

const payable = computed(() => accountingStore.selectedPayable)
const loading = computed(() => accountingStore.payablesLoading)

onMounted(() => {
  const id = Number(route.params.id)
  if (id) accountingStore.fetchPayableById(id)
})
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
          <p class="detail-subtitle">{{ payable.serviceProviderName }}</p>
        </div>
        <PayableStatusBadge :status="payable.status" size="lg" />
      </div>

      <div class="detail-grid">
        <div class="detail-card">
          <h3 class="card-title">Genel Bilgiler</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Açıklama:</span>
              <span class="value">{{ payable.description }}</span>
            </div>
            <div class="info-item">
              <span class="label">Fatura No:</span>
              <span class="value">{{ payable.invoiceNumber || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Vade Tarihi:</span>
              <span class="value">{{ formatDate(payable.dueDate) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <h3 class="card-title">Tutar Bilgileri</h3>
          <div class="amounts">
            <div class="amount-row">
              <span class="label">Toplam:</span>
              <span class="value">{{ formatCurrency(payable.amount) }}</span>
            </div>
            <div class="amount-row">
              <span class="label">Ödenen:</span>
              <span class="value paid">{{ formatCurrency(payable.paidAmount) }}</span>
            </div>
            <div class="amount-row highlight">
              <span class="label">Kalan:</span>
              <span class="value remaining">{{ formatCurrency(payable.remainingAmount) }}</span>
            </div>
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
</style>
