<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { usePagination, useToast, useAccountingStats } from '@/composables'
import { PayableCard, CreatePayableModal } from '@/components/accounting'
import { formatCurrency } from '@/utils/format'
import type { CreatePayableRequest, PayableFilters } from '@/types'

const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { getParams } = usePagination()
const stats = useAccountingStats()

const filters = ref<PayableFilters>({})
const showCreateModal = ref(false)

const payables = computed(() => accountingStore.payables)
const loading = computed(() => accountingStore.payablesLoading)

onMounted(() => {
  loadPayables()
})

const loadPayables = async () => {
  try {
    await accountingStore.fetchPayables(filters.value, getParams())
  } catch (error: any) {
    toast.error(error.message || 'Verecekler yüklenemedi')
  }
}

const handleCardClick = (id: number) => {
  router.push({ name: 'payable-detail', params: { id } })
}

const submitCreate = async (data: CreatePayableRequest) => {
  try {
    await accountingStore.createPayable(data)
    toast.success('Verecek başarıyla oluşturuldu')
    showCreateModal.value = false
    loadPayables()
  } catch (error: any) {
    toast.error(error.message || 'Verecek oluşturulamadı')
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Verecekler</h1>
        <p class="page-subtitle">Servis sağlayıcılara ödenecek tutarlar</p>
      </div>
      <button class="btn btn-primary" @click="showCreateModal = true">
        Yeni Verecek
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Toplam Verecek</div>
        <div class="stat-value">{{ formatCurrency(stats.totalPayables.value) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ödenecek</div>
        <div class="stat-value text-orange">{{ formatCurrency(stats.outstandingPayables.value) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Vadesi Geçmiş</div>
        <div class="stat-value text-red">
          {{ formatCurrency(stats.overduePayablesAmount.value) }}
          <span class="stat-count">({{ stats.overduePayablesCount.value }})</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ödeme Oranı</div>
        <div class="stat-value text-green">{{ stats.payablesPaymentRate.value }}%</div>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="payables.length === 0" class="empty-state">
      <p>Henüz verecek kaydı bulunmamaktadır.</p>
    </div>

    <div v-else class="cards-grid">
      <PayableCard
        v-for="payable in payables"
        :key="payable.id"
        :payable="payable"
        @click="handleCardClick"
      />
    </div>

    <CreatePayableModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @submit="submitCreate"
    />
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

.stat-count {
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-text-secondary, #6b7280);
}

.text-orange {
  color: #c2410c !important;
}

.text-red {
  color: #b91c1c !important;
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

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}
</style>
