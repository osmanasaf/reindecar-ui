<script setup lang="ts">
import { computed, ref } from 'vue'
import { RcModal, RcButton, RcModalRail, type ModalRailStep } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { rentalsApi } from '@/api'
import { useToast } from '@/composables'
import { fmtTRY } from '@/utils/format'
import type { Rental } from '@/types'

const props = defineProps<{
  open: boolean
  rental: Rental | null
  totalPaid?: number
}>()

const emit = defineEmits<{ close: []; closed: [rental: Rental] }>()

const toast = useToast()
const submitting = ref(false)

const modalSubtitle = computed(() => {
  if (!props.rental) return ''
  return [props.rental.rentalNumber, props.rental.customerName, props.rental.vehiclePlate]
    .filter(Boolean)
    .join(' · ')
})

const railSteps: ModalRailStep[] = [
  { label: 'Aktif', state: 'done' },
  { label: 'İade alındı', state: 'done' },
  { label: 'Tamamlandı', state: 'current' },
]

async function confirm() {
  if (!props.rental) return
  submitting.value = true
  try {
    const updated = await rentalsApi.closeRental(props.rental.id)
    toast.success('Kiralama kapatıldı')
    emit('closed', updated)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Kiralama kapatılamadı')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal
    :open="open && !!rental"
    icon="check"
    intent="success"
    title="Kiralamayı kapat"
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
        <div v-if="totalPaid != null && totalPaid > 0" class="rc-meta-row">
          <span class="rc-meta-row__label">Toplam tahsilat</span>
          <span class="rc-meta-row__value rc-num">{{ fmtTRY(totalPaid) }}</span>
        </div>
      </div>
    </div>

    <!-- Bilgi şeridi her modalda gövdenin en altında -->
    <div class="rc-alert rc-alert--success rc-modal-note">
      <RcIcon name="checkCircle" :size="16" />
      <div>
        <div class="rc-alert__title">Tüm alacaklar tahsil edildi</div>
        <span>
          Kiralama kapatıldığında durum <strong>Tamamlandı</strong> olur ve operasyon akışı sonlanır.
        </span>
      </div>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :loading="submitting" @click="confirm">
        <RcIcon name="check" :size="14" />
        Kiralamayı kapat
      </RcButton>
    </template>
  </RcModal>
</template>
