<script setup lang="ts">
import { ref } from 'vue'
import { RcModal, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { rentalsApi } from '@/api'
import { useToast } from '@/composables'
import { fmtTRY, formatDate } from '@/utils/format'
import type { Rental } from '@/types'

const props = defineProps<{
  open: boolean
  rental: Rental | null
  customerName?: string
  vehicleLabel?: string
  branchLabel?: string
  returnBranchLabel?: string
}>()

const emit = defineEmits<{ close: []; reserved: [rental: Rental] }>()

const toast = useToast()
const submitting = ref(false)

async function confirm() {
  if (!props.rental) return
  submitting.value = true
  try {
    const updated = await rentalsApi.reserve(props.rental.id)
    toast.success('Kiralama rezerve edildi')
    emit('reserved', updated)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Rezervasyon başarısız')
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
          <RcIcon name="calendar" :size="20" class="rcr-modal__title-icon" />
          Kiralamayı rezerve et
        </h2>
        <div v-if="rental" class="rc-modal__sub">
          {{ rental.rentalNumber }} · {{ vehicleLabel || rental.vehiclePlate }}
        </div>
      </div>
    </template>

    <div class="rc-status-rail rcr-modal-rail">
      <span class="rc-status-step rc-status-step--current">
        <span class="rc-status-step__dot">1</span>
        Taslak
      </span>
      <RcIcon name="chevronRight" :size="14" class="rc-status-step__chev" />
      <span class="rc-status-step">
        <span class="rc-status-step__dot">2</span>
        Rezerve
      </span>
    </div>

    <div class="rc-alert rc-alert--info rcr-modal-alert-spaced">
      <RcIcon name="info" :size="16" />
      <div>
        <div class="rc-alert__title">Bu işlem ne yapar?</div>
        <span>
          Kiralama durumu <strong>DRAFT → RESERVED</strong> olarak güncellenir. Araç başka kiralamaya
          verilemez ama henüz teslim edilmez.
        </span>
      </div>
    </div>

    <div v-if="rental" class="rc-card rcr-modal-card">
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

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="submitting" @click="confirm">
        <RcIcon name="check" :size="14" />
        {{ submitting ? 'Rezerve ediliyor…' : 'Rezerve et' }}
      </RcButton>
    </template>
  </RcModal>
</template>
