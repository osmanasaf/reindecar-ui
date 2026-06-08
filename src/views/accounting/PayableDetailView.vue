<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast, useEnumTranslations } from '@/composables'
import {
  PaymentModal,
  AccountingConfirmModal,
  PaymentProgress,
  DueStatusBadge,
} from '@/components/accounting'
import { RcButton, RcStatusPill, RcEmpty, resolvePaymentMethod, RcDetailSkeleton, RcSkeletonText } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatCurrency, formatDate } from '@/utils/format'
import { payablesApi } from '@/api/accounting.api'
import type { RecordPaymentRequest, PaymentTransactionResponse } from '@/types'
import { PayableStatus } from '@/types/accounting'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { translatePayableType } = useEnumTranslations()

const showPaymentModal = ref(false)
const confirmWriteOff = ref(false)
const confirmCancel = ref(false)
const paymentHistory = ref<PaymentTransactionResponse[]>([])
const historyLoading = ref(false)

const payable = computed(() => accountingStore.selectedPayable)
const loading = computed(() => accountingStore.payablesLoading)

const canMakePayment = computed(() =>
  payable.value
  && payable.value.status !== PayableStatus.FULLY_PAID
  && payable.value.status !== PayableStatus.CANCELLED
  && payable.value.status !== PayableStatus.WRITTEN_OFF
)

const canWriteOff = computed(() =>
  payable.value
  && payable.value.status === PayableStatus.OVERDUE
  && payable.value.remainingAmount > 0
)

const canCancel = computed(() =>
  payable.value && payable.value.status === PayableStatus.PENDING
)

onMounted(async () => {
  const id = Number(route.params.id)
  if (id) {
    await accountingStore.fetchPayableById(id)
    loadPaymentHistory(id)
  }
})

async function loadPaymentHistory(id: number) {
  historyLoading.value = true
  try {
    paymentHistory.value = await payablesApi.getPayments(id)
  } catch {
    paymentHistory.value = []
  } finally {
    historyLoading.value = false
  }
}

async function submitPayment(data: RecordPaymentRequest) {
  if (!payable.value) return
  try {
    await accountingStore.recordPayablePayment(payable.value.id, data)
    toast.success('Ödeme başarıyla kaydedildi')
    showPaymentModal.value = false
    await accountingStore.fetchPayableById(payable.value.id)
    loadPaymentHistory(payable.value.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Ödeme kaydedilemedi')
  }
}

async function doWriteOff() {
  if (!payable.value) return
  try {
    await payablesApi.writeOff(payable.value.id)
    toast.success('Verecek şüpheli olarak işaretlendi')
    confirmWriteOff.value = false
    await accountingStore.fetchPayableById(payable.value.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İşlem başarısız oldu')
  }
}

async function doCancel() {
  if (!payable.value) return
  try {
    await accountingStore.cancelPayable(payable.value.id)
    toast.success('Borç iptal edildi')
    confirmCancel.value = false
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İptal işlemi başarısız oldu')
  }
}
</script>

<template>
  <div class="rc-page rca-detail">
    <button type="button" class="rca-detail__back" @click="router.push({ name: 'payables' })">
      <RcIcon name="chevronLeft" :size="14" />
      Alacak / Verecek
    </button>

    <RcDetailSkeleton v-if="loading" :sections="2" />

    <RcEmpty v-else-if="!payable" title="Verecek bulunamadı" description="Kayıt silinmiş veya erişim yok olabilir" />

    <template v-else>
      <div class="rca-detail__head">
        <div>
          <h1 class="rca-detail__title">{{ payable.payableNumber }}</h1>
          <p class="rca-detail__subtitle">
            {{ payable.serviceProviderName }} — {{ translatePayableType(payable.type) }}
          </p>
        </div>
        <div class="rca-detail__badges">
          <DueStatusBadge :due-date="payable.dueDate" :status="payable.status" />
          <RcStatusPill :status="payable.status" />
        </div>
      </div>

      <div class="rca-detail__actions">
        <RcButton v-if="canMakePayment" variant="accent" @click="showPaymentModal = true">
          Ödeme yap
        </RcButton>
        <RcButton v-if="canWriteOff" variant="secondary" @click="confirmWriteOff = true">
          Şüpheli olarak işaretle
        </RcButton>
        <RcButton v-if="canCancel" variant="danger" @click="confirmCancel = true">
          İptal et
        </RcButton>
      </div>

      <div class="rca-detail__grid">
        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Genel bilgiler</h3>
          <div v-if="payable.customerName" class="rca-meta-row">
            <span class="rca-meta-row__label">Müşteri</span>
            <span class="rca-meta-row__value">{{ payable.customerName }}</span>
          </div>
          <div v-if="payable.vehiclePlate" class="rca-meta-row">
            <span class="rca-meta-row__label">Araç</span>
            <span class="rca-meta-row__value">{{ payable.vehiclePlate }} — {{ payable.vehicleModel }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Sağlayıcı</span>
            <span class="rca-meta-row__value">{{ payable.serviceProviderName || '—' }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Açıklama</span>
            <span class="rca-meta-row__value">{{ payable.description }}</span>
          </div>
          <div v-if="payable.invoiceNumber" class="rca-meta-row">
            <span class="rca-meta-row__label">Fatura no</span>
            <span class="rca-meta-row__value">{{ payable.invoiceNumber }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Vade</span>
            <span class="rca-meta-row__value">{{ formatDate(payable.dueDate) }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Oluşturan</span>
            <span class="rca-meta-row__value">{{ payable.createdBy }}</span>
          </div>
        </div>

        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Tutar bilgileri</h3>
          <div class="rca-amounts">
            <div class="rca-amount-row">
              <span>Toplam</span>
              <span>{{ formatCurrency(payable.amount, payable.currency) }}</span>
            </div>
            <div class="rca-amount-row">
              <span>Ödenen</span>
              <span style="color: var(--rc-green-600)">{{ formatCurrency(payable.paidAmount, payable.currency) }}</span>
            </div>
            <div class="rca-amount-row rca-amount-row--highlight">
              <span>Kalan</span>
              <span class="rca-amount-row__remaining">{{ formatCurrency(payable.remainingAmount, payable.currency) }}</span>
            </div>
          </div>
          <PaymentProgress
            :amount="payable.amount"
            :paid-amount="payable.paidAmount"
            :currency="payable.currency"
          />
        </div>
      </div>

      <div class="rca-panel-card">
        <h3 class="rca-panel-card__title">Ödeme geçmişi</h3>
        <RcSkeletonText v-if="historyLoading" :lines="3" />
        <RcEmpty
          v-else-if="paymentHistory.length === 0"
          title="Ödeme kaydı yok"
          description="Henüz ödeme yapılmamış"
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
                <td>{{ resolvePaymentMethod(tx.paymentMethod) }}</td>
                <td>{{ tx.transactionRef || '—' }}</td>
                <td>{{ tx.createdBy }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <PaymentModal
      v-if="payable"
      :show="showPaymentModal"
      :remaining-amount="payable.remainingAmount"
      :receivable-number="payable.payableNumber"
      title="Ödeme kaydet"
      @close="showPaymentModal = false"
      @submit="submitPayment"
    />

    <AccountingConfirmModal
      :open="confirmWriteOff"
      title="Şüpheli verecek"
      message="Bu vereceği şüpheli olarak işaretlemek istediğinize emin misiniz?"
      confirm-label="İşaretle"
      variant="warning"
      @close="confirmWriteOff = false"
      @confirm="doWriteOff"
    />

    <AccountingConfirmModal
      :open="confirmCancel"
      title="Vereceği iptal et"
      message="Bu borcun ödemesini iptal etmek istediğinize emin misiniz?"
      confirm-label="İptal et"
      @close="confirmCancel = false"
      @confirm="doCancel"
    />
  </div>
</template>
