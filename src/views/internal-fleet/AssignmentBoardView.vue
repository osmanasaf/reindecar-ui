<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { RcPageHeader, RcEmpty, RcSkeletonText } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { internalFleetApi, type AssignmentRow } from '@/api'
import { useToast, useTerminology } from '@/composables'
import { downloadBlob } from '@/utils/download'

type QuickFilter = 'all' | 'maintenance' | 'documents' | 'penalties'

const toast = useToast()
const { terms } = useTerminology()

const rows = ref<AssignmentRow[]>([])
const loading = ref(true)
const search = ref('')
const branchFilter = ref<number | 'all'>('all')
const quickFilter = ref<QuickFilter>('all')

const DOCUMENT_WARNING_DAYS = 30

function daysUntil(date: string | null): number | null {
    if (!date) return null
    const target = new Date(date).getTime()
    const today = new Date().setHours(0, 0, 0, 0)
    return Math.round((target - today) / 86_400_000)
}

function hasMaintenanceAttention(row: AssignmentRow): boolean {
    return row.maintenanceStatus === 'DUE' || row.maintenanceStatus === 'OVERDUE'
}

function hasDocumentAttention(row: AssignmentRow): boolean {
    return [row.inspectionExpiryDate, row.insuranceExpiryDate, row.driverLicenseExpiryDate].some((date) => {
        const remaining = daysUntil(date)
        return remaining !== null && remaining <= DOCUMENT_WARNING_DAYS
    })
}

const branches = computed(() => {
    const seen = new Map<number, string>()
    for (const row of rows.value) {
        if (row.branchId !== null && row.branchName) {
            seen.set(row.branchId, row.branchName)
        }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
})

const filteredRows = computed(() => {
    const needle = search.value.trim().toLocaleLowerCase('tr')
    return rows.value.filter((row) => {
        if (branchFilter.value !== 'all' && row.branchId !== branchFilter.value) return false
        if (quickFilter.value === 'maintenance' && !hasMaintenanceAttention(row)) return false
        if (quickFilter.value === 'documents' && !hasDocumentAttention(row)) return false
        if (quickFilter.value === 'penalties' && row.openPenaltyCount === 0) return false
        if (!needle) return true
        return [row.driverName, row.plateNumber, row.vehicleName, row.rentalNumber, row.branchName]
            .some((field) => field?.toLocaleLowerCase('tr').includes(needle))
    })
})

const quickFilters = computed(() => [
    { id: 'all' as QuickFilter, label: 'Hepsi', count: rows.value.length },
    { id: 'maintenance' as QuickFilter, label: 'Bakımı yaklaşan', count: rows.value.filter(hasMaintenanceAttention).length },
    { id: 'documents' as QuickFilter, label: 'Belgesi dolan', count: rows.value.filter(hasDocumentAttention).length },
    { id: 'penalties' as QuickFilter, label: 'Açık cezası olan', count: rows.value.filter((row) => row.openPenaltyCount > 0).length },
])

const pageSubtitle = computed(() =>
    loading.value ? 'Yükleniyor…' : `${rows.value.length} aktif ${terms.value.rental.toLocaleLowerCase('tr')}`,
)

function formatDate(date: string | null): string {
    return date ? new Date(date).toLocaleDateString('tr-TR') : '—'
}

function formatKm(km: number | null): string {
    return km === null ? '—' : `${km.toLocaleString('tr-TR')} km`
}

function assignedLabel(row: AssignmentRow): string {
    return row.openEnded ? `${row.assignedDays} gün (süresiz)` : `${row.assignedDays} gün`
}

async function fetchAssignments() {
    loading.value = true
    try {
        rows.value = await internalFleetApi.listAssignments()
    } catch (error: unknown) {
        const err = error as { message?: string }
        toast.error(err.message || 'Zimmet panosu yüklenemedi')
    } finally {
        loading.value = false
    }
}

function exportCsv() {
    const header = [
        terms.value.customer, 'Telefon', 'Plaka', 'Araç', terms.value.branch,
        'Zimmet başlangıcı', 'Süre (gün)', 'Son KM', 'Bakım durumu',
        'Sonraki bakım', 'Muayene bitiş', 'Sigorta bitiş', 'Ehliyet bitiş', 'Açık ceza',
    ]
    const lines = filteredRows.value.map((row) => [
        row.driverName ?? '', row.driverPhone ?? '', row.plateNumber ?? '', row.vehicleName ?? '',
        row.branchName ?? '', row.assignedSince, String(row.assignedDays),
        row.vehicleCurrentKm === null ? '' : String(row.vehicleCurrentKm),
        row.maintenanceStatus ?? '', row.nextMaintenanceDate ?? '',
        row.inspectionExpiryDate ?? '', row.insuranceExpiryDate ?? '',
        row.driverLicenseExpiryDate ?? '', String(row.openPenaltyCount),
    ])
    const csv = [header, ...lines]
        .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n')
    downloadBlob(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }), 'zimmet-panosu.csv')
}

onMounted(fetchAssignments)
</script>

<template>
  <div class="rc-page">
    <RcPageHeader title="Zimmet Panosu" :subtitle="pageSubtitle">
      <template #actions>
        <button type="button" class="rc-btn rc-btn--secondary" :disabled="loading || rows.length === 0" @click="exportCsv">
          <RcIcon name="download" :size="14" />
          CSV indir
        </button>
        <button type="button" class="rc-btn rc-btn--secondary" :disabled="loading" @click="fetchAssignments">
          Yenile
        </button>
      </template>
    </RcPageHeader>

    <div class="rcif-toolbar">
      <input
        v-model="search"
        class="rc-input rcif-toolbar__search"
        type="search"
        :placeholder="`${terms.customer}, plaka veya araç ara…`"
      />
      <select v-model="branchFilter" class="rc-input rcif-toolbar__branch">
        <option value="all">Tüm {{ terms.branchPlural.toLocaleLowerCase('tr') }}</option>
        <option v-for="branch in branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
      </select>
      <div class="rcif-chips">
        <button
          v-for="filter in quickFilters"
          :key="filter.id"
          type="button"
          class="rcif-chip"
          :class="{ 'rcif-chip--active': quickFilter === filter.id }"
          @click="quickFilter = filter.id"
        >
          {{ filter.label }}
          <span class="rcif-chip__count">{{ filter.count }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="rcif-loading">
      <RcSkeletonText :lines="6" />
    </div>

    <RcEmpty
      v-else-if="rows.length === 0"
      title="Aktif zimmet yok"
      description="Şirket içi olarak işaretlenmiş bir çalışana araç zimmetlendiğinde burada listelenir."
    />

    <RcEmpty
      v-else-if="filteredRows.length === 0"
      title="Eşleşen kayıt yok"
      description="Arama veya filtre kriterlerini değiştirip tekrar deneyin."
    />

    <div v-else class="rcif-table-wrap">
      <table class="rcif-table">
        <thead>
          <tr>
            <th>{{ terms.customer }}</th>
            <th>Araç</th>
            <th>{{ terms.branch }}</th>
            <th>Süre</th>
            <th>Son KM</th>
            <th>Son bildirim</th>
            <th>Bakım</th>
            <th>Belgeler</th>
            <th>Ceza</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.rentalId">
            <td>
              <RouterLink :to="{ name: 'rental-detail', params: { id: row.rentalId } }" class="rcif-link">
                {{ row.driverName ?? '—' }}
              </RouterLink>
              <small class="rcif-muted">{{ row.driverPhone ?? row.rentalNumber }}</small>
            </td>
            <td>
              <RouterLink :to="{ name: 'vehicle-detail', params: { id: row.vehicleId } }" class="rcif-link">
                {{ row.plateNumber ?? '—' }}
              </RouterLink>
              <small class="rcif-muted">{{ row.vehicleName ?? '—' }}</small>
            </td>
            <td>{{ row.branchName ?? '—' }}</td>
            <td>
              {{ assignedLabel(row) }}
              <small class="rcif-muted">{{ formatDate(row.assignedSince) }}</small>
            </td>
            <td>{{ formatKm(row.vehicleCurrentKm) }}</td>
            <td>
              <span :class="{ 'rcif-badge': true, 'rcif-badge--warn': !row.lastKmReadingDate }">
                {{ formatDate(row.lastKmReadingDate) }}
              </span>
            </td>
            <td>
              <span v-if="row.maintenanceStatus" class="rcif-badge" :class="{ 'rcif-badge--warn': hasMaintenanceAttention(row) }">
                {{ row.maintenanceStatus }}
              </span>
              <span v-else>—</span>
              <small class="rcif-muted">{{ formatDate(row.nextMaintenanceDate) }}</small>
            </td>
            <td>
              <span class="rcif-badge" :class="{ 'rcif-badge--warn': hasDocumentAttention(row) }">
                {{ hasDocumentAttention(row) ? 'Dikkat' : 'Geçerli' }}
              </span>
              <small class="rcif-muted">Muayene {{ formatDate(row.inspectionExpiryDate) }}</small>
            </td>
            <td>
              <span class="rcif-badge" :class="{ 'rcif-badge--warn': row.openPenaltyCount > 0 }">
                {{ row.openPenaltyCount }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.rcif-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.rcif-toolbar__search {
  flex: 1 1 260px;
  min-width: 200px;
}

.rcif-toolbar__branch {
  flex: 0 1 200px;
}

.rcif-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rcif-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--rc-border);
  border-radius: 999px;
  background: var(--rc-surface);
  color: var(--rc-text-muted);
  font-size: 13px;
  cursor: pointer;
}

.rcif-chip--active {
  border-color: var(--rc-accent);
  color: var(--rc-text);
}

.rcif-chip__count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.rcif-loading {
  padding: 24px 0;
}

.rcif-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-lg, 12px);
}

.rcif-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.rcif-table th,
.rcif-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid var(--rc-border);
  vertical-align: top;
}

.rcif-table th {
  color: var(--rc-text-muted);
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
}

.rcif-table tbody tr:last-child td {
  border-bottom: none;
}

.rcif-link {
  color: var(--rc-text);
  font-weight: 600;
  text-decoration: none;
}

.rcif-link:hover {
  text-decoration: underline;
}

.rcif-muted {
  display: block;
  margin-top: 2px;
  color: var(--rc-text-muted);
  font-size: 12px;
}

.rcif-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--rc-surface-2, var(--rc-surface));
  border: 1px solid var(--rc-border);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.rcif-badge--warn {
  border-color: var(--rc-warning-500, var(--rc-danger-500));
  color: var(--rc-warning-500, var(--rc-danger-500));
}
</style>
