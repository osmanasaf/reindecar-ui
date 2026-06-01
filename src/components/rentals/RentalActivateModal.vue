<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RcModal, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { rentalsApi } from '@/api'
import { useToast, useValidation, rules } from '@/composables'
import { fmtTRY, formatDate } from '@/utils/format'
import type { Rental, Vehicle } from '@/types'

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
const submitting = ref(false)
const startKm = ref(0)

const kmMin = computed(() => props.vehicle?.currentKm ?? 0)

function syncStartKmFromVehicle() {
  startKm.value = kmMin.value
}

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
}))

const { validateForm, getError, hasError, touch, reset } = useValidation(() => kmRules.value)

async function confirm() {
  if (!props.rental || !validateForm(kmRules.value)) return
  submitting.value = true
  try {
    const updated = await rentalsApi.activate(props.rental.id, { startKm: startKm.value })
    toast.success('Araç teslim edildi — kiralama aktif')
    emit('activated', updated)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Teslimat başarısız')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  reset()
  emit('close')
}
</script>

<template>
  <RcModal
    :open="open && !!rental"
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
      <span class="rc-status-step rc-status-step--done">
        <span class="rc-status-step__dot"><RcIcon name="check" :size="10" /></span>
        Rezerve
      </span>
      <RcIcon name="chevronRight" :size="14" class="rc-status-step__chev" />
      <span class="rc-status-step rc-status-step--current">
        <span class="rc-status-step__dot">2</span>
        Teslimat
      </span>
      <RcIcon name="chevronRight" :size="14" class="rc-status-step__chev" />
      <span class="rc-status-step">
        <span class="rc-status-step__dot">3</span>
        Aktif
      </span>
    </div>

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
    </div>

    <div class="rc-alert rc-alert--info rcr-modal-alert-spaced--top">
      <RcIcon name="info" :size="16" />
      <span>Teslimatta araç KM'si güncellenir ve kiralama <strong>ACTIVE</strong> durumuna geçer.</span>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="handleClose">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="submitting" @click="confirm">
        <RcIcon name="check" :size="14" />
        {{ submitting ? 'Kaydediliyor…' : 'Teslimatı tamamla' }}
      </RcButton>
    </template>
  </RcModal>
</template>
