<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { rentalsApi, vehiclesApi } from '@/api'
import { useValidation, rules, useToast } from '@/composables'
import { RcModal, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { fmtTRY } from '@/utils/format'
import type { Rental, Vehicle, VehicleReturnForm, ReturnPreviewResponse } from '@/types'
import DatePicker from '@/components/base/DatePicker.vue'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import type { FileUploadType } from '@/api/files.api'

const RETURN_UPLOAD_TYPES: FileUploadType[] = [
  'RETURN_PROTOCOL',
  'RETURN_PHOTO',
  'SIGNED_CONTRACT',
  'OTHER',
]

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
const loading = ref(false)
const calculating = ref(false)
const saving = ref(false)
const downloadingPdf = ref(false)
const rental = ref<Rental | null>(null)
const vehicle = ref<Vehicle | null>(null)
const step = ref<'input' | 'preview' | 'completed'>('input')
const preview = ref<ReturnPreviewResponse | null>(null)
const applyEarlyDiscount = ref(false)
const applyLateFee = ref(false)
const applyFuelFee = ref(false)
const earlyDiscountAmount = ref(0)
const lateFeeAmount = ref(0)
const fuelFeeAmount = ref(0)
const fuelPricePerLiter = ref(0)

const form = ref({
  endKm: 0,
  endFuelLiters: null as number | null,
  actualReturnDate: '',
  notes: '',
})

const startKmRef = computed(() => rental.value?.startKm || 0)
const minReturnDate = computed(() => rental.value?.startDate ?? '')
const plannedEndDate = computed(() => rental.value?.endDate ?? '')

const modalTitle = computed(() => {
  if (step.value === 'preview') return 'İade önizleme'
  if (step.value === 'completed') return 'İade tamamlandı'
  return 'İade al · Kiralamayı kapat'
})

const modalSubtitle = computed(() =>
  rental.value ? `${rental.value.rentalNumber} · ${rental.value.customerName || ''}` : '',
)

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
  endFuelLiters: {
    value: form.value.endFuelLiters,
    rules: [
      {
        validate: (v: unknown) => v == null || v === '' || Number(v) >= 0,
        message: 'İade depo litre değeri negatif olamaz',
      },
    ],
  },
}))

const { validateForm, getError, hasError, touch, reset } = useValidation(() => inputRules.value)

const totalKm = computed(() => {
  if (!rental.value?.startKm) return 0
  return Math.max(0, form.value.endKm - rental.value.startKm)
})

function moneyAmount(amount: number | { amount: number; currency: string } | null | undefined): number {
  if (amount == null) return 0
  return typeof amount === 'number' ? amount : (amount.amount ?? 0)
}

const fuelDeficitLiters = computed(() => {
  const deficit = preview.value?.fuelDeficitLiters ?? 0
  return typeof deficit === 'number' ? deficit : Number(deficit) || 0
})

const suggestedFuelFee = computed(() => {
  if (fuelDeficitLiters.value <= 0 || fuelPricePerLiter.value <= 0) return 0
  return Math.round(fuelDeficitLiters.value * fuelPricePerLiter.value * 100) / 100
})

function initializePreviewAdjustments() {
  if (!preview.value) return
  applyEarlyDiscount.value = preview.value.earlyDays > 0
  applyLateFee.value = preview.value.lateDays > 0
  applyFuelFee.value = fuelDeficitLiters.value > 0
  earlyDiscountAmount.value = moneyAmount(preview.value.earlyDiscount)
  lateFeeAmount.value = moneyAmount(preview.value.lateFee)
  fuelFeeAmount.value = suggestedFuelFee.value
}

const estimatedFinalTotal = computed(() => {
  if (!preview.value || !rental.value) return 0

  const baseRental = (rental.value.totalPrice || 0) - (rental.value.discountAmount || 0)
  const kmPenalty = moneyAmount(preview.value.kmPenalty)
  const penaltyTotal = moneyAmount(preview.value.penaltyTotal)
  const damageTotal = moneyAmount(preview.value.damageTotal)
  const tollTotal = moneyAmount(preview.value.tollTotal)

  let total = baseRental + kmPenalty + penaltyTotal + damageTotal + tollTotal
  if (applyLateFee.value) total += lateFeeAmount.value
  if (applyFuelFee.value) total += fuelFeeAmount.value
  if (applyEarlyDiscount.value) total -= earlyDiscountAmount.value
  return Math.max(0, total)
})

const previewExtraTotal = computed(() => {
  if (!preview.value) return 0
  return (
    moneyAmount(preview.value.kmPenalty) +
    moneyAmount(preview.value.penaltyTotal) +
    moneyAmount(preview.value.damageTotal) +
    moneyAmount(preview.value.tollTotal)
  )
})

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
  } catch {
    toast.error('Kiralama bilgileri yüklenemedi')
    emit('close')
  } finally {
    loading.value = false
  }
}

async function calculatePreview() {
  if (!validateForm(inputRules.value)) {
    toast.error('Lütfen formdaki hataları düzeltin')
    return
  }
  if (!props.rentalId) return

  calculating.value = true
  try {
    preview.value = await rentalsApi.previewReturn(
      props.rentalId,
      form.value.endKm,
      form.value.actualReturnDate,
      form.value.endFuelLiters ?? undefined,
    )
    initializePreviewAdjustments()
    step.value = 'preview'
  } catch (err) {
    toast.apiError(err, 'Hesaplama yapılamadı')
  } finally {
    calculating.value = false
  }
}

async function completeReturn() {
  if (!props.rentalId) return

  saving.value = true
  try {
    const completeRequest: VehicleReturnForm = {
      endKm: form.value.endKm,
      endFuelLiters: form.value.endFuelLiters ?? undefined,
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

    if (preview.value && fuelDeficitLiters.value > 0) {
      completeRequest.applyFuelFee = applyFuelFee.value
      if (applyFuelFee.value) {
        completeRequest.fuelFeeAmount = fuelFeeAmount.value
      }
    }

    const updatedRental = await rentalsApi.complete(props.rentalId, completeRequest)
    rental.value = updatedRental
    toast.success('Kiralama başarıyla sonlandırıldı')
    emit('completed', updatedRental)
    step.value = 'completed'
  } catch (err) {
    toast.apiError(err, 'Kiralama sonlandırılamadı')
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

function handleClose() {
  reset()
  step.value = 'input'
  preview.value = null
  applyEarlyDiscount.value = false
  applyLateFee.value = false
  applyFuelFee.value = false
  earlyDiscountAmount.value = 0
  lateFeeAmount.value = 0
  fuelFeeAmount.value = 0
  fuelPricePerLiter.value = 0
  rental.value = null
  vehicle.value = null
  form.value = { endKm: 0, endFuelLiters: null, actualReturnDate: '', notes: '' }
  emit('close')
}

function handleBack() {
  step.value = 'input'
  preview.value = null
  applyEarlyDiscount.value = false
  applyLateFee.value = false
  applyFuelFee.value = false
  earlyDiscountAmount.value = 0
  lateFeeAmount.value = 0
  fuelFeeAmount.value = 0
  fuelPricePerLiter.value = 0
}

function formatMoney(amount: number | { amount: number; currency: string } | null | undefined): string {
  if (amount == null) return fmtTRY(0)
  const num = typeof amount === 'number' ? amount : amount.amount
  return fmtTRY(num ?? 0)
}

function formatDate(date: unknown): string {
  if (!date) return '-'
  const d = new Date(String(date))
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const vehicleLabel = computed(() => {
  if (vehicle.value) {
    return `${vehicle.value.plateNumber} · ${vehicle.value.brand} ${vehicle.value.model}`
  }
  if (rental.value?.vehiclePlate && rental.value?.vehicleName) {
    return `${rental.value.vehiclePlate} · ${rental.value.vehicleName}`
  }
  return '—'
})

watch([fuelPricePerLiter, fuelDeficitLiters, applyFuelFee], () => {
  if (!applyFuelFee.value || fuelDeficitLiters.value <= 0) return
  fuelFeeAmount.value = suggestedFuelFee.value
})

watch(
  () => [props.visible, props.rentalId] as const,
  ([isVisible, id]) => {
    if (isVisible && id) {
      reset()
      step.value = 'input'
      preview.value = null
      fetchRental()
    }
  },
  { immediate: true },
)
</script>

<template>
  <RcModal :open="visible" wide @close="handleClose">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon
            name="arrowRight"
            :size="20"
            style="color: var(--rc-blue-500); vertical-align: -3px; margin-right: 8px"
          />
          {{ modalTitle }}
        </h2>
        <div v-if="modalSubtitle" class="rc-modal__sub">{{ modalSubtitle }}</div>
      </div>
    </template>

    <div v-if="loading" class="rcr-return-modal__loading">
      <div class="rcr-return-modal__spinner" />
      <span>Yükleniyor…</span>
    </div>

    <template v-else-if="rental">
      <!-- Step: input -->
      <template v-if="step === 'input'">
        <div class="rc-status-rail rcr-return-modal__rail">
          <span class="rc-status-step rc-status-step--done">
            <span class="rc-status-step__dot"><RcIcon name="check" :size="10" /></span>
            Aktif
          </span>
          <RcIcon name="chevronRight" :size="14" class="rc-status-step__chev" />
          <span class="rc-status-step rc-status-step--current">
            <span class="rc-status-step__dot">2</span>
            İade kontrolü
          </span>
          <RcIcon name="chevronRight" :size="14" class="rc-status-step__chev" />
          <span class="rc-status-step">
            <span class="rc-status-step__dot">3</span>
            Önizleme
          </span>
        </div>

        <div class="rc-card rcr-return-modal__meta">
          <div class="rc-card__body rcr-modal-meta">
            <div class="rc-meta-row">
              <span class="rc-meta-row__label">Araç</span>
              <span class="rc-meta-row__value">{{ vehicleLabel }}</span>
            </div>
            <div class="rc-meta-row">
              <span class="rc-meta-row__label">Planlanan bitiş</span>
              <span class="rc-meta-row__value">{{ formatDate(rental.endDate) }}</span>
            </div>
            <div v-if="rental.startKm" class="rc-meta-row">
              <span class="rc-meta-row__label">Çıkış KM</span>
              <span class="rc-meta-row__value rc-num">{{ rental.startKm.toLocaleString('tr-TR') }} km</span>
            </div>
            <div v-if="rental.startFuelLiters != null" class="rc-meta-row">
              <span class="rc-meta-row__label">Çıkış depo</span>
              <span class="rc-meta-row__value rc-num">{{ rental.startFuelLiters.toLocaleString('tr-TR') }} L</span>
            </div>
          </div>
        </div>

        <div v-if="rental.isOverdue" class="rc-alert rc-alert--danger" style="margin-top: 14px">
          <RcIcon name="warning" :size="16" />
          <div>
            <div class="rc-alert__title">{{ rental.overdueDays }} gün gecikme</div>
            <span>Planlanan iade {{ formatDate(rental.endDate) }} — geç iade bedeli yansıtılacak.</span>
          </div>
        </div>

        <form class="rcr-return-modal__form" @submit.prevent="calculatePreview">
          <div class="rcr-modal-form-grid">
            <div class="rc-field" :class="{ 'rc-field--error': hasError('endKm') }">
              <label class="rc-field__label">İade KM</label>
              <input
                v-model.number="form.endKm"
                class="rc-input"
                type="number"
                :min="rental.startKm || 0"
                @blur="touch('endKm')"
              />
              <span v-if="totalKm > 0" class="rc-field__hint">Kullanılan: {{ totalKm.toLocaleString('tr-TR') }} km</span>
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
            <div class="rc-field" :class="{ 'rc-field--error': hasError('endFuelLiters') }">
              <label class="rc-field__label">İade depo (litre)</label>
              <input
                v-model.number="form.endFuelLiters"
                class="rc-input"
                type="number"
                min="0"
                step="0.1"
                placeholder="Örn. 30"
                @blur="touch('endFuelLiters')"
              />
              <span class="rc-field__hint">İade anındaki yakıt miktarı (litre)</span>
              <span v-if="hasError('endFuelLiters')" class="rc-field__error">{{ getError('endFuelLiters') }}</span>
            </div>
            <div class="rc-field rcr-modal-form-grid__full">
              <label class="rc-field__label">İade notu (opsiyonel)</label>
              <textarea
                v-model="form.notes"
                class="rc-textarea"
                rows="2"
                placeholder="Araç durumu, teslim detayı…"
              />
            </div>
          </div>
        </form>

        <div v-if="rental" class="rcr-modal-docs">
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
      </template>

      <!-- Step: preview -->
      <template v-else-if="step === 'preview' && preview">
        <div class="rc-alert rc-alert--info" style="margin-bottom: 14px">
          <RcIcon name="info" :size="16" />
          <span>Aşağıdaki tutarlar <strong>previewReturn</strong> sonucudur. Onayladığınızda iade tamamlanır.</span>
        </div>

        <div class="rcr-return-preview-grid">
          <div class="rcr-return-preview-box">
            <span class="rcr-return-preview-box__label">Kullanılan KM</span>
            <span class="rcr-return-preview-box__value rc-num">{{ preview.kmUsed.toLocaleString('tr-TR') }}</span>
          </div>
          <div v-if="preview.kmOverage > 0" class="rcr-return-preview-box rcr-return-preview-box--warn">
            <span class="rcr-return-preview-box__label">KM aşımı</span>
            <span class="rcr-return-preview-box__value rc-num">{{ preview.kmOverage.toLocaleString('tr-TR') }} km</span>
          </div>
          <div v-if="preview.lateDays > 0" class="rcr-return-preview-box rcr-return-preview-box--warn">
            <span class="rcr-return-preview-box__label">Geç iade</span>
            <span class="rcr-return-preview-box__value">{{ preview.lateDays }} gün</span>
          </div>
          <div v-if="preview.earlyDays > 0" class="rcr-return-preview-box rcr-return-preview-box--ok">
            <span class="rcr-return-preview-box__label">Erken iade</span>
            <span class="rcr-return-preview-box__value">{{ preview.earlyDays }} gün</span>
          </div>
          <div v-if="fuelDeficitLiters > 0" class="rcr-return-preview-box rcr-return-preview-box--warn">
            <span class="rcr-return-preview-box__label">Depo farkı</span>
            <span class="rcr-return-preview-box__value rc-num">{{ fuelDeficitLiters.toLocaleString('tr-TR') }} L</span>
          </div>
        </div>

        <div
          v-if="fuelDeficitLiters > 0"
          class="rc-card rcr-return-adjustments"
          style="margin-top: 14px"
        >
          <div class="rc-card__head"><div class="rc-card__title">Yakıt / depo düzenlemeleri</div></div>
          <div class="rcr-return-adjustments__body">
            <div class="rcr-return-adjustment">
              <label class="rcr-return-adjustment__toggle">
                <input v-model="applyFuelFee" type="checkbox" />
                <span>Benzin ücretini uygula ({{ fuelDeficitLiters.toLocaleString('tr-TR') }} L eksik)</span>
              </label>
              <div v-if="applyFuelFee" class="rcr-return-adjustment__amount">
                <label class="rc-field__label">Litre fiyatı (₺)</label>
                <input
                  v-model.number="fuelPricePerLiter"
                  class="rc-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Örn. 42.50"
                />
                <label class="rc-field__label">Ücret tutarı</label>
                <input
                  v-model.number="fuelFeeAmount"
                  class="rc-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <span class="rc-field__hint">
                  Önerilen: {{ fmtTRY(suggestedFuelFee) }}
                  <template v-if="fuelPricePerLiter > 0">
                    ({{ fuelDeficitLiters.toLocaleString('tr-TR') }} L × {{ fmtTRY(fuelPricePerLiter) }})
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="preview.earlyDays > 0 || preview.lateDays > 0"
          class="rc-card rcr-return-adjustments"
          style="margin-top: 14px"
        >
          <div class="rc-card__head"><div class="rc-card__title">Tarih farkı düzenlemeleri</div></div>
          <div class="rcr-return-adjustments__body">
            <div v-if="preview.earlyDays > 0" class="rcr-return-adjustment">
              <label class="rcr-return-adjustment__toggle">
                <input v-model="applyEarlyDiscount" type="checkbox" />
                <span>Erken iade indirimini uygula ({{ preview.earlyDays }} gün)</span>
              </label>
              <div v-if="applyEarlyDiscount" class="rcr-return-adjustment__amount">
                <label class="rc-field__label">İndirim tutarı</label>
                <input
                  v-model.number="earlyDiscountAmount"
                  class="rc-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <span class="rc-field__hint">
                  Önerilen: {{ formatMoney(preview.earlyDiscount) }}
                </span>
              </div>
            </div>

            <div v-if="preview.lateDays > 0" class="rcr-return-adjustment">
              <label class="rcr-return-adjustment__toggle">
                <input v-model="applyLateFee" type="checkbox" />
                <span>Geç iade cezasını uygula ({{ preview.lateDays }} gün)</span>
              </label>
              <div v-if="applyLateFee" class="rcr-return-adjustment__amount">
                <label class="rc-field__label">Ceza tutarı</label>
                <input
                  v-model.number="lateFeeAmount"
                  class="rc-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <span class="rc-field__hint">
                  Önerilen: {{ formatMoney(preview.lateFee) }} (günlük {{ formatMoney(rental?.dailyPrice ?? 0) }})
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="rc-card" style="margin-top: 14px">
          <div class="rc-card__head"><div class="rc-card__title">Ek kalemler</div></div>
          <div class="rcr-return-preview-lines">
            <div v-if="(preview.kmPenalty?.amount ?? 0) > 0" class="rcr-price-line">
              <span>KM ceza</span>
              <span class="rc-num">{{ formatMoney(preview.kmPenalty) }}</span>
            </div>
            <div v-if="applyEarlyDiscount && earlyDiscountAmount > 0" class="rcr-price-line rcr-price-line--discount">
              <span>Erken iade indirimi</span>
              <span class="rc-num">−{{ fmtTRY(earlyDiscountAmount) }}</span>
            </div>
            <div v-if="applyLateFee && lateFeeAmount > 0" class="rcr-price-line">
              <span>Geç iade bedeli</span>
              <span class="rc-num">{{ fmtTRY(lateFeeAmount) }}</span>
            </div>
            <div v-if="applyFuelFee && fuelFeeAmount > 0" class="rcr-price-line">
              <span>Benzin / depo farkı</span>
              <span class="rc-num">{{ fmtTRY(fuelFeeAmount) }}</span>
            </div>
            <template v-if="preview.penalties?.length">
              <div v-for="(p, i) in preview.penalties" :key="`p-${i}`" class="rcr-price-line">
                <span>{{ p.penaltyNumber }} ({{ p.violationType }})</span>
                <span class="rc-num">{{ formatMoney(p.amount) }}</span>
              </div>
            </template>
            <template v-if="preview.tolls?.length">
              <div v-for="(t, i) in preview.tolls" :key="`t-${i}`" class="rcr-price-line">
                <span>{{ t.tollNumber }}</span>
                <span class="rc-num">{{ formatMoney(t.amount) }}</span>
              </div>
            </template>
            <template v-if="preview.damages?.length">
              <div v-for="(d, i) in preview.damages" :key="`d-${i}`" class="rcr-price-line">
                <span>{{ d.description }}</span>
                <span class="rc-num">{{ formatMoney(d.estimatedCost) }}</span>
              </div>
            </template>
            <hr class="rc-hr" />
            <div class="rcr-return-preview-total">
              <span>Ek ücretler toplamı</span>
              <span class="rc-num">
                {{ previewExtraTotal === 0 ? 'Yok' : fmtTRY(previewExtraTotal) }}
              </span>
            </div>
            <div class="rcr-return-preview-total rcr-return-preview-total--final">
              <span>Tahmini nihai tutar</span>
              <span class="rc-num">{{ fmtTRY(estimatedFinalTotal) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Step: completed -->
      <template v-else-if="step === 'completed'">
        <div class="rcr-return-modal__done">
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

          <div v-if="rental" class="rcr-modal-docs rcr-modal-docs--completed">
            <DocumentsSection
              :reference-type="'RENTAL'"
              :reference-id="rental.id"
              title="İade belgeleri"
              :upload-types="RETURN_UPLOAD_TYPES"
            />
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
        <template v-if="step === 'input'">
          <span class="rc-spacer" />
          <RcButton variant="ghost" @click="handleClose">Vazgeç</RcButton>
          <RcButton variant="secondary" :disabled="calculating" @click="calculatePreview">
            {{ calculating ? 'Hesaplanıyor…' : 'Önizle' }}
            <RcIcon name="chevronRight" :size="14" />
          </RcButton>
        </template>
        <template v-else-if="step === 'preview'">
          <RcButton variant="ghost" :disabled="saving" @click="handleBack">← Geri</RcButton>
          <span class="rc-spacer" />
          <RcButton variant="accent" :disabled="saving" @click="completeReturn">
            <RcIcon name="check" :size="14" />
            {{ saving ? 'Tamamlanıyor…' : 'İadeyi tamamla' }}
          </RcButton>
        </template>
        <template v-else>
          <span class="rc-spacer" />
          <RcButton variant="primary" @click="handleClose">Tamam</RcButton>
        </template>
      </template>
    </template>
  </RcModal>
</template>
