<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast, useAccountingStats } from '@/composables'
import { ClaimStatusBadge } from '@/components/accounting'
import { formatCurrency } from '@/utils/format'
import type { InsuranceClaimResponse } from '@/types'

const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const stats = useAccountingStats()

const claims = computed(() => accountingStore.insuranceClaims)
const loading = computed(() => accountingStore.claimsLoading)

onMounted(() => {
  loadClaims()
})

const loadClaims = async () => {
  try {
    await accountingStore.fetchClaims()
  } catch (error: any) {
    toast.error(error.message || 'Sigorta başvuruları yüklenemedi')
  }
}

const handleClaimClick = (id: number) => {
  router.push({ name: 'claim-detail', params: { id } })
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Sigorta Başvuruları</h1>
        <p class="page-subtitle">Sigorta şirketlerinden talep edilen tazminatlar</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Toplam Başvuru</div>
        <div class="stat-value">{{ stats.totalClaims.value }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Bekleyen</div>
        <div class="stat-value text-orange">{{ stats.pendingClaimsCount.value }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Onaylanan</div>
        <div class="stat-value text-green">{{ stats.approvedClaimsCount.value }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Toplam Tazminat</div>
        <div class="stat-value">{{ formatCurrency(stats.totalApprovedAmount.value) }}</div>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="claims.length === 0" class="empty-state">
      <p>Henüz sigorta başvurusu bulunmamaktadır.</p>
    </div>

    <div v-else class="claims-list">
      <div
        v-for="claim in claims"
        :key="claim.id"
        class="claim-card"
        @click="handleClaimClick(claim.id)"
      >
        <div class="claim-header">
          <div>
            <h3 class="claim-number">{{ claim.claimNumber }}</h3>
            <p class="claim-vehicle">{{ claim.vehiclePlate }}</p>
          </div>
          <ClaimStatusBadge :status="claim.status" />
        </div>
        <div class="claim-body">
          <div class="claim-row">
            <span class="label">Talep Edilen:</span>
            <span class="value">{{ formatCurrency(claim.claimedAmount) }}</span>
          </div>
          <div class="claim-row">
            <span class="label">Onaylanan:</span>
            <span class="value">{{ formatCurrency(claim.approvedAmount) }}</span>
          </div>
          <div class="claim-row">
            <span class="label">Ödenen:</span>
            <span class="value">{{ formatCurrency(claim.paidAmount) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text, #111827);
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text, #111827);
}

.text-orange {
  color: #c2410c !important;
}

.text-green {
  color: #15803d !important;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  color: var(--color-text-secondary, #6b7280);
}

.claims-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.claim-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.claim-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary, #2563eb);
}

.claim-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.claim-number {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.claim-vehicle {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0.25rem 0 0 0;
}

.claim-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.claim-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.claim-row .label {
  color: var(--color-text-secondary, #6b7280);
}

.claim-row .value {
  font-weight: 500;
  color: var(--color-text, #111827);
}
</style>
