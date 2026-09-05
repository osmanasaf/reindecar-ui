<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RcPageHeader, RcEmpty, RcSkeletonText } from '@/components/rc'
import { internalFleetApi, vehiclesApi, type AssignmentRow } from '@/api'
import { useToast } from '@/composables'

interface KmRow {
    vehicleId: number
    plateNumber: string
    vehicleName: string
    driverName: string | null
    currentKm: number | null
    lastReadingDate: string | null
    input: number | null
}

const toast = useToast()
const rows = ref<KmRow[]>([])
const loading = ref(true)
const saving = ref(false)

const STALE_AFTER_DAYS = 30

function monthsSince(date: string | null): number | null {
    if (!date) return null
    const diff = Date.now() - new Date(date).getTime()
    return Math.floor(diff / (86_400_000 * 30))
}

function isStale(row: KmRow): boolean {
    if (!row.lastReadingDate) return true
    const days = (Date.now() - new Date(row.lastReadingDate).getTime()) / 86_400_000
    return days > STALE_AFTER_DAYS
}

function staleLabel(row: KmRow): string {
    if (!row.lastReadingDate) return 'Hiç girilmedi'
    const months = monthsSince(row.lastReadingDate)
    return months && months >= 1 ? `${months} aydır girilmedi` : 'Güncel'
}

const staleCount = computed(() => rows.value.filter(isStale).length)
const filledCount = computed(() => rows.value.filter((row) => row.input !== null && row.input !== undefined).length)

const pageSubtitle = computed(() => {
    if (loading.value) return 'Yükleniyor…'
    return `${rows.value.length} zimmetli araç · ${staleCount.value} bekleyen bildirim`
})

function formatDate(date: string | null): string {
    return date ? new Date(date).toLocaleDateString('tr-TR') : '—'
}

function formatKm(km: number | null): string {
    return km === null ? '—' : `${km.toLocaleString('tr-TR')} km`
}

async function fetchRows() {
    loading.value = true
    try {
        const assignments: AssignmentRow[] = await internalFleetApi.listAssignments()
        rows.value = assignments.map((assignment) => ({
            vehicleId: assignment.vehicleId,
            plateNumber: assignment.plateNumber ?? '—',
            vehicleName: assignment.vehicleName ?? '—',
            driverName: assignment.driverName,
            currentKm: assignment.vehicleCurrentKm,
            lastReadingDate: assignment.lastKmReadingDate,
            input: null,
        }))
    } catch (error: unknown) {
        const err = error as { message?: string }
        toast.error(err.message || 'Araç listesi yüklenemedi')
    } finally {
        loading.value = false
    }
}

async function submitReadings() {
    const readings = rows.value
        .filter((row) => row.input !== null && row.input !== undefined)
        .map((row) => ({ vehicleId: row.vehicleId, km: row.input as number }))

    if (readings.length === 0) {
        toast.error('En az bir araç için kilometre girin')
        return
    }

    saving.value = true
    try {
        const result = await vehiclesApi.recordBulkKmReadings({ readings })
        if (result.applied.length > 0) {
            toast.success(`${result.applied.length} araç için kilometre kaydedildi`)
        }
        for (const rejected of result.rejected) {
            const row = rows.value.find((candidate) => candidate.vehicleId === rejected.vehicleId)
            toast.error(`${row?.plateNumber ?? rejected.vehicleId}: ${rejected.reason}`)
        }
        await fetchRows()
    } catch (error: unknown) {
        const err = error as { message?: string }
        toast.error(err.message || 'Kilometre bildirimi kaydedilemedi')
    } finally {
        saving.value = false
    }
}

onMounted(fetchRows)
</script>

<template>
  <div class="rc-page">
    <RcPageHeader title="Kilometre Bildirimi" :subtitle="pageSubtitle">
      <template #actions>
        <button
          type="button"
          class="rc-btn rc-btn--accent"
          :disabled="saving || filledCount === 0"
          @click="submitReadings"
        >
          {{ saving ? 'Kaydediliyor…' : `Kaydet (${filledCount})` }}
        </button>
      </template>
    </RcPageHeader>

    <div v-if="loading" class="rckm-loading">
      <RcSkeletonText :lines="6" />
    </div>

    <RcEmpty
      v-else-if="rows.length === 0"
      title="Zimmetli araç yok"
      description="Kilometre bildirimi yalnızca aktif zimmetli araçlar için yapılır."
    />

    <div v-else class="rckm-table-wrap">
      <table class="rckm-table">
        <thead>
          <tr>
            <th>Araç</th>
            <th>Kullanan</th>
            <th>Son bilinen KM</th>
            <th>Son bildirim</th>
            <th>Yeni KM</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.vehicleId" :class="{ 'rckm-row--stale': isStale(row) }">
            <td>
              <strong>{{ row.plateNumber }}</strong>
              <small class="rckm-muted">{{ row.vehicleName }}</small>
            </td>
            <td>{{ row.driverName ?? '—' }}</td>
            <td>{{ formatKm(row.currentKm) }}</td>
            <td>
              {{ formatDate(row.lastReadingDate) }}
              <small class="rckm-muted" :class="{ 'rckm-warn': isStale(row) }">{{ staleLabel(row) }}</small>
            </td>
            <td>
              <input
                v-model.number="row.input"
                class="rc-input rc-num rckm-input"
                type="number"
                min="0"
                step="1"
                :placeholder="row.currentKm !== null ? String(row.currentKm) : '0'"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.rckm-loading {
  padding: 24px 0;
}

.rckm-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-lg, 12px);
}

.rckm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.rckm-table th,
.rckm-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid var(--rc-border);
  vertical-align: middle;
}

.rckm-table th {
  color: var(--rc-text-muted);
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
}

.rckm-table tbody tr:last-child td {
  border-bottom: none;
}

.rckm-row--stale td {
  background: var(--rc-surface-2, transparent);
}

.rckm-muted {
  display: block;
  margin-top: 2px;
  color: var(--rc-text-muted);
  font-size: 12px;
}

.rckm-warn {
  color: var(--rc-warning-500, var(--rc-danger-500));
}

.rckm-input {
  width: 140px;
}
</style>
