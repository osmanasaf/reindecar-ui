<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { penaltiesApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import PenaltyStatusBadge from '@/components/penalties/PenaltyStatusBadge.vue'
import { formatCurrency, formatDate } from '@/utils/format'
import type { PenaltyResponse, PenaltySearchCriteria } from '@/types'

const router = useRouter()
const toast = useToast()
const { translateViolationType } = useEnumTranslations()

const penalties = ref<PenaltyResponse[]>([])
const loading = ref(true)
const totalCount = ref(0)
const currentPage = ref(0)
const pageSize = ref(20)
const showOverdueOnly = ref(false)

const paginatedPenalties = computed(() => {
  const start = currentPage.value * pageSize.value
  const end = start + pageSize.value
  return penalties.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const loadPenalties = async () => {
  loading.value = true
  try {
    const response = showOverdueOnly.value
      ? await penaltiesApi.getOverdue({ page: currentPage.value, size: pageSize.value })
      : await penaltiesApi.getAll({ page: currentPage.value, size: pageSize.value })
    
    penalties.value = response.content
    totalCount.value = response.totalElements
  } catch (error: any) {
    toast.error(error.message || 'Cezalar yüklenemedi')
  } finally {
    loading.value = false
  }
}

const handlePenaltyClick = (id: number) => {
  router.push({ name: 'penalty-detail', params: { id } })
}

const handleToggleOverdue = () => {
  showOverdueOnly.value = !showOverdueOnly.value
  currentPage.value = 0
  loadPenalties()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadPenalties()
}

onMounted(() => {
  loadPenalties()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Trafik Cezaları</h1>
        <p class="page-subtitle">Araç kiralama sürecinde kesilen trafik cezaları</p>
      </div>
      <div class="header-actions">
        <label class="toggle-label">
          <input 
            type="checkbox" 
            v-model="showOverdueOnly"
            @change="handleToggleOverdue"
            class="toggle-checkbox"
          />
          <span class="toggle-text">Sadece vadesi geçmişler</span>
        </label>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else-if="penalties.length === 0" class="empty-state">
      <p>{{ showOverdueOnly ? 'Vadesi geçmiş ceza bulunmamaktadır.' : 'Henüz trafik cezası kaydı bulunmamaktadır.' }}</p>
    </div>

    <div v-else>
      <div class="table-container">
        <table class="penalty-table">
          <thead>
            <tr>
              <th>Ceza No</th>
              <th>Plaka</th>
              <th>İhlal Türü</th>
              <th>İhlal Tarihi</th>
              <th>Yer</th>
              <th class="text-right">Tutar</th>
              <th>Vade</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="penalty in paginatedPenalties" 
              :key="penalty.id"
              :class="{ 'overdue-row': penalty.isOverdue }"
              @click="handlePenaltyClick(penalty.id)"
            >
              <td>
                <div class="penalty-number">
                  {{ penalty.penaltyNumber }}
                  <span v-if="penalty.source === 'EXTERNAL'" class="source-badge">API</span>
                </div>
              </td>
              <td class="font-medium">{{ penalty.plateNumber || '-' }}</td>
              <td>{{ translateViolationType(penalty.violationType) }}</td>
              <td>{{ formatDate(penalty.violationDate) }}</td>
              <td class="location-cell">{{ penalty.violationLocation || '-' }}</td>
              <td class="text-right font-medium">{{ formatCurrency(penalty.penaltyAmount, penalty.currency) }}</td>
              <td>
                <div class="due-date-cell">
                  {{ penalty.dueDate ? formatDate(penalty.dueDate) : '-' }}
                  <span v-if="penalty.isOverdue" class="overdue-badge">VADESİ GEÇTİ</span>
                </div>
              </td>
              <td>
                <PenaltyStatusBadge :status="penalty.status" size="sm" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button 
          class="pagination-btn"
          :disabled="currentPage === 0"
          @click="handlePageChange(currentPage - 1)"
        >
          ← Önceki
        </button>
        <span class="pagination-info">
          Sayfa {{ currentPage + 1 }} / {{ totalPages }}
        </span>
        <button 
          class="pagination-btn"
          :disabled="currentPage >= totalPages - 1"
          @click="handlePageChange(currentPage + 1)"
        >
          Sonraki →
        </button>
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
  gap: 1rem;
  flex-wrap: wrap;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.toggle-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
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

.table-container {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  overflow: hidden;
}

.penalty-table {
  width: 100%;
  border-collapse: collapse;
}

.penalty-table thead {
  background: var(--color-background, #f9fafb);
}

.penalty-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.penalty-table tbody tr {
  cursor: pointer;
  transition: background-color 0.2s;
}

.penalty-table tbody tr:hover {
  background: var(--color-background, #f9fafb);
}

.penalty-table tbody tr.overdue-row {
  background: #fef2f2;
}

.penalty-table tbody tr.overdue-row:hover {
  background: #fee2e2;
}

.penalty-table td {
  padding: 0.875rem 1rem;
  font-size: 0.875rem;
  color: var(--color-text, #111827);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.penalty-number {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.source-badge {
  display: inline-flex;
  padding: 0.125rem 0.375rem;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
}

.location-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.due-date-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.overdue-badge {
  display: inline-flex;
  padding: 0.125rem 0.375rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
}

.text-right {
  text-align: right;
}

.font-medium {
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--color-background, #f3f4f6);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

@media (max-width: 1024px) {
  .penalty-table {
    font-size: 0.75rem;
  }
  
  .penalty-table th,
  .penalty-table td {
    padding: 0.625rem 0.75rem;
  }
  
  .location-cell {
    max-width: 150px;
  }
}
</style>
