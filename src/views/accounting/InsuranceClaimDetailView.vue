<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { insuranceClaimsApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import {
  ClaimStatusBadge,
  PaymentProgress,
} from '@/components/accounting'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import ApproveClaimModal from '@/components/accounting/insurance-claims/ApproveClaimModal.vue'
import RejectClaimModal from '@/components/accounting/insurance-claims/RejectClaimModal.vue'
import RecordPaymentModal from '@/components/accounting/insurance-claims/RecordPaymentModal.vue'
import { RcButton, RcEmpty } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatCurrency, formatDate } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { translateClaimType } = useEnumTranslations()

const claim = computed(() => accountingStore.selectedClaim)
const loading = computed(() => accountingStore.claimsLoading)

const showApproveModal = ref(false)
const showRejectModal = ref(false)
const showPaymentModal = ref(false)

const availableActions = computed(() => {
  if (!claim.value) return []
  const status = claim.value.status
  const actions: string[] = []
  switch (status) {
    case 'DRAFT':
      actions.push('submit')
      break
    case 'SUBMITTED':
      actions.push('moveToReview', 'approve', 'reject')
      break
    case 'UNDER_REVIEW':
      actions.push('approve', 'reject')
      break
    case 'APPROVED':
    case 'PARTIAL_PAID':
      actions.push('recordPayment')
      break
  }
  return actions
})

const remainingAmount = computed(() => {
  if (!claim.value) return 0
  return claim.value.approvedAmount - claim.value.paidAmount
})

async function handleSubmit() {
  if (!claim.value) return
  try {
    await insuranceClaimsApi.submit(claim.value.id)
    toast.success('Başvuru sigorta şirketine gönderildi')
    await accountingStore.fetchClaimById(claim.value.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Başvuru gönderilirken hata oluştu')
  }
}

async function handleMoveToReview() {
  if (!claim.value) return
  try {
    await insuranceClaimsApi.moveToReview(claim.value.id)
    toast.success('Başvuru incelemeye alındı')
    await accountingStore.fetchClaimById(claim.value.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İşlem başarısız oldu')
  }
}

async function handleApproveSuccess() {
  if (!claim.value) return
  await accountingStore.fetchClaimById(claim.value.id)
}

async function handleRejectSuccess() {
  if (!claim.value) return
  await accountingStore.fetchClaimById(claim.value.id)
}

async function handlePaymentSuccess() {
  if (!claim.value) return
  await accountingStore.fetchClaimById(claim.value.id)
}

onMounted(() => {
  const id = Number(route.params.id)
  if (id) accountingStore.fetchClaimById(id)
})
</script>

<template>
  <div class="rc-page rca-detail">
    <button type="button" class="rca-detail__back" @click="router.push({ name: 'insurance-claims' })">
      <RcIcon name="chevronLeft" :size="14" />
      Sigorta Başvuruları
    </button>

    <div v-if="loading" class="rc-skeleton rc-card-skeleton" style="height: 240px" />

    <RcEmpty v-else-if="!claim" title="Başvuru bulunamadı" description="Kayıt silinmiş veya erişim yok olabilir" />

    <template v-else>
      <div class="rca-detail__head">
        <div>
          <h1 class="rca-detail__title">{{ claim.claimNumber }}</h1>
          <p class="rca-detail__subtitle">{{ claim.vehiclePlate }} · {{ translateClaimType(claim.claimType) }}</p>
        </div>
        <div class="rca-detail__badges">
          <ClaimStatusBadge :status="claim.status" size="lg" />
        </div>
      </div>

      <div v-if="availableActions.length > 0" class="rca-detail__actions">
        <RcButton v-if="availableActions.includes('submit')" variant="accent" @click="handleSubmit">
          Gönder
        </RcButton>
        <RcButton v-if="availableActions.includes('moveToReview')" variant="secondary" @click="handleMoveToReview">
          İncelemeye al
        </RcButton>
        <RcButton v-if="availableActions.includes('approve')" variant="accent" @click="showApproveModal = true">
          Onayla
        </RcButton>
        <RcButton v-if="availableActions.includes('reject')" variant="danger" @click="showRejectModal = true">
          Reddet
        </RcButton>
        <RcButton v-if="availableActions.includes('recordPayment')" variant="accent" @click="showPaymentModal = true">
          Ödeme kaydet
        </RcButton>
      </div>

      <div class="rca-detail__grid">
        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Başvuru bilgileri</h3>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Olay tarihi</span>
            <span class="rca-meta-row__value">{{ formatDate(claim.incidentDate) }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Talep edilen</span>
            <span class="rca-meta-row__value">{{ formatCurrency(claim.claimedAmount, claim.currency) }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Onaylanan</span>
            <span class="rca-meta-row__value">{{ formatCurrency(claim.approvedAmount, claim.currency) }}</span>
          </div>
          <div class="rca-meta-row">
            <span class="rca-meta-row__label">Ödenen</span>
            <span class="rca-meta-row__value">{{ formatCurrency(claim.paidAmount, claim.currency) }}</span>
          </div>
          <div
            v-if="claim.status === 'APPROVED' || claim.status === 'PARTIAL_PAID'"
            class="rca-meta-row"
          >
            <span class="rca-meta-row__label">Kalan</span>
            <span class="rca-meta-row__value">{{ formatCurrency(remainingAmount, claim.currency) }}</span>
          </div>
          <div v-if="claim.submittedDate" class="rca-meta-row">
            <span class="rca-meta-row__label">Gönderim</span>
            <span class="rca-meta-row__value">{{ formatDate(claim.submittedDate) }}</span>
          </div>
          <div v-if="claim.approvedDate" class="rca-meta-row">
            <span class="rca-meta-row__label">Onay</span>
            <span class="rca-meta-row__value">{{ formatDate(claim.approvedDate) }}</span>
          </div>
          <PaymentProgress
            v-if="claim.approvedAmount > 0"
            :amount="claim.approvedAmount"
            :paid-amount="claim.paidAmount"
            :currency="claim.currency"
            style="margin-top: 12px"
          />
        </div>

        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Açıklama ve notlar</h3>
          <p v-if="claim.description" class="rca-detail__text">{{ claim.description }}</p>
          <p v-else class="rca-detail__text rca-detail__text--muted">Açıklama girilmemiş</p>
          <div v-if="claim.status === 'REJECTED' && claim.rejectionReason" class="rc-alert rc-alert--danger" style="margin-top: 12px">
            <strong>Red sebebi:</strong> {{ claim.rejectionReason }}
          </div>
          <div v-if="claim.notes" class="rca-meta-row" style="margin-top: 12px; border-top: 1px solid var(--rc-border); padding-top: 12px">
            <span class="rca-meta-row__label">Notlar</span>
            <span class="rca-meta-row__value">{{ claim.notes }}</span>
          </div>
        </div>
      </div>

      <div class="rca-panel-card" style="margin-top: 16px">
        <DocumentsSection
          reference-type="INSURANCE"
          :reference-id="claim.id"
          title="Sigorta belgeleri"
        />
      </div>

      <ApproveClaimModal
        v-if="claim"
        :show="showApproveModal"
        :claim-id="claim.id"
        :max-amount="claim.claimedAmount"
        @close="showApproveModal = false"
        @success="handleApproveSuccess"
      />

      <RejectClaimModal
        v-if="claim"
        :show="showRejectModal"
        :claim-id="claim.id"
        @close="showRejectModal = false"
        @success="handleRejectSuccess"
      />

      <RecordPaymentModal
        v-if="claim"
        :show="showPaymentModal"
        :claim-id="claim.id"
        :remaining-amount="remainingAmount"
        @close="showPaymentModal = false"
        @success="handlePaymentSuccess"
      />
    </template>
  </div>
</template>

<style scoped>
.rca-detail__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--rc-text);
}

.rca-detail__text--muted {
  color: var(--rc-text-muted);
}
</style>
