<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { rentalsApi, serviceManifestsApi } from '@/api'
import { useToast, useManifestForm } from '@/composables'
import { RcModal, RcButton, RcField, RcSegTab, RcDropzone } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import SearchableSelect from '@/components/common/SearchableSelect.vue'
import type { Rental } from '@/types'
import type { UetdsManifest, UetdsManifestPreviewResponse } from '@/types/manifest'
import { formatDateTime } from '@/utils/format'
import { toInputDateTime } from '@/utils/datetime'

const props = defineProps<{
  open: boolean
  rentalId?: number
  rentalLabel?: string
  vehiclePlate?: string
}>()

const emit = defineEmits<{
  close: []
  created: [manifest: UetdsManifest]
}>()

const toast = useToast()
const mode = ref<'manual' | 'pdf'>('manual')
const loadingRentals = ref(false)
const submitting = ref(false)
const previewing = ref(false)
const rentals = ref<Rental[]>([])
const selectedFile = ref<File | null>(null)
const pdfPreview = ref<UetdsManifestPreviewResponse | null>(null)
const selectedRentalId = ref<number | null>(null)
const lockedRental = ref<Rental | null>(null)

const { form, reset: resetFormFields, applyParsed, buildCreatePayload } = useManifestForm()

const rentalLocked = computed(() => props.rentalId != null)

const rentalOptions = computed(() =>
  rentals.value.map((rental) => ({
    value: rental.id,
    label: `${rental.rentalNumber} · ${rental.vehiclePlate || '—'} · ${rental.customerName || 'Müşteri'}`,
  })),
)

const selectedRental = computed(() =>
  rentals.value.find((rental) => rental.id === selectedRentalId.value),
)

const activeRental = computed(() => lockedRental.value ?? selectedRental.value ?? null)

const tripMin = computed(() =>
  activeRental.value ? toInputDateTime(activeRental.value.startDate) : undefined,
)

const tripMax = computed(() =>
  activeRental.value?.endDate ? toInputDateTime(activeRental.value.endDate) : undefined,
)

const noServiceRentals = computed(
  () => !rentalLocked.value && !loadingRentals.value && rentals.value.length === 0,
)

const canSubmit = computed(() =>
  mode.value === 'pdf' ? selectedFile.value !== null : true,
)

const submitLabel = computed(() => (mode.value === 'pdf' ? 'PDF ile oluştur' : 'Kaydet'))

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    resetForm()
    if (rentalLocked.value) {
      selectedRentalId.value = props.rentalId as number
      form.value.vehiclePlate = props.vehiclePlate ?? ''
      void loadLockedRental(props.rentalId as number)
    } else {
      void loadRentals()
    }
  },
)

watch(activeRental, (rental) => {
  if (rental?.vehiclePlate) {
    form.value.vehiclePlate = rental.vehiclePlate
  }
})

async function loadLockedRental(rentalId: number) {
  try {
    lockedRental.value = await rentalsApi.getById(rentalId)
    if (lockedRental.value.vehiclePlate) {
      form.value.vehiclePlate = lockedRental.value.vehiclePlate
    }
  } catch {
    lockedRental.value = null
  }
}

function resetForm() {
  mode.value = 'manual'
  selectedFile.value = null
  pdfPreview.value = null
  selectedRentalId.value = null
  lockedRental.value = null
  resetFormFields()
}

function validateTripDates(): boolean {
  const rental = activeRental.value
  if (!form.value.tripStartAt) {
    toast.error('Sefer başlangıç tarihi zorunludur')
    return false
  }
  if (form.value.tripEndAt && form.value.tripEndAt < form.value.tripStartAt) {
    toast.error('Sefer bitişi başlangıçtan önce olamaz')
    return false
  }
  if (rental) {
    const rentalStart = toInputDateTime(rental.startDate)
    const rentalEnd = rental.endDate ? toInputDateTime(rental.endDate) : null
    if (rentalStart && form.value.tripStartAt < rentalStart) {
      toast.error('Sefer, kiralama başlangıcından önce başlayamaz')
      return false
    }
    if (rentalEnd && (form.value.tripEndAt || form.value.tripStartAt) > rentalEnd) {
      toast.error('Sefer, kiralama bitişinden sonra bitemez')
      return false
    }
  }
  return true
}

async function loadRentals() {
  loadingRentals.value = true
  try {
    const response = await rentalsApi.getActive({ rentalType: 'SERVICE', size: 100 })
    rentals.value = response.content
  } catch (err) {
    toast.apiError(err, 'Servis kiralamaları yüklenemedi')
  } finally {
    loadingRentals.value = false
  }
}

async function handleFilesSelected(files: File[]) {
  const file = files[0]
  if (!file) return
  if (!selectedRentalId.value) {
    toast.error('Önce kiralama seçin')
    return
  }
  selectedFile.value = file
  pdfPreview.value = null
  previewing.value = true
  try {
    pdfPreview.value = await serviceManifestsApi.previewFromPdf(selectedRentalId.value, file)
  } catch (err) {
    toast.apiError(err, 'PDF önizleme başarısız')
    selectedFile.value = null
  } finally {
    previewing.value = false
  }
}

function applyPreviewToForm() {
  const preview = pdfPreview.value
  if (!preview) return
  applyParsed(preview.parsed, preview.parsedVehiclePlate || '')
  if (activeRental.value?.vehiclePlate) {
    form.value.vehiclePlate = activeRental.value.vehiclePlate
  }
  mode.value = 'manual'
  toast.success('PDF alanları forma aktarıldı — belge eklenmeyecek')
}

function clearPdf() {
  selectedFile.value = null
  pdfPreview.value = null
}

async function handleSubmit() {
  if (!selectedRentalId.value) {
    toast.error('Kiralama seçin')
    return
  }
  if (mode.value === 'pdf' && !selectedFile.value) {
    toast.error('PDF dosyası seçin')
    return
  }
  if (mode.value === 'manual' && !validateTripDates()) {
    return
  }
  submitting.value = true
  try {
    let created: UetdsManifest
    if (mode.value === 'pdf' && selectedFile.value) {
      created = await serviceManifestsApi.createFromPdf(selectedRentalId.value, selectedFile.value)
    } else {
      created = await serviceManifestsApi.create(buildCreatePayload(selectedRentalId.value))
    }
    toast.success('Sefer manifestosu oluşturuldu')
    emit('created', created)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Manifesto oluşturulamadı')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal :open="open" title="Yeni UETDS Manifestosu" wide @close="emit('close')">
    <div class="rcr-manifest-create">
      <div class="rc-segtabs rc-segtabs--flush rcr-manifest-create__modes">
        <RcSegTab id="manual" :active="mode" @select="mode = 'manual'">Manuel giriş</RcSegTab>
        <RcSegTab id="pdf" :active="mode" @select="mode = 'pdf'">PDF'den aktar</RcSegTab>
      </div>

      <div v-if="rentalLocked" class="rcr-manifest-create__locked">
        <span class="rcr-manifest-create__locked-icon"><RcIcon name="key" :size="15" /></span>
        <div>
          <div class="rcr-manifest-create__locked-title">
            {{ lockedRental?.rentalNumber || rentalLabel || `Kiralama #${rentalId}` }}
          </div>
          <div class="rcr-manifest-create__locked-meta">
            {{ lockedRental?.vehiclePlate || vehiclePlate || '—' }}
            <template v-if="lockedRental">
              · {{ formatDateTime(lockedRental.startDate) }} —
              {{ lockedRental.endDate ? formatDateTime(lockedRental.endDate) : 'süresiz' }}
            </template>
            · Manifest bu kiralamaya bağlanacak
          </div>
        </div>
      </div>

      <template v-else>
        <RcField
          label="Servis kiralaması"
          required
          hint="Yalnızca aktif servis (SERVICE) tipi kiralamalar seçilebilir"
        >
          <SearchableSelect
            v-model="selectedRentalId"
            :options="rentalOptions"
            :loading="loadingRentals"
            placeholder="Kiralama seçin"
            search-placeholder="Kiralama no, plaka veya müşteri ara…"
            clearable
          />
        </RcField>

        <div v-if="noServiceRentals" class="rc-alert rc-alert--info rcr-manifest-create__alert">
          <RcIcon name="info" :size="16" />
          <span>
            Uygun kiralama bulunamadı. UETDS manifestosu yalnızca <strong>aktif</strong> durumdaki
            <strong>servis (SERVICE)</strong> tipi kiralamalara eklenebilir.
          </span>
        </div>
      </template>

      <!-- PDF'den aktar -->
      <div v-if="mode === 'pdf'" class="rcr-manifest-create__pdf">
        <div v-if="pdfPreview" class="rc-filerow">
          <span class="rc-filerow__badge rc-mono">PDF</span>
          <div class="rc-filerow__text">
            <div class="rc-filerow__name">{{ selectedFile?.name }}</div>
            <div class="rc-filerow__meta">
              Sefer no: {{ pdfPreview.parsed.uetdsTripNumber || '—' }} · Plaka:
              {{ pdfPreview.parsedVehiclePlate || '—' }}
            </div>
          </div>
          <RcButton variant="ghost" size="sm" @click="clearPdf">Kaldır</RcButton>
        </div>

        <RcDropzone
          v-else
          accept="application/pdf"
          icon="filePdf"
          :busy="previewing"
          busy-label="PDF okunuyor…"
          title="PDF'yi buraya sürükle veya seç"
          hint="Yalnızca PDF · alanlar otomatik okunur, plaka doğrulanır"
          @select="handleFilesSelected"
        />

        <div v-if="pdfPreview" class="rc-callout" :class="pdfPreview.plateMatches ? 'rc-callout--ok' : 'rc-callout--warn'">
          <span class="rc-callout__icon">
            <RcIcon :name="pdfPreview.plateMatches ? 'checkCircle' : 'warning'" :size="18" :stroke-width="1.8" />
          </span>
          <div class="rc-callout__text">
            <div class="rc-callout__title">
              {{ pdfPreview.plateMatches ? 'Plaka doğrulandı' : 'Plaka uyuşmazlığı' }}
            </div>
            <div class="rc-callout__desc">
              <template v-if="pdfPreview.plateMatches">
                Belgedeki plaka kiralama aracıyla eşleşiyor. Kaydettiğinizde belge manifestoya eklenir.
              </template>
              <template v-else>
                Belgede <strong>{{ pdfPreview.parsedVehiclePlate || '—' }}</strong>, kiralamada
                <strong>{{ pdfPreview.rentalVehiclePlate || '—' }}</strong> görünüyor. Devam etmeden önce doğrulayın.
              </template>
            </div>
            <div class="rc-callout__actions">
              <RcButton variant="ghost" size="sm" @click="applyPreviewToForm">
                <RcIcon name="edit" :size="14" />
                Alanları forma aktar
              </RcButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Manuel giriş -->
      <div v-else class="rc-modal-form">
        <RcField label="UETDS sefer no" required>
          <input v-model="form.uetdsTripNumber" class="rc-input" />
        </RcField>
        <RcField label="Plaka" :hint="activeRental ? 'Kiralamadaki araçtan alınır' : undefined">
          <input v-model="form.vehiclePlate" class="rc-input" :disabled="!!activeRental" />
        </RcField>
        <RcField label="Sefer başlangıç" required :hint="tripMin ? 'Kiralama aralığı içinde olmalı' : undefined">
          <input v-model="form.tripStartAt" type="datetime-local" class="rc-input" :min="tripMin" :max="tripMax" />
        </RcField>
        <RcField label="Sefer bitiş">
          <input
            v-model="form.tripEndAt"
            type="datetime-local"
            class="rc-input"
            :min="form.tripStartAt || tripMin"
            :max="tripMax"
          />
        </RcField>
        <RcField label="Belge no">
          <input v-model="form.documentNumber" class="rc-input" />
        </RcField>
        <RcField label="Yolcu sayısı">
          <input v-model.number="form.passengerCount" type="number" min="0" class="rc-input rc-num" />
        </RcField>
        <RcField label="Şoför">
          <input v-model="form.driverName" class="rc-input" />
        </RcField>
        <RcField label="SRC">
          <input v-model="form.driverSrc" class="rc-input" />
        </RcField>
        <RcField label="Taşıyıcı firma" class="rc-modal-form__full">
          <input v-model="form.carrierCompanyName" class="rc-input" />
        </RcField>
        <RcField label="Grup adı">
          <input v-model="form.groupName" class="rc-input" />
        </RcField>
        <RcField label="Grup ücreti">
          <input v-model.number="form.groupFeeAmount" type="number" min="0" step="0.01" class="rc-input rc-num" />
        </RcField>
        <RcField label="Güzergah" class="rc-modal-form__full">
          <input v-model="form.groupRoute" class="rc-input" />
        </RcField>
        <RcField label="Açıklama" class="rc-modal-form__full">
          <textarea v-model="form.groupDescription" class="rc-textarea" rows="3" />
        </RcField>
      </div>

      <p v-if="selectedRental" class="rcr-manifest-create__hint">
        Seçili kiralama: {{ selectedRental.rentalNumber }} · {{ selectedRental.vehiclePlate }} ·
        {{ formatDateTime(selectedRental.startDate) }}
      </p>
    </div>

    <template #footer>
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
        {{ submitLabel }}
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rcr-manifest-create__modes {
  margin-bottom: 16px;
}

.rcr-manifest-create__alert {
  margin-bottom: 16px;
}

.rcr-manifest-create__pdf {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rcr-manifest-create__locked {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-8);
  background: var(--rc-surface-2);
  margin-bottom: 16px;
}

.rcr-manifest-create__locked-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--rc-blue-50);
  color: var(--rc-blue-600);
  flex-shrink: 0;
}

.rcr-manifest-create__locked-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--rc-text);
}

.rcr-manifest-create__locked-meta {
  font-size: 12px;
  color: var(--rc-text-muted);
  margin-top: 1px;
}

.rcr-manifest-create__hint {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--rc-text-muted);
}
</style>
