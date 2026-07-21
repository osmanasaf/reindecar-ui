<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { kabisApi } from '@/api'
import { useToast } from '@/composables'
import KabisStatusBadge from '@/components/kabis/KabisStatusBadge.vue'
import { RcButton, RcDetailSkeleton } from '@/components/rc'
import { RcIcon, type IconName } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import { kabisTypeLabel, type KabisNotification } from '@/types/kabis'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const notification = ref<KabisNotification | null>(null)
const loading = ref(true)
const retrying = ref(false)

const notificationId = computed(() => Number(route.params.id))

type TimelineStep = {
  key: string
  tone: 'success' | 'danger' | 'warning'
  icon: IconName
  title: string
  time: string
  note?: string
  pulse?: boolean
  line: boolean
}

const timeline = computed<TimelineStep[]>(() => {
  const n = notification.value
  if (!n) return []
  const steps: TimelineStep[] = []
  const hasAttempt = n.attemptCount > 0

  steps.push({
    key: 'created',
    tone: 'success',
    icon: 'check',
    title: 'Bildirim oluşturuldu',
    time: formatDateTime(n.createdAt),
    line: hasAttempt || n.status !== 'PENDING',
  })

  if (hasAttempt) {
    const failed = n.status === 'FAILED'
    steps.push({
      key: 'attempt',
      tone: failed ? 'danger' : 'success',
      icon: failed ? 'close' : 'send',
      title: `${n.attemptCount}. gönderim denemesi`,
      time: n.lastAttemptAt ? formatDateTime(n.lastAttemptAt) : '—',
      note: failed ? n.lastError ?? undefined : undefined,
      line: true,
    })
  }

  if (n.status === 'SENT' || n.status === 'ACKED') {
    steps.push({
      key: 'done',
      tone: 'success',
      icon: 'check',
      title: n.status === 'ACKED' ? 'EGM tarafından onaylandı' : "EGM'e gönderildi",
      time: n.sentAt ? formatDateTime(n.sentAt) : '—',
      line: false,
    })
  } else if (n.status === 'PENDING') {
    steps.push({
      key: 'queued',
      tone: 'warning',
      icon: 'clock',
      title: 'Gönderim kuyruğunda bekliyor',
      time: 'Zamanlayıcı işleyecek',
      pulse: true,
      line: false,
    })
  } else {
    steps.push({
      key: 'failed',
      tone: 'danger',
      icon: 'warning',
      title: 'Gönderim başarısız — yeniden denenecek',
      time: n.lastAttemptAt ? formatDateTime(n.lastAttemptAt) : '—',
      line: false,
    })
  }

  return steps
})

async function loadNotification() {
  loading.value = true
  try {
    notification.value = await kabisApi.getById(notificationId.value)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Bildirim yüklenemedi')
    router.push({ name: 'kabis-notifications' })
  } finally {
    loading.value = false
  }
}

async function handleRetry() {
  if (!notification.value) return
  retrying.value = true
  try {
    notification.value = await kabisApi.retry(notification.value.id)
    toast.success('Bildirim yeniden kuyruğa alındı')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Yeniden gönderim başarısız')
  } finally {
    retrying.value = false
  }
}

onMounted(() => {
  void loadNotification()
})
</script>

<template>
  <div class="rc-page">
    <div class="rc-page__toolbar">
      <RcButton variant="secondary" @click="router.push({ name: 'kabis-notifications' })">
        <RcIcon name="chevronLeft" :size="14" />
        Listeye dön
      </RcButton>
      <RcButton
        v-if="notification?.status === 'FAILED'"
        variant="primary"
        :loading="retrying"
        @click="handleRetry"
      >
        <RcIcon name="refresh" :size="14" :stroke-width="1.8" />
        Yeniden gönder
      </RcButton>
    </div>

    <RcDetailSkeleton v-if="loading" />

    <div v-else-if="notification" class="kd-card rc-animate-in">
      <div class="kd-head">
        <span class="kd-head__icon"><RcIcon name="shield" :size="20" /></span>
        <div class="kd-head__text">
          <h1 class="kd-head__title">{{ kabisTypeLabel(notification.notificationType) }} bildirimi</h1>
          <div class="kd-head__sub rc-mono">Bildirim #{{ notification.id }} · #{{ notification.rentalId }}</div>
        </div>
        <KabisStatusBadge :status="notification.status" />
      </div>

      <div class="kd-body">
        <!-- Zaman çizelgesi -->
        <div class="kd-timeline">
          <div class="kd-section-label">Gönderim akışı</div>
          <div class="kd-steps">
            <div v-for="step in timeline" :key="step.key" class="kd-step">
              <div class="kd-step__rail">
                <span class="kd-dot" :class="`kd-dot--${step.tone}`">
                  <RcIcon :name="step.icon" :size="13" :stroke-width="2" />
                  <span v-if="step.pulse" class="kd-dot__pulse rc-pulse" />
                </span>
                <span v-if="step.line" class="kd-line" />
              </div>
              <div class="kd-step__body">
                <div class="kd-step__title">{{ step.title }}</div>
                <div class="kd-step__time rc-mono">{{ step.time }}</div>
                <div v-if="step.note" class="kd-step__note">{{ step.note }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Meta -->
        <div class="kd-meta">
          <div class="kd-meta__row">
            <span class="kd-meta__label">Kiralama</span>
            <button
              type="button"
              class="kd-link"
              @click="router.push({ name: 'rental-detail', params: { id: notification.rentalId } })"
            >
              #{{ notification.rentalId }}
            </button>
          </div>
          <div class="kd-meta__row">
            <span class="kd-meta__label">EGM referans</span>
            <span class="kd-meta__value rc-mono">{{ notification.egmReferenceNumber || '—' }}</span>
          </div>
          <div class="kd-meta__row">
            <span class="kd-meta__label">Deneme sayısı</span>
            <span class="kd-meta__value rc-num">{{ notification.attemptCount }}</span>
          </div>
          <div class="kd-meta__row">
            <span class="kd-meta__label">Oluşturulma</span>
            <span class="kd-meta__value">{{ formatDateTime(notification.createdAt) }}</span>
          </div>
          <div class="kd-meta__row">
            <span class="kd-meta__label">Son deneme</span>
            <span class="kd-meta__value">{{ notification.lastAttemptAt ? formatDateTime(notification.lastAttemptAt) : '—' }}</span>
          </div>
          <div class="kd-meta__row">
            <span class="kd-meta__label">Gönderim</span>
            <span class="kd-meta__value">{{ notification.sentAt ? formatDateTime(notification.sentAt) : '—' }}</span>
          </div>
        </div>
      </div>

      <div v-if="notification.lastError" class="rc-alert rc-alert--danger" style="margin: 0 24px 24px">
        <RcIcon name="warning" :size="16" />
        <div>
          <div class="rc-alert__title">Son hata</div>
          <span>{{ notification.lastError }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kd-card {
  max-width: 820px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-12);
  box-shadow: var(--rc-shadow-sm);
  overflow: hidden;
}
.kd-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--rc-border-subtle);
}
.kd-head__icon {
  width: 42px;
  height: 42px;
  border-radius: var(--rc-r-10);
  background: var(--rc-accent-subtle);
  color: var(--rc-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kd-head__text { flex: 1; min-width: 0; }
.kd-head__title { font-size: 18px; font-weight: 600; margin: 0; }
.kd-head__sub { font-size: 12.5px; color: var(--rc-text-muted); margin-top: 2px; }

.kd-body {
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}
.kd-section-label {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: var(--rc-tracking-wide);
  text-transform: uppercase;
  color: var(--rc-text-muted);
  margin-bottom: 14px;
}

.kd-steps { display: flex; flex-direction: column; }
.kd-step { display: flex; gap: 12px; }
.kd-step__rail { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.kd-dot {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: var(--rc-r-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.kd-dot--success { background: var(--rc-success-500); }
.kd-dot--danger { background: var(--rc-danger-500); }
.kd-dot--warning { background: var(--rc-warning-500); }
.kd-dot__pulse {
  position: absolute;
  inset: -3px;
  border-radius: var(--rc-r-full);
  border: 2px solid var(--rc-warning-500);
}
.kd-line {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: var(--rc-border);
}
.kd-step__body { padding-bottom: 16px; min-width: 0; }
.kd-step__title { font-size: 13.5px; font-weight: 500; color: var(--rc-text); }
.kd-step__time { font-size: 12px; color: var(--rc-text-muted); margin-top: 2px; }
.kd-step__note { font-size: 12.5px; color: var(--rc-danger-700); margin-top: 3px; }

.kd-meta {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-10);
  overflow: hidden;
}
.kd-meta__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--rc-border-subtle);
}
.kd-meta__row:last-child { border-bottom: none; }
.kd-meta__label { font-size: 12.5px; color: var(--rc-text-muted); }
.kd-meta__value { font-size: 13px; font-weight: 500; color: var(--rc-text); text-align: right; }
.kd-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--rc-accent);
}
.kd-link:hover { text-decoration: underline; }

@media (max-width: 640px) {
  .kd-body { grid-template-columns: 1fr; }
}
</style>
