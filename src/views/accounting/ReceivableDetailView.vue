<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast, useEnumTranslations } from '@/composables'
import {
  PaymentModal,
  AccountingConfirmModal,
  PaymentProgress,
  DueStatusBadge,
} from '@/components/accounting'
import { RcButton, RcStatusPill, RcEmpty, resolvePaymentMethod } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatCurrency, formatDate } from '@/utils/format'
import { receivablesApi } from '@/api/accounting.api'
import type { RecordPaymentRequest, PaymentTransactionResponse } from '@/types'
import { ReceivableStatus } from '@/types/accounting'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { translateReceivableType } = useEnumTranslations()

const showPaymentModal = ref(false)
const confirmWriteOff = ref(false)
const confirmCancel = ref(false)
const paymentHistory = ref<PaymentTransactionResponse[]>([])
const historyLoading = ref(false)

const receivable = computed(() => accountingStore.selectedReceivable)
const loading = computed(() => accountingStore.receivablesLoading)

const canMakePayment = computed(() =>
  receivable.value
  && receivable.value.status !== ReceivableStatus.FULLY_PAID
  && receivable.value.status !== ReceivableStatus.CANCELLED
  && receivable.value.status !== ReceivableStatus.WRITTEN_OFF
)

const canWriteOff = computed(() =>
  receivable.value
  && receivable.value.status === ReceivableStatus.OVERDUE
  && receivable.value.remainingAmount > 0
)

const canCancel = computed(() =>
  receivable.value && receivable.value.status === ReceivableStatus.PENDING
)

const sourceRoute = computed(() => {
  if (!receivable.value || receivable.value.sourceType !== 'RENTAL') return null
  return { name: 'rental-detail', params: { id: receivable.value.sourceId } }
})

onMounted(async () => {
  const id = Number(route.params.id)
  if (id) {
    await accountingStore.fetchReceivableById(id)
    loadPaymentHistory(id)
  }
})

async function loadPaymentHistory(id: number) {
  historyLoading.value = true
  try {
    paymentHistory.value = await receivablesApi.getPayments(id)
  } catch {
    paymentHistory.value = []
  } finally {
    historyLoading.value = false
  }
}

async function submitPayment(data: RecordPaymentRequest) {
  if (!receivable.value) return
  try {
    await accountingStore.recordReceivablePayment(receivable.value.id, data)
    toast.success('Ödeme başarıyla kaydedildi')
    showPaymentModal.value = false
    await accountingStore.fetchReceivableById(receivable.value.id)
    loadPaymentHistory(receivable.value.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Ödeme kaydedilemedi')
  }
}

async function doWriteOff() {
  if (!receivable.value) return
  try {
    await accountingStore.writeOffReceivable(receivable.value.id)
    toast.success('Alacak şüpheli alacak olarak işaretlendi')
    confirmWriteOff.value = false
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İşlem başarısız oldu')
  }
}

async function doCancel() {
  if (!receivable.value) return
  try {
    await accountingStore.cancelReceivable(receivable.value.id)
    toast.success('Alacak iptal edildi')
    confirmCancel.value = false
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İptal işlemi başarısız oldu')
  }
}

function paymentMethodLabel(method: string): string {
  return resolvePaymentMethod(method)
}
</script>

<template>
  <div class="rc-page rca-detail">
    <button type="button" class="rca-detail__back" @click="router.push({ name: 'receivables' })">
      <RcIcon name="chevronLeft" :size="14" />
      Alacak / Verecek
    </button>

    <div v-if="loading" class="rc-skeleton rc-card-skeleton" style="height: 240px" />

    <RcEmpty v-else-if="!receivable" title="Alacak bulunamadı" description="Kayıt silinmiş veya erişim yok olabilir" />

    <template v-else>
      <div class="rca-detail__head">
        <div>
          <h1 class="rca-detail__title">{{ receivable.receivableNumber }}</h1>
          <p class="rca-detail__subtitle">{{ translateReceivableType(receivable.type) }}</p>
        </div>
        <div class="rca-detail__badges">
          <DueStatusBadge :due-date="receivable.dueDate" :status="receivable.status" />
          <RcStatusPill :status="receivable.status" />
        </div>
      </div>

      <div class="rca-detail__actions">
        <RcButton v-if="canMakePayment" variant="accent" @click="showPaymentModal = true">
          Ödeme al
        </RcButton>
        <RcButton v-if="canWriteOff" variant="secondary" @click="confirmWriteOff = true">
          Şüpheli alacak
        </RcButton>
        <RcButton v-if="canCancel" variant="danger" @click="confirmCancel = true">
          İptal et
        </RcButton>
        <RouterLink v-if="sourceRoute" :to="sourceRoute" class="rc-btn rc-btn--secondary">
          Kiralamaya git
        </RouterLink>
      </div>

      <div class="rca-detail__grid">
        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Genel bilgiler</h3>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Müşteri</span>
            <span class="rca-meta-row__value">{{ receivable.customerName || '—' }}</span>
          </div>
          <div v-if="receivable.vehiclePlate" class="rca-meta-row">
            <span class="rca-meta-row__label">Araç</span>
            <span class="rca-meta-row__value">{{ receivable.vehiclePlate }} — {{ receivable.vehicleModel }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Açıklama</span>
            <span class="rca-meta-row__value">{{ receivable.description }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Vade</span>
            <span class="rca-meta-row__value">{{ formatDate(receivable.dueDate) }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Oluşturulma</span>
            <span class="rca-meta-row__value">{{ formatDate(receivable.createdAt) }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Oluşturan</span>
            <span class="rca-meta-row__value">{{ receivable.createdBy }}</span>
          </div>
        </div>

        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Tutar bilgileri</h3>
          <div class="rca-amounts">
            <div class="rca-amount-row">
              <span>Toplam</span>
              <span>{{ formatCurrency(receivable.amount, receivable.currency) }}</span>
            </div>
            <div class="rca-amount-row">
              <span>Ödenen</span>
              <span style="color: var(--rc-green-600)">{{ formatCurrency(receivable.paidAmount, receivable.currency) }}</span>
            </div>
            <div class="rca-amount-row rca-amount-row--highlight">
              <span>Kalan</span>
              <span class="rca-amount-row__remaining">{{ formatCurrency(receivable.remainingAmount, receivable.currency) }}</span>
            </div>
          </div>
          <PaymentProgress
            :amount="receivable.amount"
            :paid-amount="receivable.paidAmount"
            :currency="receivable.currency"
          />
        </div>
      </div>

      <div class="rca-panel-card">
        <h3 class="rca-panel-card__title">Ödeme geçmişi</h3>
        <div v-if="historyLoading" class="rc-skeleton" style="height: 80px" />
        <RcEmpty
          v-else-if="paymentHistory.length === 0"
          title="Ödeme kaydı yok"
          description="Henüz tahsilat yapılmamış"
        />
        <div v-else class="rc-card" style="overflow: hidden; border: none; box-shadow: none; padding: 0">
          <table class="rc-table rcv-table--slim">
            <thead>
              <tr>
                <th>İşlem no</th>
                <th>Tarih</th>
                <th class="rc-right">Tutar</th>
                <th>Yöntem</th>
                <th>Referans</th>
                <th>Kaydeden</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in paymentHistory" :key="tx.id">
                <td class="rc-mono">{{ tx.transactionNumber }}</td>
                <td>{{ formatDate(tx.transactionDate) }}</td>
                <td class="rc-right rc-num">{{ formatCurrency(tx.amount, tx.currency) }}</td>
                <td>{{ paymentMethodLabel(tx.paymentMethod) }}</td>
                <td>{{ tx.transactionRef || '—' }}</td>
                <td>{{ tx.createdBy }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <PaymentModal
      v-if="receivable"
      :show="showPaymentModal"
      :remaining-amount="receivable.remainingAmount"
      :receivable-number="receivable.receivableNumber"
      title="Tahsilat kaydet"
      @close="showPaymentModal = false"
      @submit="submitPayment"
    />

    <AccountingConfirmModal
      :open="confirmWriteOff"
      title="Şüpheli alacak"
      message="Bu alacağı şüpheli alacak olarak işaretlemek istediğinize emin misiniz? Bu işlem geri alınamaz."
      confirm-label="İşaretle"
      variant="warning"
      @close="confirmWriteOff = false"
      @confirm="doWriteOff"
    />

    <AccountingConfirmModal
      :open="confirmCancel"
      title="Alacağı iptal et"
      message="Bu alacağı iptal etmek istediğinize emin misiniz?"
      confirm-label="İptal et"
      @close="confirmCancel = false"
      @confirm="doCancel"
    />
  </div>
</template>
