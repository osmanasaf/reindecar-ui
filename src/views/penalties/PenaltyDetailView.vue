<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { penaltiesApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import PenaltyStatusBadge from '@/components/penalties/PenaltyStatusBadge.vue'
import { AccountingConfirmModal } from '@/components/accounting'
import { RcButton, RcEmpty, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatCurrency, formatDate } from '@/utils/format'
import type { PenaltyResponse } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { translateViolationType } = useEnumTranslations()

const penalty = ref<PenaltyResponse | null>(null)
const loading = ref(true)
const confirmAction = ref<'paid' | 'paidCompany' | 'cancel' | null>(null)

const penaltyId = computed(() => Number(route.params.id))

const availableActions = computed(() => {
  if (!penalty.value) return []
  const status = penalty.value.status
  const actions: string[] = []
  switch (status) {
    case 'PENDING':
      actions.push('notify', 'markAsPaidByCompany', 'cancel')
      break
    case 'NOTIFIED':
      actions.push('dispute', 'markAsPaid')
      break
    case 'DISPUTED':
      actions.push('markAsPaid')
      break
    case 'PAID_BY_COMPANY':
      actions.push('notify')
      break
  }
  return actions
})

async function loadPenalty() {
  loading.value = true
  try {
    penalty.value = await penaltiesApi.getById(penaltyId.value)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Ceza bilgisi yüklenemedi')
    router.push({ name: 'penalties' })
  } finally {
    loading.value = false
  }
}

async function handleNotify() {
  if (!penalty.value) return
  try {
    await penaltiesApi.notify(penalty.value.id)
    toast.success('Müşteriye bildirim gönderildi')
    await loadPenalty()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Bildirim gönderilirken hata oluştu')
  }
}

async function handleDispute() {
  if (!penalty.value) return
  try {
    await penaltiesApi.dispute(penalty.value.id)
    toast.success('İtiraz kaydı oluşturuldu')
    await loadPenalty()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İtiraz kaydedilirken hata oluştu')
  }
}

async function doMarkAsPaid() {
  if (!penalty.value) return
  try {
    await penaltiesApi.markAsPaid(penalty.value.id, false)
    toast.success('Ceza ödendi olarak işaretlendi')
    confirmAction.value = null
    await loadPenalty()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İşlem başarısız oldu')
  }
}

async function doMarkAsPaidByCompany() {
  if (!penalty.value) return
  try {
    await penaltiesApi.markAsPaid(penalty.value.id, true)
    toast.success('Ceza şirket tarafından ödendi olarak işaretlendi')
    confirmAction.value = null
    await loadPenalty()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İşlem başarısız oldu')
  }
}

async function doCancel() {
  if (!penalty.value) return
  try {
    await penaltiesApi.cancel(penalty.value.id)
    toast.success('Ceza iptal edildi')
    confirmAction.value = null
    await loadPenalty()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İptal işlemi başarısız oldu')
  }
}

onMounted(() => {
  void loadPenalty()
})
</script>

<template>
  <div class="rc-page rca-detail">
    <button type="button" class="rca-detail__back" @click="router.push({ name: 'penalties' })">
      <RcIcon name="chevronLeft" :size="14" />
      Trafik Cezaları
    </button>

    <div v-if="loading" class="rc-skeleton rc-card-skeleton" style="height: 240px" />

    <RcEmpty v-else-if="!penalty" title="Ceza bulunamadı" description="Kayıt silinmiş veya erişim yok olabilir" />

    <template v-else>
      <div class="rca-detail__head">
        <div>
          <h1 class="rca-detail__title">{{ penalty.penaltyNumber }}</h1>
          <p class="rca-detail__subtitle">{{ penalty.plateNumber || '—' }}</p>
        </div>
        <div class="rca-detail__badges">
          <RcBadge v-if="penalty.isOverdue" variant="danger">Vadesi geçmiş</RcBadge>
          <PenaltyStatusBadge :status="penalty.status" size="lg" />
        </div>
      </div>

      <div v-if="availableActions.length > 0" class="rca-detail__actions">
        <RcButton v-if="availableActions.includes('notify')" variant="accent" @click="handleNotify">
          Müşteriye bildir
        </RcButton>
        <RcButton v-if="availableActions.includes('dispute')" variant="secondary" @click="handleDispute">
          İtiraz kaydı
        </RcButton>
        <RcButton v-if="availableActions.includes('markAsPaid')" variant="accent" @click="confirmAction = 'paid'">
          Müşteri ödedi
        </RcButton>
        <RcButton v-if="availableActions.includes('markAsPaidByCompany')" variant="secondary" @click="confirmAction = 'paidCompany'">
          Şirket ödedi
        </RcButton>
        <RcButton v-if="availableActions.includes('cancel')" variant="danger" @click="confirmAction = 'cancel'">
          İptal et
        </RcButton>
      </div>

      <div class="rca-detail__grid">
        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Ceza bilgileri</h3>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">İhlal türü</span>
            <span class="rca-meta-row__value">{{ translateViolationType(penalty.violationType) }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">İhlal tarihi</span>
            <span class="rca-meta-row__value">{{ formatDate(penalty.violationDate) }}</span>
          </div>
          <div v-if="penalty.violationLocation" class="rca-meta-row">
            <span class="rca-meta-row__label">İhlal yeri</span>
            <span class="rca-meta-row__value">{{ penalty.violationLocation }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Tutar</span>
            <span class="rca-meta-row__value rc-num">{{ formatCurrency(penalty.penaltyAmount, penalty.currency) }}</span>
          </div>
          <div v-if="penalty.dueDate" class="rca-meta-row">
            <span class="rca-meta-row__label">Vade</span>
            <span class="rca-meta-row__value" :class="{ 'rca-stat__value--danger': penalty.isOverdue }">
              {{ formatDate(penalty.dueDate) }}
            </span>
          </div>
          <div v-if="penalty.ticketNumber" class="rca-meta-row">
            <span class="rca-meta-row__label">Makbuz no</span>
            <span class="rca-meta-row__value">{{ penalty.ticketNumber }}</span>
          </div>
          <div v-if="penalty.notificationDate" class="rca-meta-row">
            <span class="rca-meta-row__label">Bildirim</span>
            <span class="rca-meta-row__value">{{ formatDate(penalty.notificationDate) }}</span>
          </div>
          <div v-if="penalty.receivableId" class="rca-meta-row">
            <span class="rca-meta-row__label">Alacak</span>
            <button
              type="button"
              class="rc-btn rc-btn--ghost rc-btn--sm"
              @click="router.push({ name: 'receivable-detail', params: { id: penalty.receivableId } })"
            >
              Alacak #{{ penalty.receivableId }}
            </button>
          </div>
        </div>

        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Açıklama</h3>
          <p v-if="penalty.description" class="rca-detail__text">{{ penalty.description }}</p>
          <p v-else class="rca-detail__text rca-detail__text--muted">Açıklama girilmemiş</p>
          <div v-if="penalty.notes" class="rca-meta-row" style="margin-top: 12px; border-top: 1px solid var(--rc-border); padding-top: 12px">
            <span class="rca-meta-row__label">Notlar</span>
            <span class="rca-meta-row__value">{{ penalty.notes }}</span>
          </div>
        </div>
      </div>

      <div class="rca-panel-card" style="margin-top: 16px">
        <h3 class="rca-panel-card__title">Sistem</h3>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Kaynak</span>
          <span class="rca-meta-row__value">{{ penalty.source === 'EXTERNAL' ? 'API' : 'Manuel' }}</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Oluşturan</span>
          <span class="rca-meta-row__value">{{ penalty.createdBy }}</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Oluşturulma</span>
          <span class="rca-meta-row__value">{{ formatDate(penalty.createdAt) }}</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Güncelleme</span>
          <span class="rca-meta-row__value">{{ formatDate(penalty.updatedAt) }}</span>
        </div>
      </div>

      <AccountingConfirmModal
        :open="confirmAction === 'paid'"
        title="Ödeme onayı"
        message="Müşteri bu cezayı ödedi olarak işaretlensin mi?"
        confirm-label="Onayla"
        @close="confirmAction = null"
        @confirm="doMarkAsPaid"
      />

      <AccountingConfirmModal
        :open="confirmAction === 'paidCompany'"
        title="Şirket ödemesi"
        message="Şirket bu cezayı ödedi olarak işaretlensin mi?"
        confirm-label="Onayla"
        @close="confirmAction = null"
        @confirm="doMarkAsPaidByCompany"
      />

      <AccountingConfirmModal
        :open="confirmAction === 'cancel'"
        title="Ceza iptali"
        message="Bu cezayı iptal etmek istediğinizden emin misiniz?"
        confirm-label="İptal et"
        variant="danger"
        @close="confirmAction = null"
        @confirm="doCancel"
      />
    </template>
  </div>
</template>

<style scoped>
.rca-detail__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
}

.rca-detail__text--muted {
  color: var(--rc-text-muted);
}
</style>
