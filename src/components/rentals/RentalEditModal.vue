<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RcModal, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { rentalsApi, branchesApi, kmPackagesApi } from '@/api'
import { useToast } from '@/composables'
import DatePicker from '@/components/base/DatePicker.vue'
import { SearchableSelect } from '@/components/common'
import ExtraItemsManager from '@/components/rentals/ExtraItemsManager.vue'
import type { Rental, Branch, KmPackage, RentalExtraItem, RentalType } from '@/types'
import { resolveEffectiveIncludedKm, formatIncludedKmDisplay } from '@/utils/km'

const props = defineProps<{
  open: boolean
  rental: Rental | null
  extraItems?: RentalExtraItem[]
  vehicleCategoryId?: number | null
}>()

const emit = defineEmits<{ close: []; updated: [rental: Rental] }>()

const toast = useToast()
const submitting = ref(false)
const branches = ref<Branch[]>([])
const kmPackages = ref<KmPackage[]>([])

const startDate = ref('')
const endDate = ref('')
const branchId = ref<number | null>(null)
const returnBranchId = ref<number | null>(null)
const kmPackageId = ref<number | null>(null)
const customIncludedKm = ref<number | null>(null)
const customExtraKmPrice = ref<number | null>(null)
const discountAmount = ref<number>(0)
const notes = ref('')
const extraItems = ref<RentalExtraItem[]>([])

const branchOptions = computed(() =>
  branches.value.map(b => ({ value: b.id as number, label: b.name })),
)

const kmPackageOptions = computed(() =>
  kmPackages.value.map(p => ({ value: p.id as number, label: p.name })),
)

const termMonths = computed(() => {
  if (!startDate.value || !endDate.value) return 1
  const start = new Date(startDate.value + 'T12:00:00')
  const end = new Date(endDate.value + 'T12:00:00')
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.ceil(days / 30))
})

const editTotalDays = computed(() => {
  if (!startDate.value || !endDate.value) return 0
  const start = new Date(startDate.value + 'T12:00:00')
  const end = new Date(endDate.value + 'T12:00:00')
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
})

const selectedKmPackage = computed(() =>
  kmPackages.value.find(pkg => pkg.id === kmPackageId.value) ?? null,
)

const kmLimitPreview = computed(() => {
  if (!props.rental) return ''
  if (customIncludedKm.value != null && customIncludedKm.value > 0) {
    return `Toplam dahil KM: ${customIncludedKm.value.toLocaleString('tr-TR')} km (özel)`
  }
  if (!selectedKmPackage.value || selectedKmPackage.value.unlimited) {
    return selectedKmPackage.value?.unlimited ? 'Sınırsız KM' : ''
  }
  const totalKm = resolveEffectiveIncludedKm({
    perPeriodKm: selectedKmPackage.value.includedKm,
    rentalType: props.rental.rentalType,
    totalDays: editTotalDays.value,
  })
  const perPeriodLabel = formatIncludedKmDisplay(
    props.rental.rentalType,
    selectedKmPackage.value.includedKm,
    0,
  )
  return `Toplam dahil KM: ${totalKm.toLocaleString('tr-TR')} km (${perPeriodLabel})`
})

function resetForm() {
  if (!props.rental) return
  startDate.value = props.rental.startDate
  endDate.value = props.rental.endDate
  branchId.value = props.rental.branchId ?? null
  returnBranchId.value = props.rental.returnBranchId ?? props.rental.branchId ?? null
  kmPackageId.value = props.rental.kmPackageId ?? null
  customIncludedKm.value = props.rental.customIncludedKm ?? null
  customExtraKmPrice.value = props.rental.customExtraKmPrice ?? null
  discountAmount.value = props.rental.discountAmount ?? 0
  notes.value = props.rental.notes ?? ''
  extraItems.value = (props.extraItems ?? []).map(item => ({ ...item }))
}

async function loadBranches() {
  try {
    branches.value = await branchesApi.getActive()
  } catch {
    branches.value = []
  }
}

async function loadKmPackages(rentalType: RentalType) {
  try {
    if (props.vehicleCategoryId) {
      kmPackages.value = await kmPackagesApi.getAvailableForCategory(props.vehicleCategoryId)
    } else {
      kmPackages.value = await kmPackagesApi.getByRentalType(rentalType)
    }
  } catch {
    kmPackages.value = []
  }
}

watch(
  () => [props.open, props.rental?.id] as const,
  async ([isOpen]) => {
    if (!isOpen || !props.rental) return
    resetForm()
    await Promise.all([
      loadBranches(),
      loadKmPackages(props.rental.rentalType),
    ])
  },
  { immediate: true },
)

async function save() {
  if (!props.rental || !branchId.value || !startDate.value || !endDate.value) {
    toast.error('Lütfen zorunlu alanları doldurun')
    return
  }
  if (endDate.value <= startDate.value) {
    toast.error('Bitiş tarihi başlangıçtan sonra olmalıdır')
    return
  }

  submitting.value = true
  try {
    const updated = await rentalsApi.update(props.rental.id, {
      startDate: startDate.value,
      endDate: endDate.value,
      branchId: branchId.value,
      returnBranchId: returnBranchId.value ?? branchId.value,
      kmPackageId: kmPackageId.value ?? undefined,
      customIncludedKm: customIncludedKm.value && customIncludedKm.value > 0 ? customIncludedKm.value : undefined,
      customExtraKmPrice: customExtraKmPrice.value && customExtraKmPrice.value > 0 ? customExtraKmPrice.value : undefined,
      discountAmount: discountAmount.value > 0 ? discountAmount.value : undefined,
      notes: notes.value.trim() || undefined,
      extraItems: extraItems.value.map(item => ({
        itemTypeId: item.itemTypeId ?? undefined,
        customName: item.itemTypeId ? undefined : item.name,
        description: item.description ?? undefined,
        amount: item.amount,
        currency: item.currency ?? 'TRY',
        calculationType: item.calculationType,
      })),
    })
    toast.success('Kiralama güncellendi')
    emit('updated', updated)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Güncelleme başarısız')
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
          <RcIcon name="edit" :size="20" class="rcr-modal__title-icon" />
          Kiralamayı düzenle
        </h2>
        <div v-if="rental" class="rc-modal__sub">
          {{ rental.rentalNumber }} · {{ rental.customerName }} · {{ rental.vehiclePlate }}
        </div>
      </div>
    </template>

    <div class="rc-alert rc-alert--info rcr-modal-alert-spaced">
      <RcIcon name="info" :size="16" />
      <span>
        Yalnızca tarih, şube, KM paketi, indirim, not ve ek kalemler düzenlenebilir.
        Araç, müşteri ve durum değişmez.
      </span>
    </div>

    <div v-if="rental" class="rcr-edit-modal">
      <section class="rcr-edit-modal__section">
        <h3 class="rcr-edit-modal__heading">Tarih &amp; şube</h3>
        <div class="rcr-modal-form-grid">
          <div class="rc-field">
            <label class="rc-field__label">Başlangıç</label>
            <DatePicker v-model="startDate" />
          </div>
          <div class="rc-field">
            <label class="rc-field__label">Bitiş</label>
            <DatePicker v-model="endDate" :min="startDate" />
          </div>
          <div class="rc-field">
            <label class="rc-field__label">Teslim şubesi</label>
            <SearchableSelect
              v-model="branchId"
              :options="branchOptions"
              placeholder="Şube seçin"
            />
          </div>
          <div class="rc-field">
            <label class="rc-field__label">İade şubesi</label>
            <SearchableSelect
              v-model="returnBranchId"
              :options="branchOptions"
              placeholder="Şube seçin"
            />
          </div>
        </div>
      </section>

      <section class="rcr-edit-modal__section">
        <h3 class="rcr-edit-modal__heading">KM paketi</h3>
        <div class="rcr-modal-form-grid">
          <div class="rc-field">
            <label class="rc-field__label">Paket</label>
            <SearchableSelect
              v-model="kmPackageId"
              :options="kmPackageOptions"
              placeholder="Paket seçin (opsiyonel)"
              clearable
            />
          </div>
          <div class="rc-field">
            <label class="rc-field__label">Özel dahil KM</label>
            <input v-model.number="customIncludedKm" class="rc-input rc-num" type="number" min="0" />
          </div>
          <div class="rc-field">
            <label class="rc-field__label">Özel ek KM fiyatı (₺)</label>
            <input v-model.number="customExtraKmPrice" class="rc-input rc-num" type="number" min="0" step="0.01" />
          </div>
        </div>
        <p v-if="kmLimitPreview" class="rcr-edit-modal__hint">{{ kmLimitPreview }}</p>
      </section>

      <section class="rcr-edit-modal__section">
        <h3 class="rcr-edit-modal__heading">İndirim &amp; not</h3>
        <div class="rcr-modal-form-grid">
          <div class="rc-field">
            <label class="rc-field__label">İndirim tutarı (₺)</label>
            <input v-model.number="discountAmount" class="rc-input rc-num" type="number" min="0" step="0.01" />
          </div>
          <div class="rc-field rcr-modal-form-grid__full">
            <label class="rc-field__label">Notlar</label>
            <textarea v-model="notes" class="rc-input" rows="3" placeholder="Kiralama notları" />
          </div>
        </div>
      </section>

      <section class="rcr-edit-modal__section">
        <h3 class="rcr-edit-modal__heading">Ek kalemler</h3>
        <ExtraItemsManager v-model="extraItems" :term-months="termMonths" />
      </section>
    </div>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="submitting" @click="save">
        <RcIcon name="check" :size="14" />
        {{ submitting ? 'Kaydediliyor…' : 'Kaydet' }}
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rcr-edit-modal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rcr-edit-modal__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rcr-edit-modal__heading {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--rc-text-muted);
}

.rcr-edit-modal__hint {
  margin: 0;
  font-size: 13px;
  color: var(--rc-text-muted);
}
</style>
