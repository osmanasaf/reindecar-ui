<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { kabisApi } from '@/api'
import { useToast } from '@/composables'
import KabisStatusBadge from '@/components/kabis/KabisStatusBadge.vue'
import { RcPageHeader, RcEmpty, RcBadge, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import {
  kabisTypeLabel,
  type KabisNotification,
  type KabisNotificationStats,
  type KabisNotificationStatus,
} from '@/types/kabis'

const router = useRouter()
const toast = useToast()

const notifications = ref<KabisNotification[]>([])
const loading = ref(true)
const totalCount = ref(0)
const currentPage = ref(0)
const pageSize = ref(20)
const statusFilter = ref<KabisNotificationStatus | ''>('')
const searchQuery = ref('')
const selected = ref<Set<number>>(new Set())
const retrying = ref(false)

/** Tüm sayfalar için statü bazlı toplamlar (özet panelini besler). */
const stats = ref<KabisNotificationStats>({ total: 0, pending: 0, sent: 0, acked: 0, failed: 0 })

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

type StatCard = {
  key: KabisNotificationStatus | ''
  label: string
  value: number
  dot: string
  valueColor: string
}

const statCards = computed<StatCard[]>(() => {
  const s = stats.value
  return [
    { key: '', label: 'Toplam', value: s.total, dot: 'var(--rc-text-faint)', valueColor: 'var(--rc-text)' },
    { key: 'PENDING', label: 'Bekliyor', value: s.pending, dot: 'var(--rc-warning-500)', valueColor: 'var(--rc-warning-700)' },
    { key: 'SENT', label: 'Gönderildi', value: s.sent, dot: 'var(--rc-success-500)', valueColor: 'var(--rc-success-700)' },
    { key: 'ACKED', label: 'Onaylandı', value: s.acked, dot: 'var(--rc-info-500)', valueColor: 'var(--rc-info-700)' },
    { key: 'FAILED', label: 'Başarısız', value: s.failed, dot: 'var(--rc-danger-500)', valueColor: 'var(--rc-danger-700)' },
  ]
})

const statusOptions: Array<{ value: KabisNotificationStatus | ''; label: string }> = [
  { value: '', label: 'Tümü' },
  { value: 'PENDING', label: 'Bekliyor' },
  { value: 'SENT', label: 'Gönderildi' },
  { value: 'ACKED', label: 'Onaylandı' },
  { value: 'FAILED', label: 'Başarısız' },
]

const typeVariant: Record<string, 'success' | 'info' | 'purple' | 'default'> = {
  DELIVERY: 'success',
  RETURN: 'info',
  UPDATE: 'purple',
  CANCEL: 'default',
}

/** Arama kutusuna girilen kiralama numarası (yalnızca rakam → sunucu tarafı filtre). */
const rentalIdFilter = computed<number | undefined>(() => {
  const q = searchQuery.value.trim()
  return /^\d+$/.test(q) ? Number(q) : undefined
})

const allVisibleSelected = computed(
  () => notifications.value.length > 0 && notifications.value.every((item) => selected.value.has(item.id)),
)
const selectedCount = computed(() => selected.value.size)
const selectedFailedCount = computed(
  () => notifications.value.filter((item) => selected.value.has(item.id) && item.status === 'FAILED').length,
)

async function loadNotifications() {
  loading.value = true
  try {
    const response = await kabisApi.list({
      page: currentPage.value,
      size: pageSize.value,
      status: statusFilter.value || undefined,
      rentalId: rentalIdFilter.value,
    })
    notifications.value = response.content
    totalCount.value = response.totalElements
    pruneSelection()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'KABİS bildirimleri yüklenemedi')
  } finally {
    loading.value = false
  }
}

/** Statü bazlı toplamları tek sorguda getirir (backend /stats ucu). */
async function loadStats() {
  try {
    stats.value = await kabisApi.stats()
  } catch {
    /* Özet paneli kritik değil — sessiz geç, liste yine çalışır. */
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 0
    selected.value = new Set()
    void loadNotifications()
  }, 300)
})

function pruneSelection() {
  const ids = new Set(notifications.value.map((item) => item.id))
  const next = new Set<number>()
  selected.value.forEach((id) => {
    if (ids.has(id)) next.add(id)
  })
  selected.value = next
}

function openDetail(id: number) {
  router.push({ name: 'kabis-notification-detail', params: { id } })
}

function applyFilter(value: KabisNotificationStatus | '') {
  statusFilter.value = value
  currentPage.value = 0
  selected.value = new Set()
  void loadNotifications()
}

function handlePageChange(page: number) {
  currentPage.value = page
  void loadNotifications()
}

function toggleRow(id: number) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleAll() {
  if (allVisibleSelected.value) {
    selected.value = new Set()
  } else {
    selected.value = new Set(notifications.value.map((item) => item.id))
  }
}

function clearSelection() {
  selected.value = new Set()
}

async function retrySelected() {
  const ids = notifications.value
    .filter((item) => selected.value.has(item.id) && item.status === 'FAILED')
    .map((item) => item.id)
  if (ids.length === 0) return
  retrying.value = true
  try {
    const result = await kabisApi.retryMany(ids)
    toast.success(`${result.retried} bildirim yeniden kuyruğa alındı`)
    selected.value = new Set()
    await Promise.all([loadNotifications(), loadStats()])
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Yeniden gönderim başarısız')
  } finally {
    retrying.value = false
  }
}

onMounted(() => {
  void loadNotifications()
  void loadStats()
})
</script>

<template>
  <div class="rc-page">
    <RcPageHeader
      title="KABİS Bildirimleri"
      subtitle="EGM kiralık araç bildirim sistemi · aktivasyon, iade ve iptalde otomatik oluşturulur"
    />

    <div class="rc-alert rc-alert--warning" style="margin-bottom: 16px">
      <RcIcon name="clock" :size="16" />
      <div>
        <div class="rc-alert__title">EGM entegrasyonu aktifleştirilmedi — kayıtlar kuyrukta bekliyor</div>
        <span>
          Entegrasyon açılana kadar dışarıya gönderim yapılmaz; başarısız kayıtlar açıldığında
          otomatik yeniden denenir.
        </span>
      </div>
    </div>

    <!-- Özet paneli -->
    <div class="kn-stats">
      <button
        v-for="card in statCards"
        :key="card.key || 'all'"
        type="button"
        class="kn-stat"
        :class="{ 'kn-stat--on': statusFilter === card.key }"
        @click="applyFilter(card.key)"
      >
        <span class="kn-stat__label">
          <span class="kn-stat__dot" :style="{ background: card.dot }" />
          {{ card.label }}
        </span>
        <span class="kn-stat__value rc-num" :style="{ color: card.valueColor }">{{ card.value }}</span>
      </button>
    </div>

    <!-- Filtre + arama -->
    <div class="kn-toolbar">
      <div class="kn-chips">
        <button
          v-for="option in statusOptions"
          :key="option.value || 'all'"
          type="button"
          class="kn-chip"
          :class="{ 'kn-chip--on': statusFilter === option.value }"
          @click="applyFilter(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="kn-search">
        <RcIcon name="search" :size="15" class="kn-search__icon" />
        <input v-model="searchQuery" class="kn-search__input" inputmode="numeric" placeholder="Kiralama no (ID) ile ara…" />
      </div>
    </div>

    <!-- Bulk bar -->
    <div v-if="selectedCount > 0" class="kn-bulk rc-animate-in">
      <span class="kn-bulk__count">{{ selectedCount }} bildirim seçili</span>
      <span class="kn-bulk__hint">· {{ selectedFailedCount }} başarısız yeniden gönderilebilir</span>
      <div class="kn-bulk__actions">
        <button type="button" class="kn-bulk__ghost" @click="clearSelection">Temizle</button>
        <button
          type="button"
          class="kn-bulk__solid"
          :disabled="selectedFailedCount === 0 || retrying"
          @click="retrySelected"
        >
          <RcIcon name="refresh" :size="14" :stroke-width="1.8" />
          Yeniden gönder
        </button>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="6" />

    <RcEmpty
      v-else-if="notifications.length === 0"
      title="Bildirim kaydı yok"
      description="Kiralama aktivasyonu veya iade sırasında KABİS bildirimleri burada görünür"
    >
      <template #icon><RcIcon name="shield" :size="32" /></template>
    </RcEmpty>

    <div v-else class="kn-table rc-animate-in">
      <div class="kn-row kn-row--head">
        <button type="button" class="kn-check" :class="{ 'kn-check--on': allVisibleSelected }" @click="toggleAll">
          <RcIcon v-if="allVisibleSelected" name="check" :size="12" :stroke-width="3" />
        </button>
        <span>Bildirim</span>
        <span>Durum</span>
        <span>Deneme</span>
        <span>Son hata</span>
        <span>Oluşturulma</span>
      </div>

      <div
        v-for="item in notifications"
        :key="item.id"
        class="kn-row kn-row--body"
        :class="{ 'kn-row--selected': selected.has(item.id) }"
        @click="openDetail(item.id)"
      >
        <button
          type="button"
          class="kn-check"
          :class="{ 'kn-check--on': selected.has(item.id) }"
          @click.stop="toggleRow(item.id)"
        >
          <RcIcon v-if="selected.has(item.id)" name="check" :size="12" :stroke-width="3" />
        </button>
        <div class="kn-cell-notif">
          <RcBadge :variant="typeVariant[item.notificationType] ?? 'default'">
            {{ kabisTypeLabel(item.notificationType) }}
          </RcBadge>
          <span class="kn-rental rc-mono">#{{ item.rentalId }}</span>
        </div>
        <div><KabisStatusBadge :status="item.status" /></div>
        <span class="kn-attempts rc-num">{{ item.attemptCount }}</span>
        <span class="kn-error" :class="{ 'kn-error--has': item.lastError }">{{ item.lastError || '—' }}</span>
        <span class="kn-created rc-mono">{{ formatDateTime(item.createdAt) }}</span>
      </div>
    </div>

    <div v-if="!loading && totalPages > 1" class="rca-pagination">
      <button
        type="button"
        class="kn-page-btn"
        :disabled="currentPage === 0"
        @click="handlePageChange(currentPage - 1)"
      >
        Önceki
      </button>
      <span style="font-size: 13px; color: var(--rc-text-muted)">Sayfa {{ currentPage + 1 }} / {{ totalPages }}</span>
      <button
        type="button"
        class="kn-page-btn"
        :disabled="currentPage >= totalPages - 1"
        @click="handlePageChange(currentPage + 1)"
      >
        Sonraki
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Özet paneli */
.kn-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.kn-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  background: var(--rc-surface);
  border: 1.5px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-12);
  padding: 13px 15px;
  box-shadow: var(--rc-shadow-sm);
  transition: border-color var(--rc-dur-fast) var(--rc-ease-out),
              box-shadow var(--rc-dur-fast) var(--rc-ease-out);
}
.kn-stat:hover {
  border-color: var(--rc-border-strong);
  box-shadow: var(--rc-shadow-md);
}
.kn-stat--on {
  border-color: var(--rc-accent);
}
.kn-stat__label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 500;
  color: var(--rc-text-muted);
}
.kn-stat__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--rc-r-full);
  flex-shrink: 0;
}
.kn-stat__value {
  font-family: var(--rc-font-mono);
  font-size: 24px;
  font-weight: 600;
  margin-top: 6px;
}

/* Toolbar */
.kn-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.kn-chips {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-10);
  box-shadow: var(--rc-shadow-sm);
}
.kn-chip {
  height: 28px;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: var(--rc-r-6);
  color: var(--rc-text-muted);
  background: transparent;
  transition: color var(--rc-dur-fast), background var(--rc-dur-fast);
}
.kn-chip:hover {
  color: var(--rc-text);
}
.kn-chip--on {
  color: var(--rc-text-inverse);
  background: var(--rc-text);
}
.kn-search {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 320px;
}
.kn-search__icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--rc-text-faint);
}
.kn-search__input {
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-8);
  font-size: 13px;
  outline: none;
  box-shadow: var(--rc-shadow-sm);
  transition: border-color var(--rc-dur-base), box-shadow var(--rc-dur-base);
}
.kn-search__input:focus {
  border-color: var(--rc-accent);
  box-shadow: var(--rc-focus-ring);
}

/* Bulk bar */
.kn-bulk {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: var(--rc-r-10);
  background: var(--rc-text);
  color: var(--rc-text-inverse);
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.kn-bulk__count { font-size: 13px; font-weight: 500; }
.kn-bulk__hint { font-size: 12px; opacity: 0.7; }
.kn-bulk__actions { margin-left: auto; display: flex; gap: 8px; }
.kn-bulk__ghost {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--rc-r-6);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--rc-text-inverse);
  background: rgba(255, 255, 255, 0.14);
}
.kn-bulk__ghost:hover { background: rgba(255, 255, 255, 0.22); }
.kn-bulk__solid {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 14px;
  border-radius: var(--rc-r-6);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--rc-text);
  background: var(--rc-surface);
}
.kn-bulk__solid:disabled { opacity: 0.5; cursor: not-allowed; }

/* Tablo (grid satırlar) */
.kn-table {
  background: var(--rc-surface);
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-12);
  box-shadow: var(--rc-shadow-sm);
  overflow: hidden;
}
.kn-row {
  display: grid;
  grid-template-columns: 44px minmax(150px, 1fr) 128px 90px minmax(150px, 1.3fr) 150px;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--rc-border-subtle);
}
.kn-row--head {
  background: var(--rc-surface-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--rc-tracking-wide);
  text-transform: uppercase;
  color: var(--rc-text-faint);
}
.kn-row--body {
  cursor: pointer;
  transition: background var(--rc-dur-fast);
}
.kn-row--body:hover { background: var(--rc-surface-hover); }
.kn-row--body:last-child { border-bottom: none; }
.kn-row--selected { background: var(--rc-accent-subtle); }

.kn-check {
  width: 18px;
  height: 18px;
  border-radius: var(--rc-r-4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border: 1.5px solid var(--rc-border-strong);
  background: transparent;
  transition: background var(--rc-dur-fast), border-color var(--rc-dur-fast);
}
.kn-check--on {
  border-color: var(--rc-accent);
  background: var(--rc-accent);
}

.kn-cell-notif {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}
.kn-rental { font-size: 12px; color: var(--rc-text-muted); }
.kn-attempts { font-size: 13px; color: var(--rc-text-soft); }
.kn-error {
  font-size: 12.5px;
  color: var(--rc-text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kn-error--has { color: var(--rc-danger-700); }
.kn-created { font-size: 12px; color: var(--rc-text-muted); }

.kn-empty-inline {
  padding: 40px;
  text-align: center;
  color: var(--rc-text-muted);
  font-size: 13.5px;
}

.kn-page-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--rc-r-8);
  font-size: 13px;
  font-weight: 500;
  color: var(--rc-text-soft);
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
}
.kn-page-btn:hover:not(:disabled) { background: var(--rc-surface-hover); }
.kn-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 720px) {
  .kn-row {
    grid-template-columns: 36px 1fr auto;
  }
  .kn-row > :nth-child(4),
  .kn-row > :nth-child(5),
  .kn-row > :nth-child(6) {
    display: none;
  }
}
</style>
