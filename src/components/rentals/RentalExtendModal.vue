<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RcModal, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { rentalsApi } from '@/api'
import { useToast } from '@/composables'
import { fmtTRY, formatDate } from '@/utils/format'
import type { Rental } from '@/types'
import DatePicker from '@/components/base/DatePicker.vue'

const props = defineProps<{
  open: boolean
  rental: Rental | null
}>()

const emit = defineEmits<{ close: []; extended: [rental: Rental] }>()

const toast = useToast()
const submitting = ref(false)
const newEndDate = ref('')
const extraDays = ref(1)
const reason = ref('')

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

watch(
  () => [props.open, props.rental?.endDate] as const,
  ([isOpen, endDate]) => {
    if (!isOpen || !endDate) return
    extraDays.value = 1
    newEndDate.value = addDaysYmd(endDate, 1)
    reason.value = ''
  },
  { immediate: true },
)

watch(newEndDate, (val) => {
  if (!props.rental?.endDate || !val) return
  const start = new Date(props.rental.endDate + 'T12:00:00')
  const end = new Date(val + 'T12:00:00')
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (diff > 0 && diff !== extraDays.value) extraDays.value = diff
})

watch(extraDays, (days) => {
  if (!props.rental?.endDate || days < 1) return
  const next = addDaysYmd(props.rental.endDate, days)
  if (next !== newEndDate.value) newEndDate.value = next
})

const dailyRate = computed(() => {
  if (props.rental?.dailyPrice) return props.rental.dailyPrice
  if (!props.rental?.totalDays || !props.rental.totalPrice) return 0
  return props.rental.totalPrice / props.rental.totalDays
})

const extraCharge = computed(() => dailyRate.value * extraDays.value)

const minEndDate = computed(() => {
  if (!props.rental?.endDate) return undefined
  return addDaysYmd(props.rental.endDate, 1)
})

const canSubmit = computed(
  () => !!newEndDate.value && !!props.rental?.endDate && newEndDate.value > props.rental.endDate,
)

async function confirm() {
  if (!props.rental || !canSubmit.value) return
  submitting.value = true
  try {
    const updated = await rentalsApi.extend(props.rental.id, {
      newEndDate: newEndDate.value,
      reason: reason.value.trim() || undefined,
    })
    toast.success('Kiralama süresi uzatıldı')
    emit('extended', updated)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Uzatma başarısız')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal :open="open && !!rental" wide @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="plus" :size="20" style="color: var(--rc-blue-500); vertical-align: -3px; margin-right: 8px" />
          Kiralama süresini uzat
        </h2>
        <div v-if="rental" class="rc-modal__sub">{{ rental.rentalNumber }} · {{ rental.customerName }}</div>
      </div>
    </template>

    <div v-if="rental" class="rcr-extend-summary">
      <div>
        <div class="rcr-extend-summary__label">Mevcut bitiş</div>
        <div class="rcr-extend-summary__value rc-num">{{ formatDate(rental.endDate) }}</div>
      </div>
      <RcIcon name="chevronRight" :size="18" style="color: var(--rc-text-faint)" />
      <div>
        <div class="rcr-extend-summary__label rcr-extend-summary__label--accent">Yeni bitiş</div>
        <div class="rcr-extend-summary__value rc-num rcr-extend-summary__value--accent">
          {{ newEndDate ? formatDate(newEndDate) : '—' }}
        </div>
      </div>
      <div>
        <div class="rcr-extend-summary__label">Ek gün</div>
        <div class="rcr-extend-summary__value rc-num">+{{ extraDays }}</div>
      </div>
    </div>

    <div class="rcr-modal-form-grid" style="margin-top: 14px">
      <div class="rc-field">
        <DatePicker
          v-model="newEndDate"
          label="Yeni iade tarihi"
          placeholder="Bitiş tarihi"
          :min="minEndDate"
        />
      </div>
      <div class="rc-field">
        <label class="rc-field__label">Ek gün</label>
        <input v-model.number="extraDays" class="rc-input rc-num" type="number" min="1" step="1" />
      </div>
      <div class="rc-field rcr-modal-form-grid__full">
        <label class="rc-field__label">Neden (opsiyonel)</label>
        <input v-model="reason" class="rc-input" type="text" placeholder="Müşteri 3 gün daha talep etti…" />
      </div>
    </div>

    <div class="rc-alert rc-alert--info" style="margin-top: 14px">
      <RcIcon name="info" :size="16" />
      <span>
        Tahmini ek ücret: <strong class="rc-num">{{ fmtTRY(extraCharge) }}</strong>
        (günlük {{ fmtTRY(dailyRate) }} × {{ extraDays }} gün)
      </span>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="!canSubmit || submitting" @click="confirm">
        <RcIcon name="check" :size="14" />
        {{ submitting ? 'Uzatılıyor…' : `Uzat · ${fmtTRY(extraCharge)}` }}
      </RcButton>
    </template>
  </RcModal>
</template>
