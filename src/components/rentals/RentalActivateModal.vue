<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RcModal, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { rentalsApi } from '@/api'
import { useToast, useValidation, rules, useFeatures } from '@/composables'
import { fmtTRY, formatDate } from '@/utils/format'
import type { Rental, Vehicle } from '@/types'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
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

const emit = defineEmits<{ close: []; activated: [rental: Rental] }>()

const toast = useToast()
const { isEnabled } = useFeatures()
const fuelTrackingEnabled = computed(() => isEnabled('RENTAL_FUEL_TRACKING'))
const submitting = ref(false)
const downloadingPdf = ref(false)
const step = ref<'form' | 'completed'>('form')
const activatedRental = ref<Rental | null>(null)
const startKm = ref(0)
const startFuelLiters = ref<number | null>(null)

const kmMin = computed(() => props.vehicle?.currentKm ?? 0)

const displayRental = computed(() => activatedRental.value ?? props.rental)

function syncStartKmFromVehicle() {
  startKm.value = kmMin.value
  startFuelLiters.value = null
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    step.value = 'form'
    activatedRental.value = null
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
  startFuelLiters: {
    value: startFuelLiters.value,
    rules: [
      {
        validate: (v: unknown) => v == null || v === '' || Number(v) >= 0,
        message: 'Depo litre değeri negatif olamaz',
      },
    ],
  },
}))

const { validateForm, getError, hasError, touch, reset } = useValidation(() => kmRules.value)

async function confirm() {
  if (!props.rental || !validateForm(kmRules.value)) return
  submitting.value = true
  try {
    const updated = await rentalsApi.activate(props.rental.id, {
      startKm: startKm.value,
      startFuelLiters: startFuelLiters.value ?? undefined,
    })
    activatedRental.value = updated
    step.value = 'completed'
    toast.success('Araç teslim edildi — kiralama aktif')
    emit('activated', updated)
  } catch (err) {
    toast.apiError(err, 'Teslimat başarısız')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  reset()
  step.value = 'form'
  activatedRental.value = null
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
    @close="handleClose"
  >
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="key" :size="20" class="rcr-modal__title-icon" />
          Aracı teslim et · Kiralamayı aktive et
        </h2>
        <div v-if="rental" class="rc-modal__sub">
          {{ rental.rentalNumber }} · {{ customerName || rental.customerName }} · {{ rental.vehiclePlate }}
        </div>
      </div>
    </template>

    <div class="rc-status-rail rcr-modal-rail">
      <span class="rc-status-step" :class="{ 'rc-status-step--done': step === 'completed' }">
        <span class="rc-status-step__dot">
          <RcIcon v-if="step === 'completed'" name="check" :size="10" />
          <template v-else>1</template>
        </span>
        Rezerve
      </span>
      <RcIcon name="chevronRight" :size="14" class="rc-status-step__chev" />
      <span class="rc-status-step" :class="{ 'rc-status-step--done': step === 'completed', 'rc-status-step--current': step === 'form' }">
        <span class="rc-status-step__dot">
          <RcIcon v-if="step === 'completed'" name="check" :size="10" />
          <template v-else>2</template>
        </span>
        Teslimat
      </span>
      <RcIcon name="chevronRight" :size="14" class="rc-status-step__chev" />
      <span class="rc-status-step" :class="{ 'rc-status-step--current': step === 'completed' }">
        <span class="rc-status-step__dot">3</span>
        Aktif
      </span>
    </div>

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

    <div class="rcr-modal-form-grid">
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
      <div v-if="fuelTrackingEnabled" class="rc-field" :class="{ 'rc-field--error': hasError('startFuelLiters') }">
        <label class="rc-field__label">Depo (litre)</label>
        <input
          v-model.number="startFuelLiters"
          class="rc-input rc-num"
          type="number"
          min="0"
          step="0.1"
          placeholder="Örn. 45"
          @blur="touch('startFuelLiters')"
        />
        <span class="rc-field__hint">Teslimattaki yakıt miktarı (litre)</span>
        <span v-if="hasError('startFuelLiters')" class="rc-field__error">{{ getError('startFuelLiters') }}</span>
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
      />
      <p class="rcr-modal-docs__hint">
        Önce taslak tutanağı indirip imzalatın; ardından imzalı kopyayı, teslim fotoğrafı veya sözleşmeyi yükleyin.
        Belgeler anında kaydedilir ve teslimatı tamamlamadan da eklenebilir.
      </p>
    </div>

    <div class="rc-alert rc-alert--info rcr-modal-alert-spaced--top">
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
          Kiralama aktif. Teslim tutanağını indirip imzalattıktan sonra imzalı kopyayı yükleyin.
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
      <RcButton variant="accent" :disabled="submitting" @click="confirm">
        <RcIcon name="check" :size="14" />
        {{ submitting ? 'Kaydediliyor…' : 'Teslimatı tamamla' }}
      </RcButton>
      </template>
      <template v-else>
      <span class="rc-spacer" />
      <RcButton variant="primary" @click="handleClose">Tamam</RcButton>
      </template>
    </template>
  </RcModal>
</template>
