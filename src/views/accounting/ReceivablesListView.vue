<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { usePagination, useToast, useAccountingStats } from '@/composables'
import { ReceivableCard, PaymentModal } from '@/components/accounting'
import { formatCurrency } from '@/utils/format'
import type { RecordPaymentRequest, ReceivableFilters } from '@/types'

const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { page, size, setPage, setTotal, getParams } = usePagination()
const stats = useAccountingStats()

const filters = ref<ReceivableFilters>({})
const showPaymentModal = ref(false)
const selectedReceivableId = ref<number | null>(null)
const selectedReceivableAmount = ref(0)

const receivables = computed(() => accountingStore.receivables)
const loading = computed(() => accountingStore.receivablesLoading)

onMounted(() => {
  loadReceivables()
})

const loadReceivables = async () => {
  try {
    const response = await accountingStore.fetchReceivables(filters.value, getParams())
    setTotal(response.totalElements, response.totalPages)
  } catch (error: any) {
    toast.error(error.message || 'Alacaklar yüklenemedi')
  }
}

const handleCardClick = (id: number) => {
  router.push({ name: 'receivable-detail', params: { id } })
}

const handlePayment = (id: number) => {
  const receivable = receivables.value.find(r => r.id === id)
  if (receivable) {
    selectedReceivableId.value = id
    selectedReceivableAmount.value = receivable.remainingAmount
    showPaymentModal.value = true
  }
}

const submitPayment = async (data: RecordPaymentRequest) => {
  if (!selectedReceivableId.value) return
  
  try {
    await accountingStore.recordReceivablePayment(selectedReceivableId.value, data)
    toast.success('Ödeme başarıyla kaydedildi')
    showPaymentModal.value = false
    selectedReceivableId.value = null
    loadReceivables()
  } catch (error: any) {
    toast.error(error.message || 'Ödeme kaydedilemedi')
  }
}

const handlePageChange = (newPage: number) => {
  setPage(newPage)
  loadReceivables()
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Alacaklar</h1>
        <p class="page-subtitle">Müşterilerden tahsil edilecek tutarlar</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Toplam Alacak</div>
        <div class="stat-value">{{ formatCurrency(stats.totalReceivables.value) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tahsil Edilecek</div>
        <div class="stat-value text-orange">{{ formatCurrency(stats.outstandingReceivables.value) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Vadesi Geçmiş</div>
        <div class="stat-value text-red">
          {{ formatCurrency(stats.overdueReceivablesAmount.value) }}
          <span class="stat-count">({{ stats.overdueReceivablesCount.value }})</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tahsilat Oranı</div>
        <div class="stat-value text-green">{{ stats.receivablesCollectionRate.value }}%</div>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="receivables.length === 0" class="empty-state">
      <p>Henüz alacak kaydı bulunmamaktadır.</p>
    </div>

    <div v-else class="cards-grid">
      <ReceivableCard
        v-for="receivable in receivables"
        :key="receivable.id"
        :receivable="receivable"
        @click="handleCardClick"
        @payment="handlePayment"
      />
    </div>

    <PaymentModal
      :show="showPaymentModal"
      :remaining-amount="selectedReceivableAmount"
      @close="showPaymentModal = false"
      @submit="submitPayment"
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
