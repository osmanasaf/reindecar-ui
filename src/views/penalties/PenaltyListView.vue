<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { penaltiesApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import PenaltyStatusBadge from '@/components/penalties/PenaltyStatusBadge.vue'
import { RcPageHeader, RcButton, RcEmpty, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatCurrency, formatDate } from '@/utils/format'
import type { PenaltyResponse } from '@/types'

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
  return penalties.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const overdueCount = computed(() => penalties.value.filter(p => p.isOverdue).length)

async function loadPenalties() {
  loading.value = true
  try {
    const response = showOverdueOnly.value
      ? await penaltiesApi.getOverdue({ page: currentPage.value, size: pageSize.value })
      : await penaltiesApi.getAll({ page: currentPage.value, size: pageSize.value })

    penalties.value = response.content
    totalCount.value = response.totalElements
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Cezalar yüklenemedi')
  } finally {
    loading.value = false
  }
}

function handlePenaltyClick(id: number) {
  router.push({ name: 'penalty-detail', params: { id } })
}

function handleToggleOverdue() {
  currentPage.value = 0
  void loadPenalties()
}

function handlePageChange(page: number) {
  currentPage.value = page
  void loadPenalties()
}

onMounted(() => {
  void loadPenalties()
})
</script>

<template>
  <div class="rc-page rca-penalties">
    <RcPageHeader
      title="Trafik Cezaları"
      subtitle="Araç kiralama sürecinde kesilen trafik cezaları"
    />

    <div class="rca-stats rca-stats--payables">
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam kayıt</div>
        <div class="rca-stat__value rc-num">{{ totalCount }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Vadesi geçmiş</div>
        <div class="rca-stat__value rca-stat__value--danger rc-num">{{ overdueCount }}</div>
      </div>
    </div>

    <div class="rc-filterbar rcv-filterbar--slim">
      <button
        type="button"
        class="rc-chip"
        :class="{ 'rc-chip--on': !showOverdueOnly }"
        @click="showOverdueOnly = false; handleToggleOverdue()"
      >
        Hepsi
      </button>
      <button
        type="button"
        class="rc-chip"
        :class="{ 'rc-chip--on': showOverdueOnly }"
        @click="showOverdueOnly = true; handleToggleOverdue()"
      >
        Vadesi geçmiş
        <span v-if="overdueCount > 0" class="rc-chip__count">{{ overdueCount }}</span>
      </button>
    </div>

    <div v-if="loading" class="rc-skeleton rc-card-skeleton" style="height: 280px" />

    <RcEmpty
      v-else-if="penalties.length === 0"
      :title="showOverdueOnly ? 'Gecikmiş ceza yok' : 'Ceza kaydı yok'"
      :description="showOverdueOnly ? 'Vadesi geçmiş ceza bulunmuyor' : 'Henüz trafik cezası kaydı yok'"
    >
      <template #icon><RcIcon name="warning" :size="32" /></template>
    </RcEmpty>

    <div v-else class="rc-card" style="overflow: hidden">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th>Ceza no</th>
            <th>Plaka</th>
            <th>İhlal</th>
            <th>Tarih</th>
            <th>Yer</th>
            <th class="rc-right">Tutar</th>
            <th>Vade</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="penalty in paginatedPenalties"
            :key="penalty.id"
            :class="{ 'rca-row--danger': penalty.isOverdue }"
            style="cursor: pointer"
            @click="handlePenaltyClick(penalty.id)"
          >
            <td>
              <div class="rcr-row__primary rcr-row__mono">{{ penalty.penaltyNumber }}</div>
              <RcBadge v-if="penalty.source === 'EXTERNAL'" variant="info" style="margin-top: 4px">API</RcBadge>
            </td>
            <td>{{ penalty.plateNumber || '—' }}</td>
            <td>{{ translateViolationType(penalty.violationType) }}</td>
            <td class="rc-mono" style="font-size: 12.5px">{{ formatDate(penalty.violationDate) }}</td>
            <td>
              <span class="rcr-row__secondary" style="max-width: 180px; display: inline-block">
                {{ penalty.violationLocation || '—' }}
              </span>
            </td>
            <td class="rc-right rc-num">{{ formatCurrency(penalty.penaltyAmount, penalty.currency) }}</td>
            <td>
              <div>{{ penalty.dueDate ? formatDate(penalty.dueDate) : '—' }}</div>
              <RcBadge v-if="penalty.isOverdue" variant="danger" style="margin-top: 4px">Geç</RcBadge>
            </td>
            <td>
              <PenaltyStatusBadge :status="penalty.status" size="sm" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && totalPages > 1" class="rca-pagination">
      <RcButton variant="secondary" :disabled="currentPage === 0" @click="handlePageChange(currentPage - 1)">
        Önceki
      </RcButton>
      <span style="font-size: 13px; color: var(--rc-text-muted)">Sayfa {{ currentPage + 1 }} / {{ totalPages }}</span>
      <RcButton variant="secondary" :disabled="currentPage >= totalPages - 1" @click="handlePageChange(currentPage + 1)">
        Sonraki
      </RcButton>
    </div>
  </div>
</template>
