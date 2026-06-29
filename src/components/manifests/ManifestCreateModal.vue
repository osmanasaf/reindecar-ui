<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { rentalsApi, serviceManifestsApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { toApiDateTime } from '@/utils/datetime'
import type { Rental } from '@/types'
import type { CreateUetdsManifestRequest } from '@/types/manifest'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const toast = useToast()
const mode = ref<'manual' | 'pdf'>('manual')
const loadingRentals = ref(false)
const submitting = ref(false)
const previewing = ref(false)
const rentals = ref<Rental[]>([])
const selectedFile = ref<File | null>(null)
const plateWarning = ref('')

const form = ref({
  rentalId: '' as string | number,
  uetdsTripNumber: '',
  vehiclePlate: '',
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

const selectedRental = computed(() =>
  rentals.value.find((rental) => rental.id === Number(form.value.rentalId)),
)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    resetForm()
    void loadRentals()
  },
)

watch(
  () => form.value.rentalId,
  (rentalId) => {
    const rental = rentals.value.find((item) => item.id === Number(rentalId))
    if (rental?.vehiclePlate && !form.value.vehiclePlate) {
      form.value.vehiclePlate = rental.vehiclePlate
    }
  },
)

function resetForm() {
  mode.value = 'manual'
  selectedFile.value = null
  plateWarning.value = ''
  form.value = {
    rentalId: '',
    uetdsTripNumber: '',
    vehiclePlate: '',
    tripStartAt: '',
    tripEndAt: '',
    documentNumber: '',
    driverName: '',
    driverSrc: '',
    carrierCompanyName: '',
    groupName: '',
    groupRoute: '',
    groupDescription: '',
    groupFeeAmount: '',
    passengerCount: '',
  }
}

async function loadRentals() {
  loadingRentals.value = true
  try {
    const response = await rentalsApi.getActive({ rentalType: 'SERVICE', size: 100 })
    rentals.value = response.content
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Servis kiralamaları yüklenemedi')
  } finally {
    loadingRentals.value = false
  }
}

function buildRequest(): CreateUetdsManifestRequest {
  return {
    rentalId: Number(form.value.rentalId),
    uetdsTripNumber: form.value.uetdsTripNumber.trim(),
    vehiclePlate: form.value.vehiclePlate.trim(),
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
  }
}

async function handlePreviewPdf() {
  if (!form.value.rentalId || !selectedFile.value) {
    toast.error('Kiralama ve PDF dosyası seçin')
    return
  }
  previewing.value = true
  plateWarning.value = ''
  try {
    const preview = await serviceManifestsApi.previewFromPdf(Number(form.value.rentalId), selectedFile.value)
    const parsed = preview.parsed
    form.value.uetdsTripNumber = parsed.uetdsTripNumber || ''
    form.value.vehiclePlate = parsed.vehiclePlate || preview.parsedVehiclePlate || ''
    form.value.tripStartAt = parsed.tripStartAt ? parsed.tripStartAt.replace(' ', 'T').slice(0, 16) : ''
    form.value.tripEndAt = parsed.tripEndAt ? parsed.tripEndAt.replace(' ', 'T').slice(0, 16) : ''
    form.value.documentNumber = parsed.documentNumber || ''
    form.value.driverName = parsed.driverName || ''
    form.value.driverSrc = parsed.driverSrc || ''
    form.value.carrierCompanyName = parsed.carrierCompanyName || ''
    form.value.groupName = parsed.groupName || ''
    form.value.groupRoute = parsed.groupRoute || ''
    form.value.groupDescription = parsed.groupDescription || ''
    form.value.groupFeeAmount = parsed.groupFeeAmount ?? ''
    form.value.passengerCount = parsed.passengerCount ?? ''
    if (!preview.plateMatches) {
      plateWarning.value = `PDF plakası (${preview.parsedVehiclePlate}) kiralama plakası (${preview.rentalVehiclePlate}) ile uyuşmuyor`
    }
    mode.value = 'manual'
    toast.success('PDF alanları forma aktarıldı')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'PDF önizleme başarısız')
  } finally {
    previewing.value = false
  }
}

async function handleSubmit() {
  if (!form.value.rentalId) {
    toast.error('Kiralama seçin')
    return
  }
  submitting.value = true
  try {
    if (mode.value === 'pdf' && selectedFile.value) {
      await serviceManifestsApi.createFromPdf(Number(form.value.rentalId), selectedFile.value)
    } else {
      await serviceManifestsApi.create(buildRequest())
    }
    toast.success('Sefer manifestosu oluşturuldu')
    emit('created')
    emit('close')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Manifesto oluşturulamadı')
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
      <div class="rc-filterbar" style="margin-bottom: 16px">
        <button
          type="button"
          class="rc-chip"
          :class="{ 'rc-chip--on': mode === 'manual' }"
          @click="mode = 'manual'"
        >
          Manuel
        </button>
        <button
          type="button"
          class="rc-chip"
          :class="{ 'rc-chip--on': mode === 'pdf' }"
          @click="mode = 'pdf'"
        >
          PDF Yükle
        </button>
      </div>

      <RcField label="Servis kiralaması *">
        <select v-model="form.rentalId" class="rc-input" :disabled="loadingRentals">
          <option value="">Kiralama seçin</option>
          <option v-for="rental in rentals" :key="rental.id" :value="rental.id">
            {{ rental.rentalNumber }} · {{ rental.vehiclePlate || '—' }} · {{ rental.customerName || 'Müşteri' }}
          </option>
        </select>
      </RcField>

      <template v-if="mode === 'pdf'">
        <RcField label="UETDS PDF *" hint="PDF yüklendikten sonra alanları önizleyip kaydedebilirsiniz">
          <input type="file" accept="application/pdf" class="rc-input" @change="onFileChange" />
        </RcField>
        <div style="display: flex; gap: 8px; margin-bottom: 16px">
          <RcButton variant="secondary" :loading="previewing" @click="handlePreviewPdf">
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
        Seçili kiralama: {{ selectedRental.rentalNumber }} · {{ selectedRental.vehiclePlate }}
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
.rcr-manifest-create__hint {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--rc-text-muted);
}
</style>
