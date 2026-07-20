<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { vehicleProfitabilityApi, vehicleCategoriesApi, branchesApi } from '@/api'
import { useToast } from '@/composables'
import { RcPageHeader, RcButton, RcEmpty, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import DateRangePicker from '@/components/base/DateRangePicker.vue'
import ProfitabilityDetailModal from '@/components/reports/ProfitabilityDetailModal.vue'
import { downloadBlob } from '@/utils/download'
import type { VehicleCategory, Branch } from '@/types'
import type { VehicleProfitabilityRow } from '@/types/profitability'

const toast = useToast()

const loading = ref(true)
const rows = ref<VehicleProfitabilityRow[]>([])
const categories = ref<VehicleCategory[]>([])
const branches = ref<Branch[]>([])

function defaultRange() {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 12)
  return {
    start: start.toISOString().split('T')[0] ?? '',
    end: end.toISOString().split('T')[0] ?? '',
  }
}

const dateRange = ref(defaultRange())
const branchFilter = ref<number | null>(null)
const categoryFilter = ref<number | null>(null)

type SortKey = 'plateNumber' | 'netContribution' | 'revenue' | 'utilizationRate'
const sortKey = ref<SortKey>('netContribution')
const sortDesc = ref(true)

const selectedVehicleId = ref<number | null>(null)
const detailOpen = ref(false)

function primaryAmount(list: { currency: string; amount: number }[]): number {
  return list.reduce((sum, m) => sum + m.amount, 0)
}

function formatMoneyList(list: { currency: string; amount: number }[]): string {
  if (list.length === 0) return '—'
  return list
    .map((m) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: m.currency, minimumFractionDigits: 2 }).format(m.amount))
    .join(' + ')
}

const sortedRows = computed(() => {
  const list = [...rows.value]
  const factor = sortDesc.value ? -1 : 1
  list.sort((a, b) => {
    if (sortKey.value === 'plateNumber') return factor * a.plateNumber.localeCompare(b.plateNumber)
    if (sortKey.value === 'utilizationRate') return factor * (a.utilizationRate - b.utilizationRate)
    if (sortKey.value === 'revenue') return factor * (primaryAmount(a.revenue) - primaryAmount(b.revenue))
    return factor * (primaryAmount(a.netContribution) - primaryAmount(b.netContribution))
  })
  return list
})

const totals = computed(() => {
  const revenue = new Map<string, number>()
  const net = new Map<string, number>()
  for (const row of rows.value) {
    for (const m of row.revenue) revenue.set(m.currency, (revenue.get(m.currency) ?? 0) + m.amount)
    for (const m of row.netContribution) net.set(m.currency, (net.get(m.currency) ?? 0) + m.amount)
  }
  return {
    revenue: Array.from(revenue.entries()).map(([currency, amount]) => ({ currency, amount })),
    net: Array.from(net.entries()).map(([currency, amount]) => ({ currency, amount })),
  }
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value
  } else {
    sortKey.value = key
    sortDesc.value = true
  }
}

async function loadFilters() {
  try {
    const [categoryList, branchList] = await Promise.all([
      vehicleCategoriesApi.getAll(),
      branchesApi.getActive(),
    ])
    categories.value = categoryList
    branches.value = branchList
  } catch {
    // reference data is non-critical for the report itself
  }
}

async function loadReport() {
  if (!dateRange.value.start || !dateRange.value.end) return
  loading.value = true
  try {
    const response = await vehicleProfitabilityApi.getProfitability({
      from: dateRange.value.start,
      to: dateRange.value.end,
      branchId: branchFilter.value,
      categoryId: categoryFilter.value,
    })
    rows.value = response.rows
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Kârlılık raporu yüklenemedi')
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  void loadReport()
}

function openDetail(vehicleId: number) {
  selectedVehicleId.value = vehicleId
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
  selectedVehicleId.value = null
}

function exportCsv() {
  const header = ['Plaka', 'Marka', 'Model', 'Şube', 'Kategori', 'Gelir', 'Bakım', 'Hasar', 'Ceza', 'HGS/OGS', 'Sigorta', 'Net Katkı', 'Doluluk %', 'Kiralama Sayısı']
  const lines = sortedRows.value.map((row) => [
    row.plateNumber,
    row.brand,
    row.model,
    row.branchName ?? '',
    row.categoryName ?? '',
    formatMoneyList(row.revenue),
    formatMoneyList(row.maintenanceCost),
    formatMoneyList(row.damageCost),
    formatMoneyList(row.penaltyCost),
    formatMoneyList(row.tollCost),
    formatMoneyList(row.insuranceCost),
    formatMoneyList(row.netContribution),
    row.utilizationRate.toString(),
    row.rentalCount.toString(),
  ])
  const csv = [header, ...lines]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `arac-karlilik-${dateRange.value.start}_${dateRange.value.end}.csv`)
}

function utilizationClass(rate: number): string {
  if (rate >= 70) return 'rcp-util--high'
  if (rate >= 50) return 'rcp-util--mid'
  return 'rcp-util--low'
}

onMounted(() => {
  void loadFilters()
  void loadReport()
})
</script>

<template>
  <div class="rc-page rcp-profitability">
    <RcPageHeader title="Araç Kârlılık ve Doluluk Raporu" subtitle="Araç bazlı gelir, maliyet ve doluluk analizi">
      <template #actions>
        <RcButton variant="secondary" :disabled="rows.length === 0" @click="exportCsv">
          <RcIcon name="download" :size="14" />
          CSV indir
        </RcButton>
      </template>
    </RcPageHeader>

    <div class="rc-filterbar">
      <DateRangePicker v-model="dateRange" @change="handleFilterChange" />

      <select v-model="branchFilter" class="rc-input rcv-filter-select" @change="handleFilterChange">
        <option :value="null">Tüm şubeler</option>
        <option v-for="branch in branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
      </select>

      <select v-model="categoryFilter" class="rc-input rcv-filter-select" @change="handleFilterChange">
        <option :value="null">Tüm kategoriler</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
    </div>

    <div class="rca-stats">
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam araç</div>
        <div class="rca-stat__value rc-num">{{ rows.length }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam gelir</div>
        <div class="rca-stat__value rc-num">{{ formatMoneyList(totals.revenue) }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam net katkı</div>
        <div class="rca-stat__value rc-num">{{ formatMoneyList(totals.net) }}</div>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="9" />

    <RcEmpty
      v-else-if="rows.length === 0"
      title="Kayıt yok"
      description="Seçilen aralık ve filtreler için araç bulunamadı"
    >
      <template #icon><RcIcon name="trend" :size="32" /></template>
    </RcEmpty>

    <div v-else class="rc-card" style="overflow: auto">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th style="cursor: pointer" @click="toggleSort('plateNumber')">Araç</th>
            <th>Şube / Kategori</th>
            <th class="rc-right" style="cursor: pointer" @click="toggleSort('revenue')">Gelir</th>
            <th class="rc-right">Maliyetler</th>
            <th class="rc-right" style="cursor: pointer" @click="toggleSort('netContribution')">Net Katkı</th>
            <th class="rc-right" style="cursor: pointer" @click="toggleSort('utilizationRate')">Doluluk</th>
            <th class="rc-right">Kiralama</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in sortedRows"
            :key="row.vehicleId"
            style="cursor: pointer"
            @click="openDetail(row.vehicleId)"
          >
            <td>
              <div class="rcr-row__primary rcr-row__mono">{{ row.plateNumber }}</div>
              <div class="rcr-row__secondary">{{ row.brand }} {{ row.model }}</div>
            </td>
            <td>
              <div>{{ row.branchName ?? '—' }}</div>
              <div class="rcr-row__secondary">{{ row.categoryName ?? '—' }}</div>
            </td>
            <td class="rc-right rc-num">{{ formatMoneyList(row.revenue) }}</td>
            <td class="rc-right rc-num" style="font-size: 12.5px; color: var(--rc-text-muted)">
              {{ formatMoneyList([...row.maintenanceCost, ...row.damageCost, ...row.penaltyCost, ...row.tollCost, ...row.insuranceCost]) }}
            </td>
            <td class="rc-right rc-num">{{ formatMoneyList(row.netContribution) }}</td>
            <td class="rc-right">
              <span class="rcp-util" :class="utilizationClass(row.utilizationRate)">{{ row.utilizationRate.toFixed(1) }}%</span>
            </td>
            <td class="rc-right rc-num">{{ row.rentalCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ProfitabilityDetailModal
      v-if="selectedVehicleId"
      :open="detailOpen"
      :vehicle-id="selectedVehicleId"
      :from="dateRange.start"
      :to="dateRange.end"
      @close="closeDetail"
    />
  </div>
</template>

<style scoped>
.rcp-util {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
}
.rcp-util--high {
  background: var(--rc-success-bg, #e6f6ec);
  color: var(--rc-success, #1a7f37);
}
.rcp-util--mid {
  background: var(--rc-warning-bg, #fdf3e0);
  color: var(--rc-warning, #9a6700);
}
.rcp-util--low {
  background: var(--rc-danger-bg, #fbe9e9);
  color: var(--rc-danger, #c0392b);
}
</style>
