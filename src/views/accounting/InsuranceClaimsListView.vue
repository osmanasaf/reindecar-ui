<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast, useAccountingStats, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import { ClaimStatusBadge } from '@/components/accounting'
import { formatCurrency } from '@/utils/format'
import { ClaimStatus, ClaimType } from '@/types'

const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const stats = useAccountingStats()
const { translateClaimStatus, translateClaimType, claimStatuses, claimTypes } = useEnumTranslations()

const claims = computed(() => accountingStore.insuranceClaims)
const loading = computed(() => accountingStore.claimsLoading)

const searchQuery = ref('')
const selectedStatus = ref<ClaimStatus | null>(null)
const selectedType = ref<ClaimType | null>(null)

const statusOptions = computed(() =>
  Object.values(ClaimStatus).map(s => ({ value: s, label: claimStatuses[s] ?? s }))
)
const typeOptions = computed(() =>
  Object.values(ClaimType).map(t => ({ value: t, label: claimTypes[t] ?? t }))
)

const filteredClaims = computed(() => {
  let result = [...claims.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.claimNumber?.toLowerCase().includes(q) ||
      c.vehiclePlate?.toLowerCase().includes(q)
    )
  }

  if (selectedStatus.value) {
    result = result.filter(c => c.status === selectedStatus.value)
  }

  if (selectedType.value) {
    result = result.filter(c => c.claimType === selectedType.value)
  }

  return result
})

const hasFilters = computed(() =>
  !!searchQuery.value || !!selectedStatus.value || !!selectedType.value
)

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

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = null
  selectedType.value = null
}

</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Sigorta Başvuruları</h1>
        <p class="page-subtitle">Sigorta şirketlerinden talep edilen tazminatlar</p>
      </div>
      <span class="info-note">Başvurular araç hasar raporlarından oluşturulur</span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-blue">📋</div>
        <div class="stat-content">
          <div class="stat-label">Toplam Başvuru</div>
          <div class="stat-value">{{ stats.totalClaims.value }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-orange">⏳</div>
        <div class="stat-content">
          <div class="stat-label">Bekleyen</div>
          <div class="stat-value text-orange">{{ stats.pendingClaimsCount.value }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-green">✅</div>
        <div class="stat-content">
          <div class="stat-label">Onaylanan</div>
          <div class="stat-value text-green">{{ stats.approvedClaimsCount.value }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-purple">💰</div>
        <div class="stat-content">
          <div class="stat-label">Toplam Tazminat</div>
          <div class="stat-value">{{ formatCurrency(stats.totalApprovedAmount.value) }}</div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Başvuru no veya araç plakası ara..."
        />
      </div>
      <SearchableSelect
        :model-value="selectedStatus"
        :options="statusOptions"
        placeholder="Tüm Durumlar"
        search-placeholder="Durum ara..."
        clearable
        class="filter-searchable"
        @update:model-value="(v) => selectedStatus = v as ClaimStatus | null"
      />
      <SearchableSelect
        :model-value="selectedType"
        :options="typeOptions"
        placeholder="Tüm Tipler"
        search-placeholder="Tip ara..."
        clearable
        class="filter-searchable"
        @update:model-value="(v) => selectedType = v as ClaimType | null"
      />
      <button v-if="hasFilters" class="btn btn-ghost" @click="clearFilters">Temizle</button>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="filteredClaims.length === 0" class="empty-state">
      <p v-if="hasFilters">Arama kriterlerine uygun başvuru bulunamadı.</p>
      <p v-else>Henüz sigorta başvurusu bulunmamaktadır.</p>
    </div>

    <div v-else>
      <p class="result-count">{{ filteredClaims.length }} başvuru listeleniyor</p>
      <div class="claims-list">
        <div
          v-for="claim in filteredClaims"
          :key="claim.id"
          class="claim-card"
          @click="handleClaimClick(claim.id)"
        >
          <div class="claim-header">
            <div>
              <h3 class="claim-number">{{ claim.claimNumber }}</h3>
              <p class="claim-vehicle">{{ claim.vehiclePlate }}</p>
              <span class="claim-type-badge">{{ translateClaimType(claim.claimType) }}</span>
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
              <span class="value text-green">{{ formatCurrency(claim.approvedAmount) }}</span>
            </div>
            <div class="claim-row">
              <span class="label">Ödenen:</span>
              <span class="value text-blue">{{ formatCurrency(claim.paidAmount) }}</span>
            </div>
          </div>
          <div v-if="claim.approvedAmount > 0" class="claim-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${Math.min(100, Math.round((claim.paidAmount / claim.approvedAmount) * 100))}%` }"
              ></div>
            </div>
            <span class="progress-text">
              {{ Math.min(100, Math.round((claim.paidAmount / claim.approvedAmount) * 100)) }}% ödendi
            </span>
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.info-note {
  font-size: 0.8125rem;
  color: var(--color-text-secondary, #6b7280);
  background: #f3f4f6;
  padding: 0.375rem 0.875rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-border, #e5e7eb);
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

.btn-ghost {
  background: transparent;
  border: 1px solid var(--color-border, #e5e7eb);
  color: var(--color-text, #111827);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  font-size: 1.5rem;
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-blue { background: #eff6ff; }
.stat-icon-orange { background: #fff7ed; }
.stat-icon-green { background: #f0fdf4; }
.stat-icon-purple { background: #faf5ff; }

.stat-content { display: flex; flex-direction: column; gap: 0.25rem; }
.stat-label { font-size: 0.8125rem; color: var(--color-text-secondary, #6b7280); }
.stat-value { font-size: 1.375rem; font-weight: 700; color: var(--color-text, #111827); }

.text-orange { color: #c2410c !important; }
.text-green { color: #15803d !important; }
.text-blue { color: #1d4ed8 !important; }

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.search-box { flex: 1; min-width: 220px; }

.search-input {
  width: 100%;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.filter-searchable { min-width: 160px; }

.result-count {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 1rem;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-state p { margin: 0; }

.claims-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.claim-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.claim-card:hover {
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary, #2563eb);
  transform: translateY(-1px);
}

.claim-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.claim-number {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0 0 0.25rem 0;
}

.claim-vehicle {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 0.5rem 0;
}

.claim-type-badge {
  display: inline-block;
  padding: 0.125rem 0.625rem;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.claim-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-background, #f9fafb);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
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

.claim-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  flex: 1;
  height: 0.375rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 1rem; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .claims-list { grid-template-columns: 1fr; }
  .filter-bar { flex-direction: column; }
  .search-box { width: 100%; }
}
</style>
