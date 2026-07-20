<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'
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

interface ContractSlotState {
  documentType: ContractDocumentType
  loading: boolean
  working: boolean
  contract: ContractDetail | null
  content: ContractContent | null
}

function createSlot(documentType: ContractDocumentType): ContractSlotState {
  return { documentType, loading: true, working: false, contract: null, content: null }
}

const slots = reactive<Record<ContractDocumentType, ContractSlotState>>({
  PRICE_OFFER: createSlot('PRICE_OFFER'),
  RENTAL_CONTRACT: createSlot('RENTAL_CONTRACT'),
})

const canCreateOffer = computed(() => isEnabled('PRICE_OFFER_DOCUMENTS'))
const canCreateRentalContract = computed(() => isEnabled('RENTAL_CONTRACT_DOCUMENTS'))
const canExportPdf = computed(() => isEnabled('CONTRACT_PDF_EXPORT'))

const visibleSlots = computed(() =>
  (['PRICE_OFFER', 'RENTAL_CONTRACT'] as ContractDocumentType[]).filter((type) =>
    type === 'PRICE_OFFER' ? canCreateOffer.value : canCreateRentalContract.value,
  ),
)

const showEditor = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorDocumentType = ref<ContractDocumentType>('RENTAL_CONTRACT')
const editorContractId = ref<number | undefined>(undefined)

const showSignModal = ref(false)
const signingDocumentType = ref<ContractDocumentType>('RENTAL_CONTRACT')
const signedBy = ref('')
const signatureMethod = ref('MANUEL')

function isEditable(slot: ContractSlotState) {
  return slot.contract != null && !slot.contract.signed && slot.contract.status !== 'CANCELLED'
}

function canSign(slot: ContractSlotState) {
  return slot.contract != null && (slot.contract.status === 'DRAFT' || slot.contract.status === 'PENDING_SIGNATURE')
}

function documentTypeLabel(slot: ContractSlotState) {
  if (!slot.content) return CONTRACT_DOCUMENT_TYPE_LABELS[slot.documentType]
  return CONTRACT_DOCUMENT_TYPE_LABELS[slot.content.documentType]
}

async function loadSlot(documentType: ContractDocumentType) {
  const slot = slots[documentType]
  slot.loading = true
  slot.contract = null
  slot.content = null
  try {
    const data = await contractsApi.getByRentalId(props.rentalId, documentType)
    slot.contract = data
    slot.content = await contractsApi.getContent(data.id)
  } catch (err) {
    if (isErrorResponse(err) && err.code === 'E001') {
      slot.contract = null
    } else {
      toast.apiError(err, 'Sözleşme yüklenemedi')
    }
  } finally {
    slot.loading = false
  }
}

async function loadAll() {
  await Promise.all([loadSlot('PRICE_OFFER'), loadSlot('RENTAL_CONTRACT')])
}

function openCreate(documentType: ContractDocumentType) {
  editorDocumentType.value = documentType
  editorMode.value = 'create'
  editorContractId.value = undefined
  showEditor.value = true
}

function openEdit(slot: ContractSlotState) {
  if (!slot.content || !slot.contract) return
  editorDocumentType.value = slot.content.documentType
  editorMode.value = 'edit'
  editorContractId.value = slot.contract.id
  showEditor.value = true
}

function openSign(slot: ContractSlotState) {
  signingDocumentType.value = slot.documentType
  signedBy.value = props.customerName ?? ''
  signatureMethod.value = 'MANUEL'
  showSignModal.value = true
}

async function handleRegenerate(slot: ContractSlotState) {
  if (!slot.contract) return
  slot.working = true
  try {
    slot.content = await contractsApi.regenerate(slot.contract.id)
    toast.success('İçerik şablondan yenilendi')
  } catch (err) {
    toast.apiError(err, 'Yenileme başarısız')
  } finally {
    slot.working = false
  }
}

async function handleDownloadPdf(slot: ContractSlotState) {
  if (!slot.contract) return
  slot.working = true
  try {
    const blob = await contractsApi.downloadPdf(slot.contract.id)
    downloadBlob(blob, `${slot.contract.contractNumber}.pdf`)
    toast.success('PDF indirildi')
  } catch (err) {
    toast.apiError(err, 'PDF indirilemedi')
  } finally {
    slot.working = false
  }
}

async function handleCancel(slot: ContractSlotState) {
  if (!slot.contract) return
  slot.working = true
  try {
    await contractsApi.cancel(slot.contract.id)
    toast.success('Sözleşme iptal edildi')
    await loadSlot(slot.documentType)
  } catch (err) {
    toast.apiError(err, 'İptal başarısız')
  } finally {
    slot.working = false
  }
}

async function handleSign() {
  const slot = slots[signingDocumentType.value]
  if (!slot.contract || !signedBy.value.trim()) {
    toast.error('İmzalayan adı zorunludur')
    return
  }
  slot.working = true
  try {
    slot.contract = await contractsApi.sign(slot.contract.id, {
      signedBy: signedBy.value.trim(),
      signatureMethod: signatureMethod.value.trim() || 'MANUEL',
    })
    toast.success('Sözleşme imzalandı')
    showSignModal.value = false
    await loadSlot(slot.documentType)
  } catch (err) {
    toast.apiError(err, 'İmzalama başarısız')
  } finally {
    slot.working = false
  }
}

function onEditorSaved() {
  void loadSlot(editorDocumentType.value)
}

onMounted(loadAll)
watch(() => props.rentalId, loadAll)
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

      <div v-for="type in visibleSlots" :key="type" class="rcr-contracts__slot">
        <div v-if="slots[type].loading" class="rc-skeleton" style="height: 120px" />
        <template v-else-if="slots[type].contract">
          <div class="rcr-contracts__card">
            <div class="rcr-contracts__meta">
              <div>
                <div class="rcr-contracts__number">{{ slots[type].contract!.contractNumber }}</div>
                <div class="rcr-contracts__type">{{ documentTypeLabel(slots[type]) }}</div>
              </div>
              <RcBadge :variant="slots[type].contract!.signed ? 'success' : 'info'">
                {{ CONTRACT_STATUS_LABELS[slots[type].contract!.status] }}
              </RcBadge>
            </div>

            <div class="rcr-contracts__grid">
              <div>
                <span>Geçerlilik</span>
                <strong>{{ formatDate(slots[type].contract!.validFrom) }} – {{ slots[type].contract!.validTo ? formatDate(slots[type].contract!.validTo!) : '—' }}</strong>
              </div>
              <div v-if="slots[type].contract!.signedAt">
                <span>İmza</span>
                <strong>{{ slots[type].contract!.signedBy }} · {{ formatDateTime(slots[type].contract!.signedAt!) }}</strong>
              </div>
              <div><span>Versiyon</span><strong>v{{ slots[type].contract!.contractVersion }}</strong></div>
            </div>

            <div class="rcr-contracts__actions">
              <RcButton v-if="isEditable(slots[type])" variant="secondary" size="sm" @click="openEdit(slots[type])">
                <RcIcon name="edit" :size="14" />
                Düzenle
              </RcButton>
              <RcButton
                v-if="isEditable(slots[type])"
                variant="ghost"
                size="sm"
                :disabled="slots[type].working"
                @click="handleRegenerate(slots[type])"
              >
                <RcIcon name="sparkle" :size="14" />
                Şablondan yenile
              </RcButton>
              <RcButton
                v-if="canExportPdf"
                variant="ghost"
                size="sm"
                :disabled="slots[type].working"
                @click="handleDownloadPdf(slots[type])"
              >
                <RcIcon name="download" :size="14" />
                PDF indir
              </RcButton>
              <RcButton v-if="canSign(slots[type])" variant="accent" size="sm" @click="openSign(slots[type])">
                <RcIcon name="check" :size="14" />
                İmzala
              </RcButton>
              <RcButton
                v-if="slots[type].contract!.status !== 'CANCELLED' && slots[type].contract!.status !== 'SIGNED'"
                variant="ghost"
                size="sm"
                :disabled="slots[type].working"
                @click="handleCancel(slots[type])"
              >
                İptal et
              </RcButton>
            </div>
          </div>
        </template>

        <RcEmpty
          v-else
          :title="type === 'PRICE_OFFER' ? 'Henüz fiyat teklifi yok' : 'Henüz sözleşme yok'"
          description="Kiralama için bu türde bir belge oluşturabilirsiniz."
        >
          <template #action>
            <RcButton
              :variant="type === 'PRICE_OFFER' ? 'secondary' : 'accent'"
              size="sm"
              @click="openCreate(type)"
            >
              <RcIcon :name="type === 'PRICE_OFFER' ? 'receipt' : 'folder'" :size="14" />
              {{ type === 'PRICE_OFFER' ? 'Fiyat teklifi oluştur' : 'Sözleşme oluştur' }}
            </RcButton>
          </template>
        </RcEmpty>
      </div>

      <ContractEditorModal
        :open="showEditor"
        :rental-id="rentalId"
        :contract-id="editorContractId"
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
          <RcButton variant="accent" :disabled="slots[signingDocumentType].working" @click="handleSign">İmzala</RcButton>
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

.rcr-contracts__slot {
  margin-bottom: 12px;
}

.rcr-contracts__slot:last-child {
  margin-bottom: 0;
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
</style>
