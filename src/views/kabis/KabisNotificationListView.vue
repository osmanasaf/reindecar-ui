<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { kabisApi } from '@/api'
import { useToast } from '@/composables'
import KabisStatusBadge from '@/components/kabis/KabisStatusBadge.vue'
import { RcPageHeader, RcButton, RcEmpty, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import { kabisTypeLabel, type KabisNotification, type KabisNotificationStatus } from '@/types/kabis'

const router = useRouter()
const toast = useToast()

const notifications = ref<KabisNotification[]>([])
const loading = ref(true)
const totalCount = ref(0)
const currentPage = ref(0)
const pageSize = ref(20)
const statusFilter = ref<KabisNotificationStatus | ''>('')

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const failedCount = computed(() => notifications.value.filter((item) => item.status === 'FAILED').length)

const statusOptions: Array<{ value: KabisNotificationStatus | ''; label: string }> = [
  { value: '', label: 'Tümü' },
  { value: 'PENDING', label: 'Bekliyor' },
  { value: 'SENT', label: 'Gönderildi' },
  { value: 'ACKED', label: 'Onaylandı' },
  { value: 'FAILED', label: 'Başarısız' },
]

async function loadNotifications() {
  loading.value = true
  try {
    const response = await kabisApi.list({
      page: currentPage.value,
      size: pageSize.value,
      status: statusFilter.value || undefined,
    })
    notifications.value = response.content
    totalCount.value = response.totalElements
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'KABİS bildirimleri yüklenemedi')
  } finally {
    loading.value = false
  }
}

function openDetail(id: number) {
  router.push({ name: 'kabis-notification-detail', params: { id } })
}

function handleFilterChange(value: KabisNotificationStatus | '') {
  statusFilter.value = value
  currentPage.value = 0
  void loadNotifications()
}

function handlePageChange(page: number) {
  currentPage.value = page
  void loadNotifications()
}

onMounted(() => {
  void loadNotifications()
})
</script>

<template>
  <div class="rc-page">
    <RcPageHeader
      title="KABİS Bildirimleri"
      subtitle="EGM kiralık araç bildirim sistemi kayıtları"
    />

    <div class="rc-alert rc-alert--info" style="margin-bottom: 16px">
      <RcIcon name="info" :size="16" />
      <div>
        <div class="rc-alert__title">Bildirimler otomatik oluşturulur ve kuyruğa alınır</div>
        <span>
          Kiralama aktivasyonu, uzatma, iade ve iptal işlemlerinde KABİS kaydı otomatik açılır.
          EGM entegrasyonu aktifleştirilene kadar dışarıya gönderim yapılmaz; kayıtlar bu süreçte
          "Başarısız" durumda görünebilir.
        </span>
      </div>
    </div>

    <div class="rca-stats rca-stats--payables">
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam kayıt</div>
        <div class="rca-stat__value rc-num">{{ totalCount }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Başarısız (sayfa)</div>
        <div class="rca-stat__value rca-stat__value--danger rc-num">{{ failedCount }}</div>
      </div>
    </div>

    <div class="rc-filterbar rcv-filterbar--slim">
      <button
        v-for="option in statusOptions"
        :key="option.value || 'all'"
        type="button"
        class="rc-chip"
        :class="{ 'rc-chip--on': statusFilter === option.value }"
        @click="handleFilterChange(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="6" />

    <RcEmpty
      v-else-if="notifications.length === 0"
      title="Bildirim kaydı yok"
      description="Kiralama aktivasyonu veya iade sırasında KABİS bildirimleri burada görünür"
    >
      <template #icon><RcIcon name="shield" :size="32" /></template>
    </RcEmpty>

    <div v-else class="rc-card rc-animate-in" style="overflow: hidden">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th>Tip</th>
            <th>Kiralama</th>
            <th>Durum</th>
            <th>Deneme</th>
            <th>Son hata</th>
            <th>Oluşturulma</th>
          </tr>
        </thead>
        <tbody class="rc-stagger">
          <tr
            v-for="item in notifications"
            :key="item.id"
            style="cursor: pointer"
            @click="openDetail(item.id)"
          >
            <td>{{ kabisTypeLabel(item.notificationType) }}</td>
            <td class="rcr-row__mono">#{{ item.rentalId }}</td>
            <td><KabisStatusBadge :status="item.status" /></td>
            <td class="rc-num">{{ item.attemptCount }}</td>
            <td>
              <span class="rcr-row__secondary" style="max-width: 220px; display: inline-block">
                {{ item.lastError || '—' }}
              </span>
            </td>
            <td class="rc-mono" style="font-size: 12.5px">{{ formatDateTime(item.createdAt) }}</td>
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
