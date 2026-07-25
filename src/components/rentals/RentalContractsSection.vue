<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { contractsApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import { RcButton, RcModal, RcField, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate, formatDateTime } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import { isErrorResponse } from '@/utils/error'
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_DOCUMENT_TYPE_LABELS,
  type ContractDetail,
  type ContractDocumentType,
} from '@/types/contract'

const props = defineProps<{
  rentalId: number
  customerName?: string
}>()

const router = useRouter()
const toast = useToast()
const { isEnabled } = useFeatures()

interface ContractSlotState {
  documentType: ContractDocumentType
  loading: boolean
  working: boolean
  contract: ContractDetail | null
}

function createSlot(documentType: ContractDocumentType): ContractSlotState {
  return { documentType, loading: true, working: false, contract: null }
}

const slots = reactive<Record<ContractDocumentType, ContractSlotState>>({
  PRICE_OFFER: createSlot('PRICE_OFFER'),
  RENTAL_CONTRACT: createSlot('RENTAL_CONTRACT'),
  HANDOVER: createSlot('HANDOVER'),
  COMPLETION: createSlot('COMPLETION'),
})

const canCreateOffer = computed(() => isEnabled('PRICE_OFFER_DOCUMENTS'))
const canCreateRentalContract = computed(() => isEnabled('RENTAL_CONTRACT_DOCUMENTS'))
const canExportPdf = computed(() => isEnabled('CONTRACT_PDF_EXPORT'))

const DOCUMENT_TYPE_GATES: Partial<Record<ContractDocumentType, () => boolean>> = {
  PRICE_OFFER: () => canCreateOffer.value,
  RENTAL_CONTRACT: () => canCreateRentalContract.value,
}

const visibleSlots = computed(() =>
  (['PRICE_OFFER', 'RENTAL_CONTRACT', 'HANDOVER', 'COMPLETION'] as ContractDocumentType[]).filter((type) =>
    DOCUMENT_TYPE_GATES[type] ? DOCUMENT_TYPE_GATES[type]!() : true,
  ),
)

const EMPTY_DESCRIPTIONS: Record<ContractDocumentType, string> = {
  PRICE_OFFER: 'Araç ve fiyat bilgileriyle tek tıkla teklif hazırlayın.',
  RENTAL_CONTRACT: 'Kiralama bilgileriyle otomatik dolan sözleşme oluşturun.',
  HANDOVER: 'Araç teslimindeki KM ve yakıt bilgileriyle doldurulur.',
  COMPLETION: 'Kiralama kapanışında araç iade bilgileriyle otomatik doldurulur.',
}

const showSignModal = ref(false)
const signingDocumentType = ref<ContractDocumentType>('RENTAL_CONTRACT')
const signedBy = ref('')
const signatureMethod = ref('MANUEL')

function statusBadgeClass(contract: ContractDetail): string {
  if (contract.isSigned) return 'rcr-doccard__badge--success'
  if (contract.status === 'PENDING_SIGNATURE') return 'rcr-doccard__badge--warning'
  if (contract.status === 'CANCELLED' || contract.status === 'EXPIRED') return 'rcr-doccard__badge--danger'
  return ''
}

function metaLine(slot: ContractSlotState): string {
  const c = slot.contract
  if (!c) return ''
  if (c.isSigned && c.signedAt) {
    return `İmza ${formatDateTime(c.signedAt)} · ${c.signedBy ?? ''}${c.signatureMethod ? ` · ${c.signatureMethod === 'MANUEL' ? 'ıslak imza' : c.signatureMethod}` : ''}`
  }
  const to = c.validTo ? formatDate(c.validTo) : '—'
  return `Geçerlilik ${formatDate(c.validFrom)} – ${to}`
}

function isEditable(slot: ContractSlotState) {
  return slot.contract != null && !slot.contract.isSigned && slot.contract.status !== 'CANCELLED'
}

function canSign(slot: ContractSlotState) {
  return slot.contract != null && (slot.contract.status === 'DRAFT' || slot.contract.status === 'PENDING_SIGNATURE')
}

function canCancel(slot: ContractSlotState) {
  return slot.contract != null && slot.contract.status !== 'CANCELLED' && slot.contract.status !== 'SIGNED'
}

async function loadSlot(documentType: ContractDocumentType) {
  const slot = slots[documentType]
  slot.loading = true
  slot.contract = null
  try {
    slot.contract = await contractsApi.getByRentalId(props.rentalId, documentType)
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
  await Promise.all(visibleSlots.value.map((type) => loadSlot(type)))
}

function openEditor(documentType: ContractDocumentType, create = false) {
  void router.push({
    name: 'document-editor',
    params: { rentalId: props.rentalId, documentType },
    query: create ? { create: '1' } : undefined,
  })
}

function openTemplates() {
  void router.push({ name: 'settings', query: { tab: 'document-templates' } })
}

function openSign(slot: ContractSlotState) {
  signingDocumentType.value = slot.documentType
  signedBy.value = props.customerName ?? ''
  signatureMethod.value = 'MANUEL'
  showSignModal.value = true
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
    toast.success('Belge iptal edildi')
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
    toast.success('Belge imzalandı')
    showSignModal.value = false
    await loadSlot(slot.documentType)
  } catch (err) {
    toast.apiError(err, 'İmzalama başarısız')
  } finally {
    slot.working = false
  }
}

onMounted(loadAll)
watch(() => props.rentalId, loadAll)
</script>

<template>
  <FeatureGate feature="MODIFIABLE_CONTRACTS">
    <div class="rcr-doccards">
      <div class="rcr-doccards__head">
        <div>
          <h3 class="rcr-doccards__title">Sözleşme, teklif ve tutanaklar</h3>
          <p class="rcr-doccards__sub">Düzenlenebilir belge içeriği ve PDF çıktısı</p>
        </div>
        <RcButton variant="ghost" size="sm" @click="openTemplates">Şablonları yönet</RcButton>
      </div>

      <div class="rcr-doccards__grid">
        <template v-for="type in visibleSlots" :key="type">
          <div v-if="slots[type].loading" class="rc-skeleton" style="height: 132px; border-radius: 10px" />

          <div v-else-if="slots[type].contract" class="rcr-doccard">
            <div class="rcr-doccard__top">
              <div>
                <div class="rcr-doccard__type">{{ CONTRACT_DOCUMENT_TYPE_LABELS[type] }}</div>
                <div class="rcr-doccard__number">
                  {{ slots[type].contract!.contractNumber }} · v{{ slots[type].contract!.contractVersion }}
                </div>
              </div>
              <span class="rcr-doccard__badge" :class="statusBadgeClass(slots[type].contract!)">
                {{ CONTRACT_STATUS_LABELS[slots[type].contract!.status] }}
              </span>
            </div>

            <div class="rcr-doccard__meta">{{ metaLine(slots[type]) }}</div>

            <div class="rcr-doccard__actions">
              <RcButton variant="secondary" size="sm" @click="openEditor(type)">
                <RcIcon :name="isEditable(slots[type]) ? 'edit' : 'eye'" :size="13" />
                {{ isEditable(slots[type]) ? 'Düzenle' : 'Görüntüle' }}
              </RcButton>
              <RcButton
                v-if="canExportPdf"
                variant="ghost"
                size="sm"
                :disabled="slots[type].working"
                @click="handleDownloadPdf(slots[type])"
              >
                PDF
              </RcButton>
              <RcButton v-if="canSign(slots[type])" variant="accent" size="sm" @click="openSign(slots[type])">
                İmzala
              </RcButton>
              <RcButton
                v-if="canCancel(slots[type])"
                variant="ghost"
                size="sm"
                class="rcr-doccard__cancel"
                :disabled="slots[type].working"
                @click="handleCancel(slots[type])"
              >
                İptal et
              </RcButton>
            </div>
          </div>

          <div v-else class="rcr-doccard rcr-doccard--empty">
            <span class="rcr-doccard__empty-icon">
              <RcIcon name="folder" :size="18" />
            </span>
            <div class="rcr-doccard__empty-title">{{ CONTRACT_DOCUMENT_TYPE_LABELS[type] }} yok</div>
            <div class="rcr-doccard__empty-desc">{{ EMPTY_DESCRIPTIONS[type] }}</div>
            <RcButton variant="secondary" size="sm" style="margin-top: 4px" @click="openEditor(type, true)">
              <RcIcon name="plus" :size="12" />
              Oluştur
            </RcButton>
          </div>
        </template>
      </div>

      <RcModal :open="showSignModal" @close="showSignModal = false">
        <template #header>
          <h2 class="rc-modal__title">Belgeyi imzala</h2>
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
          <RcButton variant="accent" :disabled="slots[signingDocumentType].working" @click="handleSign">
            İmzala
          </RcButton>
        </template>
      </RcModal>
    </div>
  </FeatureGate>
</template>

<style scoped>
.rcr-doccards {
  margin-bottom: 20px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: 10px;
}

.rcr-doccards__head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--rc-border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rcr-doccards__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--rc-text);
}

.rcr-doccards__sub {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--rc-text-muted);
}

.rcr-doccards__grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 860px) {
  .rcr-doccards__grid {
    grid-template-columns: 1fr;
  }
}

.rcr-doccard {
  border: 1px solid var(--rc-border);
  border-radius: 10px;
  padding: 14px 16px;
  background: var(--rc-surface);
  transition: border-color var(--rc-dur-fast) var(--rc-ease-out);
}

.rcr-doccard:hover {
  border-color: var(--rc-border-strong);
}

.rcr-doccard__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.rcr-doccard__type {
  font-size: 14px;
  font-weight: 600;
  color: var(--rc-text);
}

.rcr-doccard__number {
  font-size: 12.5px;
  color: var(--rc-text-muted);
  margin-top: 2px;
  font-family: var(--rc-font-mono);
}

.rcr-doccard__badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  background: var(--rc-surface-hover);
  color: var(--rc-text-muted);
  white-space: nowrap;
}

.rcr-doccard__badge--success {
  background: var(--rc-success-50);
  color: var(--rc-success-700);
}

.rcr-doccard__badge--warning {
  background: var(--rc-warning-50);
  color: var(--rc-warning-700);
}

.rcr-doccard__badge--danger {
  background: var(--rc-danger-50);
  color: var(--rc-danger-700);
}

.rcr-doccard__meta {
  font-size: 12.5px;
  color: var(--rc-text-muted);
  margin-top: 12px;
}

.rcr-doccard__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.rcr-doccard__cancel:hover {
  background: var(--rc-danger-50);
  color: var(--rc-danger-700);
}

.rcr-doccard--empty {
  border-style: dashed;
  border-color: var(--rc-border-strong);
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 22px 16px;
}

.rcr-doccard__empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--rc-surface-hover);
  color: var(--rc-text-muted);
}

.rcr-doccard__empty-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--rc-text-soft);
}

.rcr-doccard__empty-desc {
  font-size: 12.5px;
  color: var(--rc-text-muted);
  max-width: 260px;
}
</style>
