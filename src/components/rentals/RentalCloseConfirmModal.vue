<script setup lang="ts">
import { ref } from 'vue'
import { RcModal, RcButton } from '@/components/rc'
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
  <RcModal :open="open && !!rental" @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="check" :size="20" style="color: var(--rc-blue-500); vertical-align: -3px; margin-right: 8px" />
          Kiralamayı kapat
        </h2>
        <div v-if="rental" class="rc-modal__sub">{{ rental.rentalNumber }}</div>
      </div>
    </template>

    <div class="rc-alert rc-alert--info">
      <RcIcon name="warning" :size="16" />
      <div>
        <div class="rc-alert__title">Tüm alacaklar tahsil edildi</div>
        <span>
          Kiralama kapatıldığında durum <strong>Tamamlandı</strong> olur ve operasyon akışı sonlanır.
        </span>
      </div>
    </div>

    <div v-if="rental" class="rc-card" style="margin-top: 14px">
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

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="submitting" @click="confirm">
        <RcIcon name="check" :size="14" />
        {{ submitting ? 'Kapatılıyor…' : 'Kiralamayı kapat' }}
      </RcButton>
    </template>
  </RcModal>
</template>
