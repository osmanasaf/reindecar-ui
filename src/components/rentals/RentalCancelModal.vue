<script setup lang="ts">
import { ref, watch } from 'vue'
import { RcModal, RcButton } from '@/components/rc'
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
    @close="emit('close')"
  >
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="close" :size="20" style="color: var(--rc-danger-500); vertical-align: -3px; margin-right: 8px" />
          Kiralamayı iptal et
        </h2>
        <div v-if="rental" class="rc-modal__sub">{{ rental.rentalNumber }}</div>
      </div>
    </template>

    <div class="rc-alert rc-alert--danger">
      <RcIcon name="warning" :size="16" />
      <div>
        <div class="rc-alert__title">Bu işlem geri alınamaz</div>
        <span>
          <strong>{{ rental?.rentalNumber }}</strong> iptal edilecek; rezerve araç müsait duruma döner ve açık alacaklar iptal edilir.
        </span>
      </div>
    </div>

    <div class="rcr-modal-form-grid" style="margin-top: 16px">
      <div class="rc-field rcr-modal-form-grid__full">
        <label class="rc-field__label">İptal nedeni</label>
        <select v-model="reason" class="rc-select">
          <option v-for="r in CANCEL_REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </div>
      <div class="rc-field rcr-modal-form-grid__full">
        <label class="rc-field__label">Açıklama (opsiyonel)</label>
        <textarea v-model="notes" class="rc-textarea" rows="3" placeholder="İptal detayı…" />
      </div>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="danger" :disabled="submitting" @click="confirm">
        {{ submitting ? 'İptal ediliyor…' : 'Evet, iptal et' }}
      </RcButton>
    </template>
  </RcModal>
</template>
