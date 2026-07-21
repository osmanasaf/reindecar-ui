<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { rentalsApi, serviceManifestsApi } from '@/api'
import { useToast, useManifestForm } from '@/composables'
import { RcModal, RcButton, RcField, RcSegTab } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import SearchableSelect from '@/components/common/SearchableSelect.vue'
import type { Rental } from '@/types'
import type { UetdsManifest } from '@/types/manifest'
import { formatDateTime } from '@/utils/format'

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
const plateWarning = ref('')
const selectedRentalId = ref<number | null>(null)

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

const noServiceRentals = computed(
  () => !rentalLocked.value && !loadingRentals.value && rentals.value.length === 0,
)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    resetForm()
    if (rentalLocked.value) {
      selectedRentalId.value = props.rentalId as number
      form.value.vehiclePlate = props.vehiclePlate ?? ''
    } else {
      void loadRentals()
    }
  },
)

watch(selectedRentalId, (rentalId) => {
  const rental = rentals.value.find((item) => item.id === rentalId)
  if (rental?.vehiclePlate && !form.value.vehiclePlate) {
    form.value.vehiclePlate = rental.vehiclePlate
  }
})

function resetForm() {
  mode.value = 'manual'
  selectedFile.value = null
  plateWarning.value = ''
  selectedRentalId.value = null
  resetFormFields()
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

async function handlePreviewPdf() {
  if (!selectedRentalId.value || !selectedFile.value) {
    toast.error('Kiralama ve PDF dosyası seçin')
    return
  }
  previewing.value = true
  plateWarning.value = ''
  try {
    const preview = await serviceManifestsApi.previewFromPdf(selectedRentalId.value, selectedFile.value)
    applyParsed(preview.parsed, preview.parsedVehiclePlate || '')
    if (!preview.plateMatches) {
      plateWarning.value = `PDF plakası (${preview.parsedVehiclePlate}) kiralama plakası (${preview.rentalVehiclePlate}) ile uyuşmuyor`
    }
    mode.value = 'manual'
    toast.success('PDF alanları forma aktarıldı')
  } catch (err) {
    toast.apiError(err, 'PDF önizleme başarısız')
  } finally {
    previewing.value = false
  }
}

async function handleSubmit() {
  if (!selectedRentalId.value) {
    toast.error('Kiralama seçin')
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

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}
</script>

<template>
  <RcModal :open="open" title="Yeni UETDS Manifestosu" wide @close="emit('close')">
    <div class="rcr-manifest-create">
      <div class="rcr-manifest-create__modes">
        <RcSegTab id="manual" :active="mode" @select="mode = 'manual'">Manuel giriş</RcSegTab>
        <RcSegTab id="pdf" :active="mode" @select="mode = 'pdf'">PDF'den aktar</RcSegTab>
      </div>

      <div v-if="rentalLocked" class="rcr-manifest-create__locked">
        <span class="rcr-manifest-create__locked-icon"><RcIcon name="key" :size="15" /></span>
        <div>
          <div class="rcr-manifest-create__locked-title">{{ rentalLabel || `Kiralama #${rentalId}` }}</div>
          <div class="rcr-manifest-create__locked-meta">
            {{ vehiclePlate || '—' }} · Manifest bu kiralamaya bağlanacak
          </div>
        </div>
      </div>

      <template v-else>
        <RcField label="Servis kiralaması *" hint="Yalnızca aktif servis (SERVICE) tipi kiralamalar seçilebilir">
          <SearchableSelect
            v-model="selectedRentalId"
            :options="rentalOptions"
            :loading="loadingRentals"
            placeholder="Kiralama seçin"
            search-placeholder="Kiralama no, plaka veya müşteri ara…"
            clearable
          />
        </RcField>

        <div v-if="noServiceRentals" class="rc-alert rc-alert--info" style="margin-bottom: 16px">
          <RcIcon name="info" :size="16" />
          <span>
            Uygun kiralama bulunamadı. UETDS manifestosu yalnızca <strong>aktif</strong> durumdaki
            <strong>servis (SERVICE)</strong> tipi kiralamalara eklenebilir.
          </span>
        </div>
      </template>

      <template v-if="mode === 'pdf'">
        <RcField label="UETDS PDF *" hint="PDF yüklendikten sonra alanları önizleyip kaydedebilirsiniz">
          <input type="file" accept="application/pdf" class="rc-input" @change="onFileChange" />
        </RcField>
        <div style="display: flex; gap: 8px; margin-bottom: 16px">
          <RcButton variant="secondary" :loading="previewing" @click="handlePreviewPdf">
            <RcIcon name="eye" :size="14" />
            PDF'den Oku
          </RcButton>
        </div>
      </template>

      <div v-if="plateWarning" class="rc-alert rc-alert--danger" style="margin-bottom: 16px">
        <RcIcon name="warning" :size="16" />
        <span>{{ plateWarning }}</span>
      </div>

      <div class="rcs-form-grid">
        <RcField label="UETDS sefer no *">
          <input v-model="form.uetdsTripNumber" class="rc-input" />
        </RcField>
        <RcField label="Plaka *">
          <input v-model="form.vehiclePlate" class="rc-input" />
        </RcField>
        <RcField label="Sefer başlangıç *">
          <input v-model="form.tripStartAt" type="datetime-local" class="rc-input" />
        </RcField>
        <RcField label="Sefer bitiş">
          <input v-model="form.tripEndAt" type="datetime-local" class="rc-input" />
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
        <RcField label="Taşıyıcı firma" style="grid-column: 1 / -1">
          <input v-model="form.carrierCompanyName" class="rc-input" />
        </RcField>
        <RcField label="Grup adı">
          <input v-model="form.groupName" class="rc-input" />
        </RcField>
        <RcField label="Grup ücreti">
          <input v-model.number="form.groupFeeAmount" type="number" min="0" step="0.01" class="rc-input rc-num" />
        </RcField>
        <RcField label="Güzergah" style="grid-column: 1 / -1">
          <input v-model="form.groupRoute" class="rc-input" />
        </RcField>
        <RcField label="Açıklama" style="grid-column: 1 / -1">
          <textarea v-model="form.groupDescription" class="rc-input" rows="3" />
        </RcField>
      </div>

      <p v-if="selectedRental" class="rcr-manifest-create__hint">
        Seçili kiralama: {{ selectedRental.rentalNumber }} · {{ selectedRental.vehiclePlate }} ·
        {{ formatDateTime(selectedRental.startDate) }}
      </p>
    </div>

    <template #footer>
      <RcButton variant="secondary" @click="emit('close')">İptal</RcButton>
      <RcButton variant="primary" :loading="submitting" @click="handleSubmit">
        Kaydet
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rcr-manifest-create__modes {
  display: inline-flex;
  gap: 0;
  border-bottom: 1px solid var(--rc-border);
  margin-bottom: 16px;
  width: 100%;
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
