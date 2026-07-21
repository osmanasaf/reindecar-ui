<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { serviceManifestsApi } from '@/api'
import { FILE_UPLOAD_TYPE_LABELS, type FileUploadType } from '@/api/files.api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import { AccountingConfirmModal } from '@/components/accounting'
import { RcButton, RcEmpty, RcField, RcBadge, RcDetailSkeleton, RcModal } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import { toApiDateTime, toInputDateTime } from '@/utils/datetime'
import { downloadBlob } from '@/utils/download'
import type { UetdsManifest, UetdsPassenger, UetdsSubmission, CreateUetdsPassengerRequest, PassengerImportRowResult } from '@/types/manifest'
import type { FileRecord } from '@/api/files.api'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isEnabled } = useFeatures()

const manifest = ref<UetdsManifest | null>(null)
const passengers = ref<UetdsPassenger[]>([])
const documents = ref<FileRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const uploadingPdf = ref(false)
const uploadingDoc = ref(false)
const showDeleteConfirm = ref(false)
const submission = ref<UetdsSubmission | null>(null)
const submitting = ref(false)
const passengerForm = ref<CreateUetdsPassengerRequest>({
  seatNumber: undefined,
  fullName: '',
  nationality: 'T.C.',
  idNumber: '',
})
const docUploadType = ref<FileUploadType>('UETDS_SEFER_MANIFEST')

const showImportModal = ref(false)
const importing = ref(false)
const importRows = ref<PassengerImportRowResult[]>([])
const importSelection = ref<Set<number>>(new Set())
const selectedImportCount = computed(() => importSelection.value.size)

const manifestId = computed(() => Number(route.params.id))

const form = ref({
  uetdsTripNumber: '',
  tripStartAt: '',
  tripEndAt: '',
  documentNumber: '',
  driverName: '',
  driverSrc: '',
  carrierCompanyName: '',
  groupName: '',
  groupRoute: '',
  groupDescription: '',
  groupFeeAmount: '' as string | number,
  passengerCount: '' as string | number,
})

const documentTypes: FileUploadType[] = ['UETDS_SEFER_MANIFEST', 'SERVICE_ROUTE_PERMIT', 'PASSENGER_LIST']

function syncForm(data: UetdsManifest) {
  form.value = {
    uetdsTripNumber: data.uetdsTripNumber,
    tripStartAt: toInputDateTime(data.tripStartAt),
    tripEndAt: toInputDateTime(data.tripEndAt),
    documentNumber: data.documentNumber || '',
    driverName: data.driverName || '',
    driverSrc: data.driverSrc || '',
    carrierCompanyName: data.carrierCompanyName || '',
    groupName: data.groupName || '',
    groupRoute: data.groupRoute || '',
    groupDescription: data.groupDescription || '',
    groupFeeAmount: data.groupFeeAmount ?? '',
    passengerCount: data.passengerCount ?? '',
  }
}

async function loadManifest() {
  loading.value = true
  try {
    const data = await serviceManifestsApi.getById(manifestId.value)
    manifest.value = data
    syncForm(data)
    await Promise.all([loadPassengers(), loadDocuments(), loadSubmission()])
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Manifesto yüklenemedi')
    router.push({ name: 'service-manifests' })
  } finally {
    loading.value = false
  }
}

async function loadSubmission() {
  if (!isEnabled('UETDS_API')) return
  try {
    submission.value = await serviceManifestsApi.getSubmissionStatus(manifestId.value)
  } catch {
    submission.value = null
  }
}

async function handleSubmitToUetds() {
  submitting.value = true
  try {
    submission.value = await serviceManifestsApi.submitToUetds(manifestId.value)
    toast.success('UETDS gönderim kuyruğuna eklendi')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'UETDS gönderimi başlatılamadı')
  } finally {
    submitting.value = false
  }
}

async function handleRetrySubmission() {
  if (!submission.value) return
  submitting.value = true
  try {
    submission.value = await serviceManifestsApi.retrySubmission(submission.value.id)
    toast.success('Gönderim yeniden denendi')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Yeniden gönderim başarısız')
  } finally {
    submitting.value = false
  }
}

async function loadPassengers() {
  if (!isEnabled('UETDS_PASSENGERS')) return
  passengers.value = await serviceManifestsApi.listPassengers(manifestId.value)
}

async function loadDocuments() {
  if (!isEnabled('UETDS_DOCUMENTS')) return
  documents.value = await serviceManifestsApi.listDocuments(manifestId.value)
}

async function handleSave() {
  saving.value = true
  try {
    manifest.value = await serviceManifestsApi.update(manifestId.value, {
      uetdsTripNumber: form.value.uetdsTripNumber,
      tripStartAt: toApiDateTime(form.value.tripStartAt),
      tripEndAt: form.value.tripEndAt ? toApiDateTime(form.value.tripEndAt) : undefined,
      documentNumber: form.value.documentNumber || undefined,
      driverName: form.value.driverName || undefined,
      driverSrc: form.value.driverSrc || undefined,
      carrierCompanyName: form.value.carrierCompanyName || undefined,
      groupName: form.value.groupName || undefined,
      groupRoute: form.value.groupRoute || undefined,
      groupDescription: form.value.groupDescription || undefined,
      groupFeeAmount: form.value.groupFeeAmount !== '' ? Number(form.value.groupFeeAmount) : undefined,
      passengerCount: form.value.passengerCount !== '' ? Number(form.value.passengerCount) : undefined,
    })
    syncForm(manifest.value)
    toast.success('Manifesto güncellendi')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Kayıt başarısız')
  } finally {
    saving.value = false
  }
}

async function handlePdfUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingPdf.value = true
  try {
    manifest.value = await serviceManifestsApi.attachPdf(manifestId.value, file)
    syncForm(manifest.value)
    toast.success('PDF eklendi')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'PDF yüklenemedi')
  } finally {
    uploadingPdf.value = false
  }
}

async function handleDocumentUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingDoc.value = true
  try {
    await serviceManifestsApi.uploadDocument(manifestId.value, file, docUploadType.value)
    await loadDocuments()
    toast.success('Belge yüklendi')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Belge yüklenemedi')
  } finally {
    uploadingDoc.value = false
  }
}

async function handleAddPassenger() {
  if (!passengerForm.value.fullName.trim()) {
    toast.error('Yolcu adı zorunludur')
    return
  }
  try {
    await serviceManifestsApi.addPassenger(manifestId.value, {
      seatNumber: passengerForm.value.seatNumber,
      fullName: passengerForm.value.fullName.trim(),
      nationality: passengerForm.value.nationality || undefined,
      idNumber: passengerForm.value.idNumber || undefined,
    })
    passengerForm.value = { seatNumber: undefined, fullName: '', nationality: 'T.C.', idNumber: '' }
    await loadPassengers()
    toast.success('Yolcu eklendi')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Yolcu eklenemedi')
  }
}

function downloadCsvTemplate() {
  const csv = 'Ad Soyad,Koltuk No,Uyruk,Kimlik No\nAhmet Yılmaz,1,T.C.,12345678901\n'
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, 'yolcu-listesi-sablon.csv')
}

async function downloadExcelTemplate() {
  try {
    const blob = await serviceManifestsApi.downloadPassengerImportTemplateXlsx()
    downloadBlob(blob, 'yolcu-listesi-sablon.xlsx')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Şablon indirilemedi')
  }
}

function openImportModal() {
  importRows.value = []
  importSelection.value = new Set()
  showImportModal.value = true
}

function closeImportModal() {
  showImportModal.value = false
}

async function handleImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  try {
    const preview = await serviceManifestsApi.previewPassengerImport(manifestId.value, file)
    importRows.value = preview.rows
    importSelection.value = new Set(
      preview.rows.filter((r) => r.passenger !== null).map((r) => r.rowNumber),
    )
    if (preview.errorCount > 0) {
      toast.error(`${preview.errorCount} satırda hata var, hatalı satırlar listeden çıkarıldı`)
    }
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Dosya ayrıştırılamadı')
  } finally {
    importing.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

function toggleImportRow(rowNumber: number) {
  if (importSelection.value.has(rowNumber)) {
    importSelection.value.delete(rowNumber)
  } else {
    importSelection.value.add(rowNumber)
  }
  importSelection.value = new Set(importSelection.value)
}

async function confirmImport() {
  const selected = importRows.value
    .filter((r) => r.passenger !== null && importSelection.value.has(r.rowNumber))
    .map((r) => r.passenger as CreateUetdsPassengerRequest)

  if (selected.length === 0) {
    toast.error('Kaydedilecek yolcu seçilmedi')
    return
  }

  importing.value = true
  try {
    await serviceManifestsApi.replacePassengers(manifestId.value, selected)
    toast.success(`${selected.length} yolcu kaydedildi (mevcut liste değiştirildi)`)
    closeImportModal()
    await loadPassengers()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Yolcu listesi kaydedilemedi')
  } finally {
    importing.value = false
  }
}

async function handleDeletePassenger(passengerId: number) {
  try {
    await serviceManifestsApi.deletePassenger(manifestId.value, passengerId)
    await loadPassengers()
    toast.success('Yolcu silindi')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Yolcu silinemedi')
  }
}

async function handleDeleteManifest() {
  try {
    await serviceManifestsApi.remove(manifestId.value)
    toast.success('Manifesto silindi')
    router.push({ name: 'service-manifests' })
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Silinemedi')
  } finally {
    showDeleteConfirm.value = false
  }
}

const submissionStatusLabel = computed(() => {
  switch (submission.value?.status) {
    case 'PENDING': return 'Gönderim kuyruğunda'
    case 'SENT': return 'UETDS\'e gönderildi'
    case 'FAILED': return 'Gönderim başarısız'
    case 'ACKED': return 'UETDS onayladı'
    default: return null
  }
})

const submissionStatusVariant = computed(() => {
  switch (submission.value?.status) {
    case 'SENT':
    case 'ACKED':
      return 'success'
    case 'FAILED':
      return 'danger'
    default:
      return 'info'
  }
})

onMounted(() => {
  void loadManifest()
})
</script>

<template>
  <div class="rc-page">
    <div class="rc-page__toolbar">
      <RcButton variant="secondary" @click="router.push({ name: 'service-manifests' })">
        <RcIcon name="chevronLeft" :size="14" />
        Listeye dön
      </RcButton>
      <div style="display: flex; gap: 8px; align-items: center">
        <FeatureGate feature="UETDS_API">
          <RcBadge v-if="submissionStatusLabel" :variant="submissionStatusVariant">
            {{ submissionStatusLabel }}
          </RcBadge>
          <RcButton
            v-if="!submission || submission.status === 'FAILED'"
            variant="secondary"
            :disabled="submitting"
            @click="submission ? handleRetrySubmission() : handleSubmitToUetds()"
          >
            {{ submission?.status === 'FAILED' ? 'Yeniden gönder' : "UETDS'e Gönder" }}
          </RcButton>
        </FeatureGate>
        <RcButton variant="secondary" @click="router.push({ name: 'rental-detail', params: { id: manifest?.rentalId } })">
          Kiralamaya git
        </RcButton>
        <RcButton variant="danger" @click="showDeleteConfirm = true">Sil</RcButton>
      </div>
    </div>

    <RcDetailSkeleton v-if="loading" />

    <template v-else-if="manifest">
      <div class="rc-card" style="margin-bottom: 16px">
        <div class="rc-card__head">
          <div>
            <h1 class="rc-card__title">{{ manifest.uetdsTripNumber }}</h1>
            <p class="rc-card__subtitle">
              {{ manifest.vehiclePlate }} · {{ manifest.rentalNumber }}
              <RcBadge style="margin-left: 8px">{{ manifest.source === 'UPLOAD' ? 'PDF' : 'Manuel' }}</RcBadge>
            </p>
          </div>
        </div>
        <div class="rc-card__body">
          <form class="rcs-form-grid" @submit.prevent="handleSave">
            <RcField label="UETDS sefer no">
              <input v-model="form.uetdsTripNumber" class="rc-input" required />
            </RcField>
            <RcField label="Belge no">
              <input v-model="form.documentNumber" class="rc-input" />
            </RcField>
            <RcField label="Başlangıç">
              <input v-model="form.tripStartAt" type="datetime-local" class="rc-input" />
            </RcField>
            <RcField label="Bitiş">
              <input v-model="form.tripEndAt" type="datetime-local" class="rc-input" />
            </RcField>
            <RcField label="Şoför">
              <input v-model="form.driverName" class="rc-input" />
            </RcField>
            <RcField label="SRC">
              <input v-model="form.driverSrc" class="rc-input" />
            </RcField>
            <RcField label="Taşıyıcı" style="grid-column: 1 / -1">
              <input v-model="form.carrierCompanyName" class="rc-input" />
            </RcField>
            <RcField label="Grup">
              <input v-model="form.groupName" class="rc-input" />
            </RcField>
            <RcField label="Ücret">
              <input v-model.number="form.groupFeeAmount" type="number" min="0" step="0.01" class="rc-input rc-num" />
            </RcField>
            <RcField label="Güzergah" style="grid-column: 1 / -1">
              <input v-model="form.groupRoute" class="rc-input" />
            </RcField>
            <RcField label="Açıklama" style="grid-column: 1 / -1">
              <textarea v-model="form.groupDescription" class="rc-input" rows="3" />
            </RcField>
            <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end">
              <RcButton type="submit" variant="primary" :loading="saving">Kaydet</RcButton>
            </div>
          </form>
        </div>
      </div>

      <div class="rc-card" style="margin-bottom: 16px">
        <div class="rc-card__head">
          <h2 class="rc-card__title">PDF</h2>
        </div>
        <div class="rc-card__body">
          <p v-if="manifest.pdfFile" class="rcr-row__secondary">
            {{ manifest.pdfFile.fileName }} · {{ formatDateTime(manifest.createdAt) }}
          </p>
          <RcField label="Manifesto PDF yükle">
            <input type="file" accept="application/pdf" class="rc-input" :disabled="uploadingPdf" @change="handlePdfUpload" />
          </RcField>
        </div>
      </div>

      <FeatureGate feature="UETDS_PASSENGERS">
        <div class="rc-card" style="margin-bottom: 16px">
          <div class="rc-card__head">
            <h2 class="rc-card__title">Yolcular</h2>
            <RcButton variant="secondary" size="sm" @click="openImportModal">
              <RcIcon name="upload" :size="14" />
              Toplu yükle (CSV)
            </RcButton>
          </div>
          <div class="rc-card__body">
            <form class="rcs-form-grid" style="margin-bottom: 16px" @submit.prevent="handleAddPassenger">
              <RcField label="Koltuk">
                <input v-model.number="passengerForm.seatNumber" type="number" min="1" class="rc-input rc-num" />
              </RcField>
              <RcField label="Ad soyad *">
                <input v-model="passengerForm.fullName" class="rc-input" required />
              </RcField>
              <RcField label="Uyruk">
                <input v-model="passengerForm.nationality" class="rc-input" />
              </RcField>
              <RcField label="Kimlik / pasaport">
                <input v-model="passengerForm.idNumber" class="rc-input" />
              </RcField>
              <div style="grid-column: 1 / -1">
                <RcButton type="submit" variant="secondary">Yolcu ekle</RcButton>
              </div>
            </form>

            <RcEmpty v-if="passengers.length === 0" title="Yolcu yok" description="Bu sefere yolcu ekleyebilirsiniz" />
            <table v-else class="rc-table rcv-table--slim">
              <thead>
                <tr>
                  <th>Koltuk</th>
                  <th>Ad soyad</th>
                  <th>Uyruk</th>
                  <th>Kimlik</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="passenger in passengers" :key="passenger.id">
                  <td>{{ passenger.seatNumber ?? '—' }}</td>
                  <td>{{ passenger.fullName }}</td>
                  <td>{{ passenger.nationality || '—' }}</td>
                  <td>{{ passenger.idNumber || '—' }}</td>
                  <td class="rc-right">
                    <RcButton variant="ghost" size="sm" @click="handleDeletePassenger(passenger.id)">Sil</RcButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </FeatureGate>

      <FeatureGate feature="UETDS_DOCUMENTS">
        <div class="rc-card">
          <div class="rc-card__head">
            <h2 class="rc-card__title">Belgeler</h2>
          </div>
          <div class="rc-card__body">
            <div class="rcs-form-grid" style="margin-bottom: 16px">
              <RcField label="Belge tipi">
                <select v-model="docUploadType" class="rc-input">
                  <option v-for="type in documentTypes" :key="type" :value="type">
                    {{ FILE_UPLOAD_TYPE_LABELS[type] }}
                  </option>
                </select>
              </RcField>
              <RcField label="Dosya">
                <input type="file" class="rc-input" :disabled="uploadingDoc" @change="handleDocumentUpload" />
              </RcField>
            </div>

            <RcEmpty v-if="documents.length === 0" title="Belge yok" />
            <ul v-else class="rcr-doc-list">
              <li v-for="doc in documents" :key="doc.id">
                <span>{{ doc.fileName }}</span>
                <RcBadge>{{ FILE_UPLOAD_TYPE_LABELS[doc.uploadType as FileUploadType] || doc.uploadType }}</RcBadge>
              </li>
            </ul>
          </div>
        </div>
      </FeatureGate>
    </template>

    <RcModal :open="showImportModal" title="Toplu yolcu listesi yükle (CSV)" @close="closeImportModal">
      <div class="rcs-import">
        <p class="rcr-row__secondary">
          "Ad Soyad, Koltuk No, Uyruk, Kimlik No" başlıklı bir CSV veya Excel (.xlsx) dosyası yükleyin.
          Bu işlem <strong>mevcut yolcu listesinin tamamının yerine geçer.</strong>
        </p>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px">
          <RcButton variant="ghost" size="sm" @click="downloadCsvTemplate">
            <RcIcon name="download" :size="14" />
            CSV şablon indir
          </RcButton>
          <RcButton variant="ghost" size="sm" @click="downloadExcelTemplate">
            <RcIcon name="download" :size="14" />
            Excel şablon indir
          </RcButton>
        </div>
        <RcField label="CSV veya Excel dosyası">
          <input
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="rc-input"
            :disabled="importing"
            @change="handleImportFile"
          />
        </RcField>

        <template v-if="importRows.length > 0">
          <p class="rcr-row__secondary" style="margin-top: 12px">
            {{ selectedImportCount }} / {{ importRows.length }} satır seçili
          </p>
          <table class="rc-table rcv-table--slim">
            <thead>
              <tr>
                <th />
                <th>#</th>
                <th>Ad soyad</th>
                <th>Koltuk</th>
                <th>Uyruk</th>
                <th>Kimlik</th>
                <th>Hata</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in importRows" :key="row.rowNumber" :class="{ 'rcs-import-row--error': row.error }">
                <td>
                  <input
                    type="checkbox"
                    :disabled="!row.passenger"
                    :checked="importSelection.has(row.rowNumber)"
                    @change="toggleImportRow(row.rowNumber)"
                  />
                </td>
                <td>{{ row.rowNumber }}</td>
                <td>{{ row.passenger?.fullName ?? '—' }}</td>
                <td>{{ row.passenger?.seatNumber ?? '—' }}</td>
                <td>{{ row.passenger?.nationality ?? '—' }}</td>
                <td>{{ row.passenger?.idNumber ?? '—' }}</td>
                <td class="rcs-import-row__error">{{ row.error ?? '' }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <template #footer>
        <RcButton variant="secondary" @click="closeImportModal">Vazgeç</RcButton>
        <RcButton
          variant="primary"
          :disabled="importing || selectedImportCount === 0"
          :loading="importing"
          @click="confirmImport"
        >
          {{ selectedImportCount }} yolcuyu kaydet
        </RcButton>
      </template>
    </RcModal>

    <AccountingConfirmModal
      :open="showDeleteConfirm"
      title="Manifestoyu sil"
      message="Bu sefer manifestosu kalıcı olarak silinecek."
      confirm-label="Sil"
      variant="danger"
      @close="showDeleteConfirm = false"
      @confirm="handleDeleteManifest"
    />
  </div>
</template>

<style scoped>
.rcr-doc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rcr-doc-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-radius-md, 6px);
}

.rcs-import-row--error {
  background: var(--rc-danger-bg, rgba(220, 38, 38, 0.06));
}

.rcs-import-row__error {
  color: var(--rc-danger, #dc2626);
  font-size: 12px;
}
</style>
