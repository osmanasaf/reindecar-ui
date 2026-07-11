<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { contractsApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import { RcButton, RcBadge, RcEmpty, RcModal, RcField, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate, formatDateTime } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import { isErrorResponse } from '@/utils/error'
import ContractEditorModal from '@/components/rentals/ContractEditorModal.vue'
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_DOCUMENT_TYPE_LABELS,
  type ContractDetail,
  type ContractContent,
  type ContractDocumentType,
} from '@/types/contract'

const props = defineProps<{
  rentalId: number
  customerName?: string
}>()

const toast = useToast()
const { isEnabled } = useFeatures()

const loading = ref(true)
const contract = ref<ContractDetail | null>(null)
const contractContent = ref<ContractContent | null>(null)
const working = ref(false)

const showEditor = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorDocumentType = ref<ContractDocumentType>('RENTAL_CONTRACT')

const showSignModal = ref(false)
const signedBy = ref('')
const signatureMethod = ref('MANUEL')

const canCreateOffer = computed(() => isEnabled('PRICE_OFFER_DOCUMENTS'))
const canCreateRentalContract = computed(() => isEnabled('RENTAL_CONTRACT_DOCUMENTS'))
const canExportPdf = computed(() => isEnabled('CONTRACT_PDF_EXPORT'))

const hasContract = computed(() => contract.value != null)
const isEditable = computed(
  () => contract.value && !contract.value.signed && contract.value.status !== 'CANCELLED',
)
const canSign = computed(
  () => contract.value && (contract.value.status === 'DRAFT' || contract.value.status === 'PENDING_SIGNATURE'),
)

const documentTypeLabel = computed(() => {
  if (!contractContent.value) return ''
  return CONTRACT_DOCUMENT_TYPE_LABELS[contractContent.value.documentType]
})

async function loadContract() {
  loading.value = true
  contract.value = null
  contractContent.value = null
  try {
    const data = await contractsApi.getByRentalId(props.rentalId)
    contract.value = data
    contractContent.value = await contractsApi.getContent(data.id)
  } catch (err) {
    if (isErrorResponse(err) && err.code === 'E001') {
      contract.value = null
    } else {
      toast.apiError(err, 'Sözleşme yüklenemedi')
    }
  } finally {
    loading.value = false
  }
}

function openCreate(documentType: ContractDocumentType) {
  editorDocumentType.value = documentType
  editorMode.value = 'create'
  showEditor.value = true
}

function openEdit() {
  if (!contractContent.value) return
  editorDocumentType.value = contractContent.value.documentType
  editorMode.value = 'edit'
  showEditor.value = true
}

function openSign() {
  signedBy.value = props.customerName ?? ''
  signatureMethod.value = 'MANUEL'
  showSignModal.value = true
}

async function handleRegenerate() {
  if (!contract.value) return
  working.value = true
  try {
    contractContent.value = await contractsApi.regenerate(contract.value.id)
    toast.success('İçerik şablondan yenilendi')
  } catch (err) {
    toast.apiError(err, 'Yenileme başarısız')
  } finally {
    working.value = false
  }
}

async function handleDownloadPdf() {
  if (!contract.value) return
  working.value = true
  try {
    const blob = await contractsApi.downloadPdf(contract.value.id)
    downloadBlob(blob, `${contract.value.contractNumber}.pdf`)
    toast.success('PDF indirildi')
  } catch (err) {
    toast.apiError(err, 'PDF indirilemedi')
  } finally {
    working.value = false
  }
}

async function handleCancel() {
  if (!contract.value) return
  working.value = true
  try {
    await contractsApi.cancel(contract.value.id)
    toast.success('Sözleşme iptal edildi')
    await loadContract()
  } catch (err) {
    toast.apiError(err, 'İptal başarısız')
  } finally {
    working.value = false
  }
}

async function handleSign() {
  if (!contract.value || !signedBy.value.trim()) {
    toast.error('İmzalayan adı zorunludur')
    return
  }
  working.value = true
  try {
    contract.value = await contractsApi.sign(contract.value.id, {
      signedBy: signedBy.value.trim(),
      signatureMethod: signatureMethod.value.trim() || 'MANUEL',
    })
    toast.success('Sözleşme imzalandı')
    showSignModal.value = false
    await loadContract()
  } catch (err) {
    toast.apiError(err, 'İmzalama başarısız')
  } finally {
    working.value = false
  }
}

function onEditorSaved() {
  void loadContract()
}

onMounted(loadContract)
watch(() => props.rentalId, loadContract)
</script>

<template>
  <FeatureGate feature="MODIFIABLE_CONTRACTS">
    <div class="rcr-contracts">
      <div class="rcr-contracts__head">
        <div>
          <h3 class="rcr-contracts__title">Sözleşme & fiyat teklifi</h3>
          <p class="rcr-contracts__sub">Düzenlenebilir belge içeriği ve PDF çıktısı</p>
        </div>
      </div>

      <div v-if="loading" class="rc-skeleton" style="height: 120px" />
      <template v-else-if="hasContract && contract">
        <div class="rcr-contracts__card">
          <div class="rcr-contracts__meta">
            <div>
              <div class="rcr-contracts__number">{{ contract.contractNumber }}</div>
              <div class="rcr-contracts__type">{{ documentTypeLabel }}</div>
            </div>
            <RcBadge :variant="contract.signed ? 'success' : 'info'">
              {{ CONTRACT_STATUS_LABELS[contract.status] }}
            </RcBadge>
          </div>

          <div class="rcr-contracts__grid">
            <div><span>Geçerlilik</span><strong>{{ formatDate(contract.validFrom) }} – {{ contract.validTo ? formatDate(contract.validTo) : '—' }}</strong></div>
            <div v-if="contract.signedAt"><span>İmza</span><strong>{{ contract.signedBy }} · {{ formatDateTime(contract.signedAt) }}</strong></div>
            <div><span>Versiyon</span><strong>v{{ contract.contractVersion }}</strong></div>
          </div>

          <div class="rcr-contracts__actions">
            <RcButton v-if="isEditable" variant="secondary" size="sm" @click="openEdit">
              <RcIcon name="edit" :size="14" />
              Düzenle
            </RcButton>
            <RcButton
              v-if="isEditable"
              variant="ghost"
              size="sm"
              :disabled="working"
              @click="handleRegenerate"
            >
              <RcIcon name="sparkle" :size="14" />
              Şablondan yenile
            </RcButton>
            <RcButton
              v-if="canExportPdf"
              variant="ghost"
              size="sm"
              :disabled="working"
              @click="handleDownloadPdf"
            >
              <RcIcon name="download" :size="14" />
              PDF indir
            </RcButton>
            <RcButton v-if="canSign" variant="accent" size="sm" @click="openSign">
              <RcIcon name="check" :size="14" />
              İmzala
            </RcButton>
            <RcButton
              v-if="contract.status !== 'CANCELLED' && contract.status !== 'SIGNED'"
              variant="ghost"
              size="sm"
              :disabled="working"
              @click="handleCancel"
            >
              İptal et
            </RcButton>
          </div>
        </div>
      </template>

      <RcEmpty
        v-else
        title="Henüz sözleşme yok"
        description="Kiralama için fiyat teklifi veya kiralama sözleşmesi oluşturabilirsiniz."
      >
        <template #action>
          <div class="rcr-contracts__create-actions">
            <RcButton
              v-if="canCreateOffer"
              variant="secondary"
              size="sm"
              @click="openCreate('PRICE_OFFER')"
            >
              <RcIcon name="receipt" :size="14" />
              Fiyat teklifi oluştur
            </RcButton>
            <RcButton
              v-if="canCreateRentalContract"
              variant="accent"
              size="sm"
              @click="openCreate('RENTAL_CONTRACT')"
            >
              <RcIcon name="folder" :size="14" />
              Sözleşme oluştur
            </RcButton>
          </div>
        </template>
      </RcEmpty>

      <ContractEditorModal
        :open="showEditor"
        :rental-id="rentalId"
        :contract-id="contract?.id"
        :document-type="editorDocumentType"
        :mode="editorMode"
        @close="showEditor = false"
        @saved="onEditorSaved"
      />

      <RcModal :open="showSignModal" @close="showSignModal = false">
        <template #header>
          <h2 class="rc-modal__title">Sözleşmeyi imzala</h2>
        </template>
        <div class="rcv-form-grid">
          <RcField label="İmzalayan">
            <RcInput v-model="signedBy" placeholder="Ad soyad" />
          </RcField>
          <RcField label="İmza yöntemi">
            <select v-model="signatureMethod" class="rc-select">
              <option value="MANUEL">Manuel (ıslak imza)</option>
              <option value="DIGITAL">Dijital imza</option>
              <option value="E_SIGNATURE">E-imza</option>
            </select>
          </RcField>
        </div>
        <template #footer>
          <span class="rc-spacer" />
          <RcButton variant="ghost" @click="showSignModal = false">Vazgeç</RcButton>
          <RcButton variant="accent" :disabled="working" @click="handleSign">İmzala</RcButton>
        </template>
      </RcModal>
    </div>
  </FeatureGate>
</template>

<style scoped>
.rcr-contracts {
  margin-bottom: 20px;
}

.rcr-contracts__head {
  margin-bottom: 12px;
}

.rcr-contracts__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.rcr-contracts__sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--rc-text-muted);
}

.rcr-contracts__card {
  padding: 16px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-lg);
  background: var(--rc-surface);
}

.rcr-contracts__meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.rcr-contracts__number {
  font-size: 15px;
  font-weight: 600;
}

.rcr-contracts__type {
  font-size: 13px;
  color: var(--rc-text-muted);
  margin-top: 2px;
}

.rcr-contracts__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 14px;
  font-size: 13px;
}

.rcr-contracts__grid span {
  display: block;
  color: var(--rc-text-muted);
  margin-bottom: 2px;
}

.rcr-contracts__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.rcr-contracts__create-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
