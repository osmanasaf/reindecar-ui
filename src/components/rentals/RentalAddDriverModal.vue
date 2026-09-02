<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { matchesSearch, toSearchQuery } from '@/utils/search'
import { customersApi, rentalsApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { Driver, Rental } from '@/types'

const props = defineProps<{
  open: boolean
  rental: Rental | null
  existingDriverIds?: number[]
}>()

const emit = defineEmits<{ close: []; added: [] }>()

const modalSubtitle = computed(() => {
  if (!props.rental) return ''
  return [props.rental.rentalNumber, props.rental.customerName, props.rental.vehiclePlate]
    .filter(Boolean)
    .join(' · ')
})

const toast = useToast()
const loading = ref(false)
const submitting = ref(false)
const drivers = ref<Driver[]>([])
const search = ref('')
const selectedId = ref<number | null>(null)
const manualId = ref<number | null>(null)

const existingSet = computed(() => new Set(props.existingDriverIds ?? []))

const availableDrivers = computed(() =>
  drivers.value.filter((d) => !existingSet.value.has(d.id)),
)

function displayName(driver: Driver): string {
  if (driver.fullName) return driver.fullName
  return `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'İsimsiz sürücü'
}

const filteredDrivers = computed(() => {
  const q = toSearchQuery(search.value)
  if (!q) return availableDrivers.value
  return availableDrivers.value.filter((d) => {
    return (
      matchesSearch(displayName(d), q) ||
      matchesSearch(d.licenseNumber, q) ||
      matchesSearch(d.nationalId, q)
    )
  })
})

const canSubmit = computed(() => !!(selectedId.value || manualId.value))

async function loadDrivers() {
  if (!props.rental?.customerId) {
    drivers.value = []
    return
  }
  loading.value = true
  try {
    drivers.value = await customersApi.getDrivers(props.rental.customerId, true)
  } catch (err) {
    toast.apiError(err, 'Sürücüler yüklenemedi')
    drivers.value = []
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!props.rental) return
  const driverId = selectedId.value || manualId.value
  if (!driverId) return

  submitting.value = true
  try {
    const isFirst = (props.existingDriverIds?.length ?? 0) === 0
    await rentalsApi.addDriver(props.rental.id, { driverId, primary: isFirst })
    toast.success('Sürücü eklendi')
    emit('added')
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Sürücü eklenemedi')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  search.value = ''
  selectedId.value = null
  manualId.value = null
  emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      search.value = ''
      selectedId.value = null
      manualId.value = null
      loadDrivers()
    }
  },
)
</script>

<template>
  <RcModal
    :open="open && !!rental"
    wide
    icon="users"
    title="Sürücü ekle"
    :subtitle="modalSubtitle"
    @close="handleClose"
  >


    <div v-if="loading" class="rcr-return-modal__loading">
      <div class="rcr-return-modal__spinner" />
      <span>Sürücüler yükleniyor…</span>
    </div>

    <template v-else>
      <div class="rc-field">
        <label class="rc-field__label">Ara</label>
        <input
          v-model="search"
          class="rc-input"
          type="search"
          placeholder="İsim, TC veya ehliyet no"
        />
      </div>

      <div v-if="filteredDrivers.length > 0" class="rcr-add-driver__list">
        <button
          v-for="driver in filteredDrivers"
          :key="driver.id"
          type="button"
          class="rcr-add-driver__item"
          :class="{ 'rcr-add-driver__item--selected': selectedId === driver.id }"
          @click="selectedId = driver.id; manualId = null"
        >
          <span class="rcr-add-driver__avatar">{{ displayName(driver).charAt(0) }}</span>
          <span class="rcr-add-driver__body">
            <span class="rcr-add-driver__name">
              {{ displayName(driver) }}
              <RcBadge v-if="driver.customerId === rental?.customerId">Müşteri</RcBadge>
            </span>
            <span class="rcr-add-driver__sub">
              <template v-if="driver.licenseNumber">Ehliyet: {{ driver.licenseNumber }}</template>
              <template v-if="driver.licenseClass"> · {{ driver.licenseClass }}</template>
            </span>
          </span>
          <RcIcon v-if="selectedId === driver.id" name="check" :size="16" style="color: var(--rc-blue-500)" />
        </button>
      </div>

      <div v-else class="rcr-add-driver__empty">
        <p>Kayıtlı sürücü bulunamadı veya hepsi zaten ekli.</p>
      </div>

      <div class="rcr-add-driver__divider"><span>veya ID ile ekle</span></div>

      <div class="rc-field">
        <label class="rc-field__label">Sürücü ID</label>
        <input
          v-model.number="manualId"
          class="rc-input rc-num"
          type="number"
          placeholder="Sürücü ID"
          @input="selectedId = null"
        />
        <span class="rc-field__hint">Sadece ID biliniyorsa kullanın.</span>
      </div>
    </template>

    <div class="rc-alert rc-alert--info rc-modal-note">
      <RcIcon name="info" :size="16" />
      <span>
        Kiralamaya eklenecek sürücüyü seçin. <strong>İlk eklenen sürücü</strong> otomatik ana sürücü olur.
      </span>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="handleClose">Vazgeç</RcButton>
      <RcButton variant="accent" :loading="submitting" :disabled="!canSubmit" @click="submit">
        <RcIcon name="plus" :size="14" />
        Sürücü ekle
      </RcButton>
    </template>
  </RcModal>
</template>
