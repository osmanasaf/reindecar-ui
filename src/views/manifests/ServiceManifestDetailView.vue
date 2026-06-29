<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { serviceManifestsApi } from '@/api'
import { FILE_UPLOAD_TYPE_LABELS, type FileUploadType } from '@/api/files.api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import { AccountingConfirmModal } from '@/components/accounting'
import { RcButton, RcEmpty, RcField, RcBadge, RcDetailSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import { toApiDateTime, toInputDateTime } from '@/utils/datetime'
import type { UetdsManifest, UetdsPassenger, CreateUetdsPassengerRequest } from '@/types/manifest'
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
const passengerForm = ref<CreateUetdsPassengerRequest>({
  seatNumber: undefined,
  fullName: '',
  nationality: 'T.C.',
  idNumber: '',
})
const docUploadType = ref<FileUploadType>('UETDS_SEFER_MANIFEST')

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
    await Promise.all([loadPassengers(), loadDocuments()])
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Manifesto yüklenemedi')
    router.push({ name: 'service-manifests' })
  } finally {
    loading.value = false
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
      <div style="display: flex; gap: 8px">
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
</style>
