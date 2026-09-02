<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RcModal, RcButton, RcModalRail, type ModalRailStep } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { rentalsApi } from '@/api'
import { useToast, useValidation, rules, useFeatures } from '@/composables'
import { fmtTRY, formatDate } from '@/utils/format'
import { describeRentalOperationError, type RentalOperationError } from '@/utils/rentalErrors'
import type { Rental, Vehicle } from '@/types'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import FuelLevelSelect from '@/components/rentals/FuelLevelSelect.vue'
import type { FileUploadType } from '@/api/files.api'

const HANDOVER_UPLOAD_TYPES: FileUploadType[] = [
  'HANDOVER_PROTOCOL',
  'HANDOVER_PHOTO',
  'SIGNED_CONTRACT',
  'OTHER',
]

const props = defineProps<{
  open: boolean
  rental: Rental | null
  vehicle: Vehicle | null
  customerName?: string
  vehicleLabel?: string
  branchLabel?: string
  returnBranchLabel?: string
}>()

const emit = defineEmits<{ close: []; activated: [rental: Rental]; documentsChanged: [] }>()

const toast = useToast()
const { isEnabled } = useFeatures()
const fuelTrackingEnabled = computed(() => isEnabled('RENTAL_FUEL_TRACKING'))
const submitting = ref(false)
const downloadingPdf = ref(false)
const step = ref<'form' | 'completed'>('form')

const modalSubtitle = computed(() => {
  if (!props.rental) return ''
  return [props.rental.rentalNumber, props.customerName || props.rental.customerName, props.rental.vehiclePlate]
    .filter(Boolean)
    .join(' · ')
})

const railSteps = computed<ModalRailStep[]>(() => {
  const done = step.value === 'completed'
  return [
    { label: 'Rezerve', state: 'done' },
    { label: 'Teslimat', state: done ? 'done' : 'current' },
    { label: 'Aktif', state: done ? 'current' : 'upcoming' },
  ]
})
const activatedRental = ref<Rental | null>(null)
const submitError = ref<RentalOperationError | null>(null)
const startKm = ref(0)
const startFuelPercent = ref<number | null>(null)

const kmMin = computed(() => props.vehicle?.currentKm ?? 0)

const displayRental = computed(() => activatedRental.value ?? props.rental)

function syncStartKmFromVehicle() {
  startKm.value = kmMin.value
  startFuelPercent.value = null
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    step.value = 'form'
    activatedRental.value = null
    submitError.value = null
    syncStartKmFromVehicle()
  },
)

watch(
  () => [props.open, props.vehicle?.currentKm] as const,
  ([isOpen]) => {
    if (!isOpen) return
    syncStartKmFromVehicle()
  },
  { immediate: true },
)

watch(startKm, (val) => {
  if (val < kmMin.value) {
    startKm.value = kmMin.value
  }
})

const kmRules = computed(() => ({
  startKm: {
    value: startKm.value,
    rules: [
      rules.required('Başlangıç KM zorunludur'),
      rules.minValue(
        kmMin.value,
        `KM en az ${kmMin.value.toLocaleString('tr-TR')} olmalıdır (araç mevcut KM)`,
      ),
    ],
  },
  startFuelPercent: {
    value: startFuelPercent.value,
    rules: [
      {
        validate: (v: unknown) =>
          v == null || v === '' || (Number(v) >= 0 && Number(v) <= 100),
        message: 'Yakıt seviyesi 0 ile 100 arasında olmalıdır',
      },
    ],
  },
}))

const { validateForm, getError, hasError, touch, reset } = useValidation(() => kmRules.value)

async function confirm() {
  if (!props.rental || !validateForm(kmRules.value)) return
  submitting.value = true
  submitError.value = null
  try {
    const updated = await rentalsApi.activate(props.rental.id, {
      startKm: startKm.value,
      startFuelPercent: startFuelPercent.value ?? undefined,
    })
    activatedRental.value = updated
    step.value = 'completed'
    toast.success('Araç teslim edildi — kiralama aktif')
    emit('activated', updated)
  } catch (err) {
    submitError.value = describeRentalOperationError(err, 'Teslimat başarısız')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  reset()
  step.value = 'form'
  activatedRental.value = null
  submitError.value = null
  emit('close')
}

async function downloadHandoverPdf() {
  const rental = displayRental.value
  if (!rental) return
  downloadingPdf.value = true
  try {
    const blob = await rentalsApi.downloadHandoverPdf(rental.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `arac-teslim-tutanagi-${rental.rentalNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success('Teslim tutanağı indirildi')
  } catch (err) {
    toast.apiError(err, 'PDF indirilemedi')
  } finally {
    downloadingPdf.value = false
  }
}
</script>

<template>
  <RcModal
    :open="open && !!displayRental"
    wide
    icon="key"
    :intent="step === 'completed' ? 'success' : 'operation'"
    title="Aracı teslim et · Kiralamayı aktive et"
    :subtitle="modalSubtitle"
    @close="handleClose"
  >
    <RcModalRail :steps="railSteps" class="rc-modal-rail" />

    <template v-if="step === 'form'">
    <div v-if="rental" class="rc-card rcr-modal-card rcr-modal-card--spaced">
      <div class="rc-card__body rcr-modal-meta">
        <div class="rc-meta-row">
          <span class="rc-meta-row__label">Müşteri</span>
          <span class="rc-meta-row__value">{{ customerName || rental.customerName || '—' }}</span>
        </div>
        <div class="rc-meta-row">
          <span class="rc-meta-row__label">Araç</span>
          <span class="rc-meta-row__value">
            {{ vehicleLabel || rental.vehicleName || '—' }} · {{ rental.vehiclePlate || '—' }}
          </span>
        </div>
        <div class="rc-meta-row">
          <span class="rc-meta-row__label">Tarih</span>
          <span class="rc-meta-row__value">
            {{ formatDate(rental.startDate) }} → {{ formatDate(rental.endDate) }} · {{ rental.totalDays }} gün
          </span>
        </div>
        <div class="rc-meta-row">
          <span class="rc-meta-row__label">Şube</span>
          <span class="rc-meta-row__value">
            {{ branchLabel || rental.branchName || '—' }} → {{ returnBranchLabel || rental.returnBranchName || '—' }}
          </span>
        </div>
        <div class="rc-meta-row">
          <span class="rc-meta-row__label">Tutar</span>
          <span class="rc-meta-row__value rc-num">{{ fmtTRY(rental.grandTotal || rental.totalPrice) }}</span>
        </div>
      </div>
    </div>

    <div class="rc-modal-form">
      <div class="rc-field" :class="{ 'rc-field--error': hasError('startKm') }">
        <label class="rc-field__label">Başlangıç KM</label>
        <input
          v-model.number="startKm"
          class="rc-input rc-num"
          type="number"
          :min="kmMin"
          step="1"
          @blur="touch('startKm')"
        />
        <span class="rc-field__hint">
          {{ rental?.vehiclePlate || vehicle?.plateNumber || 'Araç' }} · mevcut KM:
          {{ kmMin.toLocaleString('tr-TR') }}
        </span>
        <span v-if="hasError('startKm')" class="rc-field__error">{{ getError('startKm') }}</span>
      </div>
      <div v-if="fuelTrackingEnabled" class="rc-field rc-modal-form__full" :class="{ 'rc-field--error': hasError('startFuelPercent') }">
        <label class="rc-field__label">Yakıt seviyesi</label>
        <FuelLevelSelect v-model="startFuelPercent" input-id="activate-fuel-percent" />
        <span class="rc-field__hint">
          Teslimattaki depo seviyesi — hazır oranı seçin ya da yüzdeyi elle girin.
          {{ startFuelPercent == null ? 'Girilmezse iadede yakıt farkı hesaplanamaz.' : '' }}
        </span>
        <span v-if="hasError('startFuelPercent')" class="rc-field__error">{{ getError('startFuelPercent') }}</span>
      </div>
    </div>

    <div v-if="rental" class="rcr-modal-docs">
      <div class="rcr-modal-docs__actions">
        <RcButton variant="secondary" size="sm" :disabled="downloadingPdf" @click="downloadHandoverPdf">
          <RcIcon name="download" :size="14" />
          {{ downloadingPdf ? 'İndiriliyor…' : 'Teslim Tutanağı (PDF)' }}
        </RcButton>
      </div>
      <DocumentsSection
        :reference-type="'RENTAL'"
        :reference-id="rental.id"
        title="Teslim belgeleri"
        :upload-types="HANDOVER_UPLOAD_TYPES"
        @uploaded="emit('documentsChanged')"
      />
      <p class="rcr-modal-docs__hint">
        Buraya yüklenen dosyalar kayıt amaçlıdır ve teslim ön koşulunu karşılamaz.
        Teslimat için Belgeler sekmesinden kiralama sözleşmesini ve teslim tutanağını
        "Oluştur" ile hazırlayıp "İmzala" adımını tamamlamanız gerekir.
      </p>
    </div>

    <div v-if="submitError" class="rc-alert rc-alert--danger rc-modal-note">
      <RcIcon name="warning" :size="16" />
      <div>
        <div class="rc-alert__title">{{ submitError.message }}</div>
        <span v-if="submitError.hint">{{ submitError.hint }}</span>
      </div>
    </div>

    <div class="rc-alert rc-alert--info rc-modal-note">
      <RcIcon name="info" :size="16" />
      <span>Teslimatta araç KM'si güncellenir ve kiralama <strong>ACTIVE</strong> durumuna geçer.</span>
    </div>
    </template>

    <template v-else-if="step === 'completed' && displayRental">
      <div class="rcr-return-modal__done">
        <div class="rcr-return-modal__done-icon">
          <RcIcon name="check" :size="36" style="color: var(--rc-success-500)" />
        </div>
        <h3 class="rcr-return-modal__done-title">Teslimat tamamlandı</h3>
        <p class="rcr-return-modal__done-sub">
          Kiralama aktif. İmzalı teslim tutanağının kopyasını buraya yükleyerek arşivleyebilirsiniz.
        </p>
        <RcButton variant="accent" :disabled="downloadingPdf" @click="downloadHandoverPdf">
          <RcIcon name="download" :size="14" />
          {{ downloadingPdf ? 'İndiriliyor…' : 'Teslim Tutanağı (PDF)' }}
        </RcButton>

        <div class="rcr-modal-docs rcr-modal-docs--completed">
          <DocumentsSection
            :reference-type="'RENTAL'"
            :reference-id="displayRental.id"
            title="Teslim belgeleri"
            :upload-types="HANDOVER_UPLOAD_TYPES"
          />
          <p class="rcr-modal-docs__hint">
            İmzalı teslim tutanağı, teslim fotoğrafı veya sözleşmeyi buradan yükleyin.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <template v-if="step === 'form'">
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="handleClose">Vazgeç</RcButton>
      <RcButton variant="accent" :loading="submitting" @click="confirm">
        <RcIcon name="check" :size="14" />
        Teslimatı tamamla
      </RcButton>
      </template>
      <template v-else>
      <span class="rc-spacer" />
      <RcButton variant="accent" @click="handleClose">Tamam</RcButton>
      </template>
    </template>
  </RcModal>
</template>
