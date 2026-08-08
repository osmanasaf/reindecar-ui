<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { rentalsApi, vehiclesApi } from '@/api'
import { useValidation, rules, useToast, useFeatures } from '@/composables'
import { RcModal, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { fmtTRY } from '@/utils/format'
import { describeRentalOperationError, type RentalOperationError } from '@/utils/rentalErrors'
import type {
  Rental,
  Vehicle,
  VehicleReturnForm,
  ReturnPreviewResponse,
  ReturnAdjustmentInput,
  MoneyLike,
} from '@/types'
import DatePicker from '@/components/base/DatePicker.vue'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import FuelLevelSelect from '@/components/rentals/FuelLevelSelect.vue'
import CreatePenaltyModal from '@/components/penalties/CreatePenaltyModal.vue'
import CreateTollModal from '@/components/tolls/CreateTollModal.vue'
import CreateDamageForm from '@/components/vehicles/CreateDamageForm.vue'
import type { FileUploadType } from '@/api/files.api'

const RETURN_UPLOAD_TYPES: FileUploadType[] = [
  'RETURN_PROTOCOL',
  'RETURN_PHOTO',
  'SIGNED_CONTRACT',
  'OTHER',
]

/** Girdi değiştikçe önizlemeyi yeniden istemeden önce beklenen süre. */
const PREVIEW_DEBOUNCE_MS = 400

interface Props {
  visible: boolean
  rentalId: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  completed: [rental: Rental]
}>()

const toast = useToast()
const { isEnabled } = useFeatures()
const fuelTrackingEnabled = computed(() => isEnabled('RENTAL_FUEL_TRACKING'))

const loading = ref(false)
const calculating = ref(false)
const saving = ref(false)
const downloadingPdf = ref(false)
const rental = ref<Rental | null>(null)
const vehicle = ref<Vehicle | null>(null)
const completed = ref(false)
const preview = ref<ReturnPreviewResponse | null>(null)
const submitError = ref<RentalOperationError | null>(null)

const applyEarlyDiscount = ref(false)
const applyLateFee = ref(false)
const applyFuelFee = ref(false)
const earlyDiscountAmount = ref(0)
const lateFeeAmount = ref(0)
const fuelFeeAmount = ref(0)
// Kullanıcı tutarı elle değiştirdiyse sunucu önerisi üzerine yazmaz.
const lateFeeTouched = ref(false)
const earlyDiscountTouched = ref(false)

const showPenaltyModal = ref(false)
const showTollModal = ref(false)
const showDamageForm = ref(false)

const form = ref({
  endKm: 0,
  endFuelPercent: null as number | null,
  actualReturnDate: '',
  notes: '',
})

const startKmRef = computed(() => rental.value?.startKm || 0)
const minReturnDate = computed(() => rental.value?.startDate ?? '')
const plannedEndDate = computed(() => rental.value?.endDate ?? '')

const modalSubtitle = computed(() => {
  if (!rental.value) return ''
  return [rental.value.rentalNumber, rental.value.customerName, vehiclePlate.value]
    .filter(Boolean)
    .join(' · ')
})

const vehiclePlate = computed(
  () => vehicle.value?.plateNumber ?? rental.value?.vehiclePlate ?? '',
)

const vehicleLabel = computed(() => {
  if (vehicle.value) {
    return `${vehicle.value.plateNumber} · ${vehicle.value.brand} ${vehicle.value.model}`
  }
  if (rental.value?.vehiclePlate && rental.value?.vehicleName) {
    return `${rental.value.vehiclePlate} · ${rental.value.vehicleName}`
  }
  return '—'
})

const returnDateStatus = computed(() => {
  if (!form.value.actualReturnDate || !plannedEndDate.value) return null
  const actual = new Date(form.value.actualReturnDate)
  const planned = new Date(plannedEndDate.value)
  if (actual > planned) {
    const days = Math.ceil((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24))
    return { type: 'late' as const, days }
  }
  if (actual < planned) {
    const days = Math.ceil((planned.getTime() - actual.getTime()) / (1000 * 60 * 60 * 24))
    return { type: 'early' as const, days }
  }
  return { type: 'ontime' as const, days: 0 }
})

const inputRules = computed(() => ({
  endKm: {
    value: form.value.endKm,
    rules: [
      rules.required(),
      rules.minValue(startKmRef.value, `KM değeri başlangıç KM'den (${startKmRef.value}) büyük olmalıdır`),
    ],
  },
  actualReturnDate: {
    value: form.value.actualReturnDate,
    rules: [
      rules.required(),
      {
        validate: (v: unknown) => !v || !minReturnDate.value || String(v) >= minReturnDate.value,
        message: `İade tarihi kiralama başlangıç tarihinden (${formatDate(minReturnDate.value)}) önce olamaz`,
      },
    ],
  },
  endFuelPercent: {
    value: form.value.endFuelPercent,
    rules: [
      // Sunucu, yakıt takibi açıkken bu alanı zorunlu tutuyor
      // (RentalService.completeRental). Aynı kuralı burada da uygula ki
      // kullanıcı hatayı gönderdikten sonra değil, alanda görsün.
      {
        validate: (v: unknown) => !fuelTrackingEnabled.value || (v != null && v !== ''),
        message: 'İade yakıt seviyesi zorunludur',
      },
      {
        validate: (v: unknown) =>
          v == null || v === '' || (Number(v) >= 0 && Number(v) <= 100),
        message: 'Yakıt seviyesi 0 ile 100 arasında olmalıdır',
      },
    ],
  },
}))

const { validateForm, getError, hasError, touch, reset } = useValidation(() => inputRules.value)

const totalKm = computed(() => {
  if (!rental.value?.startKm) return 0
  return Math.max(0, form.value.endKm - rental.value.startKm)
})

function moneyAmount(amount: MoneyLike | number | null | undefined): number {
  if (amount == null) return 0
  return typeof amount === 'number' ? amount : (amount.amount ?? 0)
}

const fuelDeficitPercent = computed(() => {
  const deficit = preview.value?.fuelDeficitPercent ?? 0
  return typeof deficit === 'number' ? deficit : Number(deficit) || 0
})

/** Sunucuya giden düzenlemeler; önizleme ve tamamlama aynı değerleri kullanır. */
const adjustments = computed<ReturnAdjustmentInput>(() => ({
  applyLateFee: applyLateFee.value,
  lateFeeAmount: applyLateFee.value ? lateFeeAmount.value : undefined,
  applyFuelFee: applyFuelFee.value,
  fuelFeeAmount: applyFuelFee.value ? fuelFeeAmount.value : undefined,
  applyEarlyDiscount: applyEarlyDiscount.value,
  earlyDiscountAmount: applyEarlyDiscount.value ? earlyDiscountAmount.value : undefined,
}))

/* Tutarların tamamı sunucudan gelir; burada toplama yapılmaz (bkz.
   ReturnPreviewResponse.finalTotal — tamamlamanın alacak kurallarını aynalar). */
const baseRentalAmount = computed(() => moneyAmount(preview.value?.baseRentalAmount))
const finalTotal = computed(() => moneyAmount(preview.value?.finalTotal))
/* Sürüm kayması koruması: tutarı hesaplayan sunucu alanı yoksa ₺0 göstermek
   yanıltıcı olur — tutar yerine "—" çıkar. */
const hasServerTotal = computed(() => preview.value?.finalTotal != null)
const finalTotalLabel = computed(() => (hasServerTotal.value ? fmtTRY(finalTotal.value) : '—'))
const kmPenalty = computed(() => moneyAmount(preview.value?.kmPenalty))
const openItemsTotal = computed(() => {
  if (!preview.value) return 0
  return (
    moneyAmount(preview.value.penaltyTotal) +
    moneyAmount(preview.value.damageTotal) +
    moneyAmount(preview.value.tollTotal)
  )
})
const hasOpenItems = computed(
  () =>
    (preview.value?.penalties?.length ?? 0) > 0 ||
    (preview.value?.tolls?.length ?? 0) > 0 ||
    (preview.value?.damages?.length ?? 0) > 0,
)

const previewInputsValid = computed(
  () =>
    !!props.rentalId &&
    !!form.value.actualReturnDate &&
    form.value.endKm >= startKmRef.value &&
    (form.value.endFuelPercent == null ||
      (form.value.endFuelPercent >= 0 && form.value.endFuelPercent <= 100)),
)

async function fetchRental() {
  if (!props.rentalId) return

  loading.value = true
  vehicle.value = null
  try {
    rental.value = await rentalsApi.getById(props.rentalId)
    if (rental.value.vehicleId) {
      vehicle.value = await vehiclesApi.getById(rental.value.vehicleId)
    }
    const startKm = rental.value.startKm ?? 0
    form.value.endKm =
      vehicle.value?.currentKm && vehicle.value.currentKm > startKm
        ? vehicle.value.currentKm
        : startKm
    const today = new Date()
    form.value.actualReturnDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    await runPreview()
  } catch {
    toast.error('Kiralama bilgileri yüklenemedi')
    emit('close')
  } finally {
    loading.value = false
  }
}

let previewTimer: ReturnType<typeof setTimeout> | undefined
/** Yarışan yanıtların eskisini yenisinin üzerine yazmasını engeller. */
let previewRequestId = 0

async function runPreview() {
  if (!props.rentalId || !previewInputsValid.value) return

  const requestId = ++previewRequestId
  calculating.value = true
  try {
    const result = await rentalsApi.previewReturn(
      props.rentalId,
      form.value.endKm,
      form.value.actualReturnDate,
      form.value.endFuelPercent ?? undefined,
      adjustments.value,
    )
    if (requestId !== previewRequestId) return
    preview.value = result
    syncSuggestedAmounts(result)
  } catch (err) {
    if (requestId !== previewRequestId) return
    toast.apiError(err, 'Hesaplama yapılamadı')
  } finally {
    if (requestId === previewRequestId) calculating.value = false
  }
}

function schedulePreview() {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(runPreview, PREVIEW_DEBOUNCE_MS)
}

/** Kullanıcının elle girdiği tutarlar korunur; yalnız dokunulmamışlar güncellenir. */
function syncSuggestedAmounts(result: ReturnPreviewResponse) {
  if (!lateFeeTouched.value) {
    lateFeeAmount.value = moneyAmount(result.lateFee)
  }
  if (!earlyDiscountTouched.value) {
    earlyDiscountAmount.value = moneyAmount(result.earlyDiscount)
  }
}

function initializeAdjustmentDefaults(result: ReturnPreviewResponse) {
  applyEarlyDiscount.value = result.earlyDays > 0
  applyLateFee.value = result.lateDays > 0
  applyFuelFee.value = (Number(result.fuelDeficitPercent) || 0) > 0
  lateFeeAmount.value = moneyAmount(result.lateFee)
  earlyDiscountAmount.value = moneyAmount(result.earlyDiscount)
  // Yakıt bedelinin sunucu önerisi yok; tutar elle girilmezse yansıtılmaz.
  fuelFeeAmount.value = 0
}

/** İlk önizleme gelince varsayılan seçimleri kur, sonrasında kullanıcıyı ezme. */
let defaultsApplied = false
watch(preview, (value) => {
  if (!value || defaultsApplied) return
  defaultsApplied = true
  initializeAdjustmentDefaults(value)
  schedulePreview()
})

watch(
  () => [
    form.value.endKm,
    form.value.actualReturnDate,
    form.value.endFuelPercent,
    applyLateFee.value,
    lateFeeAmount.value,
    applyFuelFee.value,
    fuelFeeAmount.value,
    applyEarlyDiscount.value,
    earlyDiscountAmount.value,
  ],
  () => {
    if (!defaultsApplied) return
    schedulePreview()
  },
)

function focusFirstInvalidField() {
  nextTick(() => {
    const el = document.querySelector<HTMLElement>(
      '.rc-overlay .rc-field--error input, .rc-overlay .rc-field--error textarea',
    )
    el?.focus()
  })
}

async function completeReturn() {
  if (!props.rentalId) return
  if (!validateForm(inputRules.value)) {
    focusFirstInvalidField()
    return
  }

  saving.value = true
  submitError.value = null
  try {
    const completeRequest: VehicleReturnForm = {
      endKm: form.value.endKm,
      endFuelPercent: form.value.endFuelPercent ?? undefined,
      actualReturnDate: form.value.actualReturnDate,
      notes: form.value.notes.trim() || undefined,
    }

    if (preview.value && preview.value.earlyDays > 0) {
      completeRequest.applyEarlyDiscount = applyEarlyDiscount.value
      if (applyEarlyDiscount.value) {
        completeRequest.earlyDiscountAmount = earlyDiscountAmount.value
      }
    }

    if (preview.value && preview.value.lateDays > 0) {
      completeRequest.applyLateFee = applyLateFee.value
      if (applyLateFee.value) {
        completeRequest.lateFeeAmount = lateFeeAmount.value
      }
    }

    if (preview.value && fuelDeficitPercent.value > 0) {
      completeRequest.applyFuelFee = applyFuelFee.value
      if (applyFuelFee.value) {
        completeRequest.fuelFeeAmount = fuelFeeAmount.value
      }
    }

    const updatedRental = await rentalsApi.complete(props.rentalId, completeRequest)
    rental.value = updatedRental
    toast.success('Kiralama başarıyla sonlandırıldı')
    emit('completed', updatedRental)
    completed.value = true
  } catch (err) {
    submitError.value = describeRentalOperationError(err, 'Kiralama sonlandırılamadı')
  } finally {
    saving.value = false
  }
}

async function downloadCompletionPdf() {
  if (!props.rentalId || !rental.value) return

  downloadingPdf.value = true
  try {
    const blob = await rentalsApi.downloadCompletionPdf(props.rentalId)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `iade-tamamlama-tutanagi-${rental.value.rentalNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success('İade / tamamlama tutanağı indirildi')
  } catch (err) {
    toast.apiError(err, 'PDF indirilemedi')
  } finally {
    downloadingPdf.value = false
  }
}

/** Kısayoldan kalem eklenince açık kalemler listesi hemen tazelenir. */
function onExtraItemCreated() {
  showPenaltyModal.value = false
  showTollModal.value = false
  showDamageForm.value = false
  void runPreview()
}

function handleClose() {
  clearTimeout(previewTimer)
  previewRequestId++
  reset()
  completed.value = false
  defaultsApplied = false
  preview.value = null
  submitError.value = null
  applyEarlyDiscount.value = false
  applyLateFee.value = false
  applyFuelFee.value = false
  earlyDiscountAmount.value = 0
  lateFeeAmount.value = 0
  fuelFeeAmount.value = 0
  lateFeeTouched.value = false
  earlyDiscountTouched.value = false
  showPenaltyModal.value = false
  showTollModal.value = false
  showDamageForm.value = false
  rental.value = null
  vehicle.value = null
  form.value = { endKm: 0, endFuelPercent: null, actualReturnDate: '', notes: '' }
  emit('close')
}

function formatMoney(amount: MoneyLike | number | null | undefined): string {
  return fmtTRY(moneyAmount(amount))
}

function formatDate(date: unknown): string {
  if (!date) return '-'
  const d = new Date(String(date))
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

watch(
  () => [props.visible, props.rentalId] as const,
  ([isVisible, id]) => {
    if (isVisible && id) {
      reset()
      completed.value = false
      defaultsApplied = false
      preview.value = null
      submitError.value = null
      fetchRental()
    }
  },
  { immediate: true },
)

onUnmounted(() => clearTimeout(previewTimer))
</script>

<template>
  <RcModal
    :open="visible"
    xl
    icon="arrowRight"
    :title="completed ? 'İade tamamlandı' : 'İade al · Kiralamayı kapat'"
    :subtitle="modalSubtitle"
    :intent="completed ? 'success' : 'operation'"
    @close="handleClose"
  >
    <div v-if="loading" class="rcr-return-modal__loading">
      <div class="rcr-return-modal__spinner" />
      <span>Yükleniyor…</span>
    </div>

    <template v-else-if="rental">
      <!-- Tamamlandı -->
      <div v-if="completed" class="rcr-return-modal__done">
        <div class="rcr-return-modal__done-icon">
          <RcIcon name="check" :size="36" style="color: var(--rc-success-500)" />
        </div>
        <h3 class="rcr-return-modal__done-title">İade tamamlandı</h3>
        <p class="rcr-return-modal__done-sub">
          Araç müsait duruma alındı. İade / tamamlama tutanağını PDF olarak indirebilirsiniz.
        </p>
        <RcButton variant="accent" :disabled="downloadingPdf" @click="downloadCompletionPdf">
          <RcIcon name="download" :size="14" />
          {{ downloadingPdf ? 'İndiriliyor…' : 'İade / Tamamlama Tutanağı (PDF)' }}
        </RcButton>

        <div class="rcr-modal-docs rcr-modal-docs--completed">
          <DocumentsSection
            :reference-type="'RENTAL'"
            :reference-id="rental.id"
            title="İade belgeleri"
            :upload-types="RETURN_UPLOAD_TYPES"
          />
        </div>
      </div>

      <!-- Tek ekran: girdiler + canlı hesap -->
      <template v-else>
        <div class="rcr-return-railrow">
          <div class="rc-status-rail">
            <span class="rc-status-step rc-status-step--done">
              <span class="rc-status-step__dot"><RcIcon name="check" :size="10" /></span>
              Aktif
            </span>
            <RcIcon name="chevronRight" :size="14" class="rc-status-step__chev" />
            <span class="rc-status-step rc-status-step--current">
              <span class="rc-status-step__dot">2</span>
              İade
            </span>
            <RcIcon name="chevronRight" :size="14" class="rc-status-step__chev" />
            <span class="rc-status-step">
              <span class="rc-status-step__dot">3</span>
              Tamamlandı
            </span>
          </div>
          <span
            v-if="plannedEndDate"
            class="rcr-return-railrow__note"
            :class="{ 'rcr-return-railrow__note--late': returnDateStatus?.type === 'late' }"
          >
            Planlanan iade: {{ formatDate(plannedEndDate) }}
            <template v-if="returnDateStatus?.type === 'late'">
              — {{ returnDateStatus.days }} gün geçti
            </template>
          </span>
        </div>

        <div class="rcr-return-layout">
          <!-- Sol: girdiler -->
          <div class="rcr-return-main">
            <div class="rc-card rcr-return-modal__meta">
              <div class="rc-card__body rcr-modal-meta">
                <div class="rc-meta-row">
                  <span class="rc-meta-row__label">Müşteri</span>
                  <span class="rc-meta-row__value">{{ rental.customerName || '—' }}</span>
                </div>
                <div class="rc-meta-row">
                  <span class="rc-meta-row__label">Araç</span>
                  <span class="rc-meta-row__value">{{ vehicleLabel }}</span>
                </div>
                <div v-if="rental.startKm" class="rc-meta-row">
                  <span class="rc-meta-row__label">Çıkış KM</span>
                  <span class="rc-meta-row__value rc-num">{{ rental.startKm.toLocaleString('tr-TR') }} km</span>
                </div>
                <div v-if="fuelTrackingEnabled && rental.startFuelPercent != null" class="rc-meta-row">
                  <span class="rc-meta-row__label">Çıkış yakıt</span>
                  <span class="rc-meta-row__value rc-num">%{{ rental.startFuelPercent.toLocaleString('tr-TR') }}</span>
                </div>
              </div>
            </div>

            <div class="rc-modal-form rcr-return-form">
              <div class="rc-field" :class="{ 'rc-field--error': hasError('endKm') }">
                <label class="rc-field__label">İade KM<span class="rc-field__required" aria-hidden="true">*</span></label>
                <input
                  v-model.number="form.endKm"
                  class="rc-input"
                  type="number"
                  :min="rental.startKm || 0"
                  @blur="touch('endKm')"
                />
                <span v-if="totalKm > 0 && !hasError('endKm')" class="rc-field__hint">
                  Çıkış {{ (rental.startKm ?? 0).toLocaleString('tr-TR') }} km → kullanılan
                  {{ totalKm.toLocaleString('tr-TR') }} km
                  <template v-if="preview && preview.kmOverage > 0">
                    · aşım {{ preview.kmOverage.toLocaleString('tr-TR') }} km
                  </template>
                </span>
                <span v-if="hasError('endKm')" class="rc-field__error">{{ getError('endKm') }}</span>
              </div>

              <div class="rc-field" :class="{ 'rc-field--error': hasError('actualReturnDate') }">
                <DatePicker
                  v-model="form.actualReturnDate"
                  label="Gerçek iade tarihi"
                  placeholder="İade tarihi"
                  :min="minReturnDate"
                  @closed="touch('actualReturnDate')"
                />
                <span
                  v-if="returnDateStatus && !hasError('actualReturnDate')"
                  class="rc-field__hint"
                  :class="{
                    'rcr-return-date-hint--late': returnDateStatus.type === 'late',
                    'rcr-return-date-hint--ok': returnDateStatus.type !== 'late',
                  }"
                >
                  <template v-if="returnDateStatus.type === 'late'">
                    Planlanan tarihten {{ returnDateStatus.days }} gün geç
                  </template>
                  <template v-else-if="returnDateStatus.type === 'early'">
                    {{ returnDateStatus.days }} gün erken iade
                  </template>
                  <template v-else>Planlanan tarihte iade</template>
                </span>
                <span v-if="hasError('actualReturnDate')" class="rc-field__error">{{ getError('actualReturnDate') }}</span>
              </div>

              <div
                v-if="fuelTrackingEnabled"
                class="rc-field rc-modal-form__full"
                :class="{ 'rc-field--error': hasError('endFuelPercent') }"
              >
                <label class="rc-field__label">
                  İade yakıt seviyesi<span class="rc-field__required" aria-hidden="true">*</span>
                </label>
                <FuelLevelSelect
                  v-model="form.endFuelPercent"
                  input-id="return-fuel-percent"
                  :reference-percent="rental.startFuelPercent ?? null"
                  reference-label="Çıkış"
                />
                <span v-if="hasError('endFuelPercent')" class="rc-field__error">{{ getError('endFuelPercent') }}</span>
                <span v-else class="rc-field__hint">
                  İade anındaki depo seviyesi — hazır oranı seçin ya da yüzdeyi elle girin
                </span>
              </div>

              <div class="rc-field rc-modal-form__full">
                <label class="rc-field__label">İade notu (opsiyonel)</label>
                <textarea
                  v-model="form.notes"
                  class="rc-textarea"
                  rows="2"
                  placeholder="Araç durumu, teslim detayı…"
                />
              </div>
            </div>

            <div class="rcr-return-shortcuts">
              <span class="rcr-return-shortcuts__label">Araçta gördünüz mü?</span>
              <RcButton variant="secondary" size="sm" @click="showDamageForm = true">
                <RcIcon name="plus" :size="13" /> Hasar kaydı
              </RcButton>
              <RcButton variant="secondary" size="sm" @click="showPenaltyModal = true">
                <RcIcon name="plus" :size="13" /> Trafik cezası
              </RcButton>
              <RcButton variant="secondary" size="sm" @click="showTollModal = true">
                <RcIcon name="plus" :size="13" /> HGS geçişi
              </RcButton>
            </div>

            <div class="rcr-modal-docs">
              <DocumentsSection
                :reference-type="'RENTAL'"
                :reference-id="rental.id"
                title="İade belgeleri"
                :upload-types="RETURN_UPLOAD_TYPES"
              />
              <p class="rcr-modal-docs__hint">
                İade fotoğrafı ve imzalı iade/tamamlama tutanağını burada yükleyebilirsiniz.
                İşlemi tamamlamadan da belge eklenebilir.
              </p>
            </div>
          </div>

          <!-- Sağ: canlı hesap -->
          <aside class="rcr-live" :class="{ 'rcr-live--busy': calculating }">
            <div class="rcr-live__head">
              <span class="rcr-live__title">Canlı hesap</span>
              <span class="rcr-live__pill">Önizleme</span>
            </div>

            <div class="rcr-live__row">
              <span>Kiralama bedeli</span>
              <span class="rc-num">{{ fmtTRY(baseRentalAmount) }}</span>
            </div>

            <div class="rcr-live__section">Girdilerden hesaplanan</div>

            <!-- KM aşımı: backend koşulsuz uyguluyor, kullanıcı kapatamaz. -->
            <div v-if="kmPenalty > 0" class="rcr-live__row rcr-live__row--fixed">
              <span>
                KM aşımı
                <em v-if="preview" class="rcr-live__meta">
                  {{ preview.kmOverage.toLocaleString('tr-TR') }} km
                </em>
              </span>
              <span class="rc-num">{{ fmtTRY(kmPenalty) }}</span>
            </div>

            <div v-if="preview && preview.lateDays > 0" class="rcr-live__row">
              <label class="rcr-live__check">
                <input v-model="applyLateFee" type="checkbox" />
                <span>
                  Geç iade
                  <em class="rcr-live__meta">{{ preview.lateDays }} gün</em>
                </span>
              </label>
              <input
                v-model.number="lateFeeAmount"
                class="rc-input rcr-live__amount"
                type="number"
                min="0"
                step="0.01"
                :disabled="!applyLateFee"
                @input="lateFeeTouched = true"
              />
            </div>

            <div v-if="preview && preview.earlyDays > 0" class="rcr-live__row rcr-live__row--credit">
              <label class="rcr-live__check">
                <input v-model="applyEarlyDiscount" type="checkbox" />
                <span>
                  Erken iade indirimi
                  <em class="rcr-live__meta">{{ preview.earlyDays }} gün</em>
                </span>
              </label>
              <input
                v-model.number="earlyDiscountAmount"
                class="rc-input rcr-live__amount"
                type="number"
                min="0"
                step="0.01"
                :disabled="!applyEarlyDiscount"
                @input="earlyDiscountTouched = true"
              />
            </div>

            <div v-if="fuelTrackingEnabled && fuelDeficitPercent > 0" class="rcr-live__row">
              <label class="rcr-live__check">
                <input v-model="applyFuelFee" type="checkbox" />
                <span>
                  Yakıt farkı
                  <em class="rcr-live__meta">%{{ fuelDeficitPercent.toLocaleString('tr-TR') }} eksik</em>
                </span>
              </label>
              <input
                v-model.number="fuelFeeAmount"
                class="rc-input rcr-live__amount"
                type="number"
                min="0"
                step="0.01"
                :disabled="!applyFuelFee"
              />
            </div>
            <p v-if="applyFuelFee && fuelFeeAmount <= 0" class="rcr-live__warn">
              Yakıt bedeli için tutar girilmedi — bu haliyle yansıtılmaz.
            </p>

            <template v-if="hasOpenItems">
              <div class="rcr-live__section">Açık kalemler</div>
              <div v-for="(p, i) in preview?.penalties ?? []" :key="`p-${i}`" class="rcr-live__row rcr-live__row--fixed">
                <span>{{ p.penaltyNumber }} <em class="rcr-live__meta">{{ p.violationType }}</em></span>
                <span class="rc-num">{{ formatMoney(p.amount) }}</span>
              </div>
              <div v-for="(t, i) in preview?.tolls ?? []" :key="`t-${i}`" class="rcr-live__row rcr-live__row--fixed">
                <span>{{ t.tollNumber }}</span>
                <span class="rc-num">{{ formatMoney(t.amount) }}</span>
              </div>
              <div v-for="(d, i) in preview?.damages ?? []" :key="`d-${i}`" class="rcr-live__row rcr-live__row--fixed">
                <span>{{ d.description }}</span>
                <span class="rc-num">{{ formatMoney(d.estimatedCost) }}</span>
              </div>
            </template>

            <div class="rcr-live__row rcr-live__row--sub">
              <span>Ek ücretler</span>
              <span class="rc-num">{{ openItemsTotal + kmPenalty === 0 ? 'Yok' : fmtTRY(openItemsTotal + kmPenalty) }}</span>
            </div>

            <div class="rcr-live__total">
              <span>Tahmini nihai tutar</span>
              <span class="rc-num">{{ finalTotalLabel }}</span>
            </div>

            <p class="rcr-live__note">
              Tutarlar öneridir — işaretli kalemlerin tutarını elle değiştirebilirsiniz.
              Hesap sunucuda yapılır.
            </p>
          </aside>
        </div>

        <div v-if="submitError" class="rc-alert rc-alert--danger rcr-return-submit-error">
          <RcIcon name="warning" :size="16" />
          <div>
            <div class="rc-alert__title">{{ submitError.message }}</div>
            <span v-if="submitError.hint">{{ submitError.hint }}</span>
          </div>
        </div>
      </template>
    </template>

    <div v-else-if="visible && !rentalId" class="rcr-return-modal__empty">
      <RcIcon name="warning" :size="20" style="color: var(--rc-warning-700)" />
      <span>Kiralama seçilemedi. Sayfayı yenileyip tekrar deneyin.</span>
    </div>

    <template #footer>
      <template v-if="!loading && rental">
        <span class="rc-spacer" />
        <template v-if="completed">
          <RcButton variant="accent" @click="handleClose">Tamam</RcButton>
        </template>
        <template v-else>
          <RcButton variant="ghost" :disabled="saving" @click="handleClose">Vazgeç</RcButton>
          <RcButton variant="accent" :loading="saving" @click="completeReturn">
            <RcIcon name="check" :size="14" />
            İadeyi tamamla<template v-if="hasServerTotal"> · {{ finalTotalLabel }}</template>
          </RcButton>
        </template>
      </template>
    </template>
  </RcModal>

  <!-- Kısayollar: kaydedilen kalem açık kalemlere anında düşer -->
  <CreatePenaltyModal
    v-if="rental"
    :show="showPenaltyModal"
    :rental-id="rental.id"
    :vehicle-id="rental.vehicleId"
    :customer-id="rental.customerId"
    @close="showPenaltyModal = false"
    @success="onExtraItemCreated"
  />
  <CreateTollModal
    v-if="rental"
    :open="showTollModal"
    :rental-id="rental.id"
    :vehicle-id="rental.vehicleId"
    :customer-id="rental.customerId"
    @close="showTollModal = false"
    @created="onExtraItemCreated"
  />
  <CreateDamageForm
    v-if="showDamageForm && rental"
    :vehicle-id="rental.vehicleId"
    :rental-id="rental.id"
    @close="showDamageForm = false"
    @created="onExtraItemCreated"
  />
</template>
