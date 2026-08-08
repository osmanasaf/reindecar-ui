<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RcModal, RcButton, RcModalRail, type ModalRailStep } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { rentalsApi } from '@/api'
import { useToast } from '@/composables'
import type { Rental } from '@/types'

const CANCEL_REASONS = [
  { value: 'CUSTOMER_REQUEST', label: 'Müşteri talebi' },
  { value: 'NO_VEHICLE', label: 'Araç müsait değil' },
  { value: 'PAYMENT_ISSUE', label: 'Ödeme sorunu' },
  { value: 'DOCUMENT_ISSUE', label: 'Evrak eksikliği' },
  { value: 'OTHER', label: 'Diğer' },
] as const

const props = defineProps<{
  open: boolean
  rental: Rental | null
}>()

const emit = defineEmits<{ close: []; cancelled: [rental: Rental] }>()

const toast = useToast()
const submitting = ref(false)
const reason = ref('CUSTOMER_REQUEST')
const notes = ref('')

const modalSubtitle = computed(() => {
  if (!props.rental) return ''
  return [props.rental.rentalNumber, props.rental.customerName, props.rental.vehiclePlate]
    .filter(Boolean)
    .join(' · ')
})

const railSteps: ModalRailStep[] = [
  { label: 'Rezerve', state: 'done' },
  { label: 'İptal', state: 'current', danger: true },
]

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    reason.value = 'CUSTOMER_REQUEST'
    notes.value = ''
  },
)

async function confirm() {
  if (!props.rental) return
  submitting.value = true
  try {
    const reasonLabel = CANCEL_REASONS.find(r => r.value === reason.value)?.label ?? reason.value
    const updated = await rentalsApi.cancel(props.rental.id, {
      reason: reasonLabel,
      notes: notes.value.trim() || undefined,
    })
    toast.success('Kiralama iptal edildi')
    emit('cancelled', updated)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'İptal başarısız')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal
    :open="open && !!rental"
    wide
    icon="close"
    intent="destructive"
    title="Kiralamayı iptal et"
    :subtitle="modalSubtitle"
    @close="emit('close')"
  >
    <RcModalRail :steps="railSteps" class="rc-modal-rail" />

    <div v-if="rental" class="rc-card">
      <div class="rc-card__body rcr-modal-meta">
        <div class="rc-meta-row">
          <span class="rc-meta-row__label">Müşteri</span>
          <span class="rc-meta-row__value">{{ rental.customerName || '—' }}</span>
        </div>
        <div class="rc-meta-row">
          <span class="rc-meta-row__label">Araç</span>
          <span class="rc-meta-row__value">{{ rental.vehiclePlate || '—' }}</span>
        </div>
      </div>
    </div>

    <div class="rc-modal-form" style="margin-top: 16px">
      <div class="rc-field rc-modal-form__full">
        <label class="rc-field__label">İptal nedeni</label>
        <select v-model="reason" class="rc-select">
          <option v-for="r in CANCEL_REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </div>
      <div class="rc-field rc-modal-form__full">
        <label class="rc-field__label">Açıklama (opsiyonel)</label>
        <textarea v-model="notes" class="rc-textarea" rows="3" placeholder="İptal detayı…" />
      </div>
    </div>

    <div class="rc-alert rc-alert--danger rc-modal-note">
      <RcIcon name="warning" :size="16" />
      <div>
        <div class="rc-alert__title">Bu işlem geri alınamaz</div>
        <span>
          <strong>{{ rental?.rentalNumber }}</strong> iptal edilecek; rezerve araç müsait duruma döner ve açık alacaklar iptal edilir.
        </span>
      </div>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="danger" :loading="submitting" @click="confirm">
        Evet, iptal et
      </RcButton>
    </template>
  </RcModal>
</template>
