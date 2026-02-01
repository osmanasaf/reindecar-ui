<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { ClaimStatusBadge } from '@/components/accounting'
import { formatCurrency, formatDate } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()

const claim = computed(() => accountingStore.selectedClaim)
const loading = computed(() => accountingStore.claimsLoading)

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
        <ClaimStatusBadge :status="claim.status" size="lg" />
      </div>

      <div class="detail-card">
        <h3 class="card-title">Başvuru Bilgileri</h3>
        <div class="info-grid">
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
</style>
