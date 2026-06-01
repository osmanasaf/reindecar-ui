<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { damagesApi, rentalsApi, customersApi, vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import CarDiagramSVG from './CarDiagramSVG.vue'
import { DamageType, DamageSeverity } from '@/types'
import type { CreateDamageReportForm, Customer, Rental } from '@/types'
import { ZONE_NAMES, getDefaultLocationForZone } from '@/utils/vehicleZones'

const props = defineProps<{
  vehicleId: number
  rentalId?: number
  initialZoneId?: number
  damageId?: number
  vehicleLabel?: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
  created: []
}>()

const toast = useToast()
const submitting = ref(false)
const loadingEdit = ref(false)
const savedDamageId = ref<number | null>(null)
const isRepaired = ref(false)
const resolvedVehicleLabel = ref(props.vehicleLabel ?? '')

const pickedZoneId = ref(props.initialZoneId ?? 3)
const vehicleRentals = ref<Rental[]>([])
const loadingRentals = ref(false)
const selectedCustomer = ref<Customer | null>(null)

const isEditMode = computed(() => props.damageId != null)
const isRentalLocked = computed(() => !!props.rentalId)
const fieldsLocked = computed(() => isRepaired.value)

const form = ref<CreateDamageReportForm>({
  vehicleId: props.vehicleId,
  rentalId: props.rentalId,
  reportDate: new Date().toISOString().split('T')[0] ?? '',
  damageType: DamageType.SCRATCH,
  location: getDefaultLocationForZone(pickedZoneId.value),
  severity: DamageSeverity.MINOR,
  description: '',
  estimatedCostAmount: undefined,
  estimatedCostCurrency: 'TRY',
  reportedBy: '',
  customerId: undefined,
  customerResponsible: false
})

const severityOptions = [
  { value: DamageSeverity.MINOR, label: 'Küçük', desc: 'Çizik, küçük göçük', color: '#E89500' },
  { value: DamageSeverity.MODERATE, label: 'Orta', desc: 'Belirgin hasar', color: '#FF7A1A' },
  { value: DamageSeverity.MAJOR, label: 'Büyük', desc: 'Onarım gerekli', color: '#E5342E' },
  { value: DamageSeverity.CRITICAL, label: 'Kritik', desc: 'Acil müdahale', color: '#9A1B17' }
]

const damageTypeOptions = [
  { value: DamageType.SCRATCH, label: 'Çizik' },
  { value: DamageType.DENT, label: 'Göçük' },
  { value: DamageType.CRACK, label: 'Çatlak' },
  { value: DamageType.BROKEN_GLASS, label: 'Kırık cam' },
  { value: DamageType.TIRE_DAMAGE, label: 'Lastik' },
  { value: DamageType.INTERIOR_DAMAGE, label: 'İç hasar' },
  { value: DamageType.ACCIDENT, label: 'Kaza' },
  { value: DamageType.OTHER, label: 'Diğer' }
]

const ALL_ZONES = [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13]

const pickerZoneConfigs = computed(() => {
  const configs: Record<number, { color: string; onClick: () => void }> = {}
  ALL_ZONES.forEach(zoneId => {
    configs[zoneId] = {
      color: pickedZoneId.value === zoneId ? 'var(--rc-blue-100)' : '#f0f0f0',
      onClick: () => selectZone(zoneId)
    }
  })
  return configs
})

const rentalOptions = computed(() =>
  vehicleRentals.value.map(r => ({
    value: r.id as number,
    label: `${r.rentalNumber} - ${r.customerName || 'Müşteri'} [${r.status}]`
  }))
)

const modalTitle = computed(() => {
  if (savedDamageId.value) return 'Hasar kaydedildi'
  if (isEditMode.value) return 'Hasarı düzenle'
  return 'Yeni hasar bildir'
})

const submitLabel = computed(() => {
  if (submitting.value) return 'Kaydediliyor...'
  if (isEditMode.value) return 'Değişiklikleri kaydet'
  return 'Hasarı kaydet'
})

function selectZone(zoneId: number) {
  if (fieldsLocked.value) return
  pickedZoneId.value = zoneId
  form.value.location = getDefaultLocationForZone(zoneId)
}

watch(() => form.value.rentalId, async (rentalId) => {
  if (!rentalId) {
    if (!isRentalLocked.value) {
      form.value.customerId = undefined
      selectedCustomer.value = null
      form.value.customerResponsible = false
    }
    return
  }
  const rental = vehicleRentals.value.find(r => r.id === rentalId)
  if (rental) {
    form.value.customerId = rental.customerId
    form.value.customerResponsible = true
    try {
      selectedCustomer.value = await customersApi.getById(rental.customerId)
    } catch {
      selectedCustomer.value = null
    }
  }
})

async function loadVehicleLabel() {
  if (props.vehicleLabel) {
    resolvedVehicleLabel.value = props.vehicleLabel
    return
  }
  try {
    const v = await vehiclesApi.getById(props.vehicleId)
    resolvedVehicleLabel.value = `${v.brand} ${v.model} · ${v.plateNumber}`
  } catch {
    resolvedVehicleLabel.value = ''
  }
}

async function loadVehicleRentals() {
  loadingRentals.value = true
  try {
    const response = await rentalsApi.getAll({ size: 200 })
    vehicleRentals.value = response.content.filter(r =>
      r.vehicleId === props.vehicleId &&
      (r.status === 'ACTIVE' || r.status === 'OVERDUE' || r.status === 'RETURN_PENDING')
    )
  } catch {
    vehicleRentals.value = []
  } finally {
    loadingRentals.value = false
  }
}

async function loadDamageForEdit() {
  if (!props.damageId) return
  loadingEdit.value = true
  try {
    const damage = await damagesApi.getById(props.damageId)
    isRepaired.value = damage.repaired
    pickedZoneId.value = damage.zoneId
    form.value = {
      vehicleId: damage.vehicleId,
      rentalId: damage.rentalId ?? undefined,
      reportDate: damage.reportDate.split('T')[0] ?? '',
      damageType: damage.damageType,
      location: damage.location,
      severity: damage.severity,
      description: damage.description,
      estimatedCostAmount: damage.estimatedCostAmount ?? undefined,
      estimatedCostCurrency: damage.estimatedCostCurrency ?? 'TRY',
      reportedBy: damage.reportedBy ?? '',
      customerId: damage.customerId ?? undefined,
      customerResponsible: damage.customerResponsible ?? false
    }
    if (damage.rentalId) {
      const rental = vehicleRentals.value.find(r => r.id === damage.rentalId)
      if (rental) {
        try {
          selectedCustomer.value = await customersApi.getById(rental.customerId)
        } catch { /* ignore */ }
      }
    }
  } catch (err) {
    toast.apiError(err, 'Hasar yüklenemedi')
    emit('close')
  } finally {
    loadingEdit.value = false
  }
}

async function handleSubmit() {
  if (!form.value.description.trim()) {
    toast.error('Lütfen hasar açıklaması girin')
    return
  }

  if (form.value.customerResponsible && (!form.value.estimatedCostAmount || form.value.estimatedCostAmount <= 0)) {
    toast.error('Müşteri sorumlu ise tahmini maliyet girilmelidir')
    return
  }

  submitting.value = true
  try {
    if (isEditMode.value && props.damageId) {
      await damagesApi.update(props.damageId, form.value)
      toast.success('Hasar güncellendi')
      emit('saved')
      emit('created')
    } else {
      const created = await damagesApi.create(form.value)
      toast.success('Hasar raporu oluşturuldu')
      savedDamageId.value = created.id
    }
  } catch (err) {
    toast.apiError(err, isEditMode.value ? 'Hasar güncellenemedi' : 'Hasar raporu oluşturulamadı')
  } finally {
    submitting.value = false
  }
}

function finishWithDocuments() {
  emit('saved')
  emit('created')
  emit('close')
}

onMounted(async () => {
  await Promise.all([loadVehicleRentals(), loadVehicleLabel()])
  if (props.initialZoneId) selectZone(props.initialZoneId)
  if (props.rentalId) form.value.rentalId = props.rentalId
  if (isEditMode.value) await loadDamageForEdit()
})
</script>

<template>
  <RcModal :open="true" xl @close="emit('close')">
    <template #header>
      <div class="rcv-veh-modal__head-title">
        <div
          class="rcv-veh-modal__head-icon"
          :class="savedDamageId ? 'rcv-veh-modal__head-icon--docs' : 'rcv-veh-modal__head-icon--warning'"
        >
          <RcIcon :name="savedDamageId ? 'check' : 'warning'" />
        </div>
        <div>
          <h2 class="rc-modal__title">{{ modalTitle }}</h2>
          <div v-if="resolvedVehicleLabel" class="rc-modal__sub">{{ resolvedVehicleLabel }}</div>
        </div>
      </div>
    </template>

    <div v-if="loadingEdit" class="rc-veh-damage-map__loading">
      <div class="rc-veh-damage-map__spinner" />
      <span>Yükleniyor...</span>
    </div>

    <div v-else-if="savedDamageId" class="rc-veh-modal-form">
      <div class="rcv-form-success">
        <RcIcon name="check" />
        <div>
          <b>Hasar kaydı oluşturuldu</b>
          {{ ZONE_NAMES[pickedZoneId] }} · belgeleri şimdi ekleyebilirsiniz.
        </div>
      </div>
      <DocumentsSection
        reference-type="DAMAGE"
        :reference-id="savedDamageId"
        title="Hasar Belgeleri"
      />
    </div>

    <form v-else id="create-damage-form" class="rc-veh-modal-form" @submit.prevent="handleSubmit">
      <div v-if="isEditMode && !fieldsLocked" class="rcv-form-mode-banner rcv-form-mode-banner--edit">
        <RcIcon name="edit" />
        Mevcut hasar kaydını düzenliyorsunuz · #{{ damageId }}
      </div>
      <div v-if="fieldsLocked" class="rcv-form-mode-banner rcv-form-mode-banner--locked">
        <RcIcon name="check" />
        Onarılmış hasar · yalnızca açıklama güncellenebilir
      </div>

      <div class="rcv-damage-form-layout">
        <div>
          <div class="rcv-damage-form-layout__step">1. Hasarlı bölgeyi seç</div>
          <div
            class="rcv-car3-wrap rcv-car3-wrap--picker"
            :class="{ 'is-disabled': fieldsLocked }"
            data-rcv-car-wrap
          >
            <CarDiagramSVG
              mode="picker"
              compact
              :zones="pickerZoneConfigs"
              :picked-zone="pickedZoneId"
              @zone-click="selectZone"
            />
          </div>
          <div class="rcv-form-picked">
            <span class="rcv-form-picked__pulse" />
            <span><b>Seçili bölge:</b> {{ ZONE_NAMES[pickedZoneId] }}</span>
          </div>
        </div>

        <div>
          <div class="rcv-damage-form-layout__step">2. Hasar detayları</div>

          <RcField label="Şiddet">
            <div class="rcv-segopt rcv-segopt--cols-2">
              <button
                v-for="sev in severityOptions"
                :key="sev.value"
                type="button"
                class="rcv-segopt__item rcv-segopt__item--row"
                :class="{ 'is-on': form.severity === sev.value, 'is-disabled': fieldsLocked }"
                :disabled="fieldsLocked"
                @click="form.severity = sev.value"
              >
                <span class="rcv-segopt__item-dot" :style="{ background: sev.color }" />
                <div>
                  <b>{{ sev.label }}</b>
                  <small>{{ sev.desc }}</small>
                </div>
              </button>
            </div>
          </RcField>

          <RcField label="Hasar tipi">
            <div class="rcv-segopt rcv-segopt--cols-4">
              <button
                v-for="t in damageTypeOptions"
                :key="t.value"
                type="button"
                class="rcv-segopt__item rcv-segopt__item--center"
                :class="{ 'is-on': form.damageType === t.value, 'is-disabled': fieldsLocked }"
                :disabled="fieldsLocked"
                @click="form.damageType = t.value"
              >
                <b>{{ t.label }}</b>
              </button>
            </div>
          </RcField>

          <div class="rcv-form-grid">
            <RcField label="Tahmini onarım bedeli">
              <div class="rc-input-group">
                <span>₺</span>
                <input
                  v-model.number="form.estimatedCostAmount"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  :disabled="fieldsLocked"
                />
              </div>
            </RcField>

            <DatePicker
              v-model="form.reportDate"
              label="Bildirim tarihi"
              placeholder="Tarih seçin"
              :disabled="fieldsLocked"
            />

            <RcField label="Rapor eden">
              <RcInput v-model="form.reportedBy" placeholder="İsim" :disabled="fieldsLocked" />
            </RcField>

            <RcField label="Kiralama">
              <SearchableSelect
                v-if="!isRentalLocked"
                :model-value="form.rentalId ?? null"
                :options="rentalOptions"
                placeholder="Opsiyonel"
                search-placeholder="Kiralama ara..."
                clearable
                :loading="loadingRentals"
                :disabled="fieldsLocked"
                @update:model-value="(v) => form.rentalId = v ?? undefined"
              />
              <RcInput v-else :model-value="`Kiralama #${form.rentalId}`" disabled />
            </RcField>

            <RcField v-if="form.rentalId && selectedCustomer" label="Müşteri" class="span-2">
              <RcInput :model-value="selectedCustomer.displayName" disabled />
            </RcField>

            <RcField label="Açıklama *" class="span-2">
              <textarea
                v-model="form.description"
                class="rc-textarea"
                rows="3"
                placeholder="Hasarı kısaca anlat — boyut, konum, oluşma nedeni…"
                required
              />
            </RcField>

            <div v-if="form.rentalId && !fieldsLocked" class="span-2">
              <label class="rc-veh-modal-form__checkbox">
                <input v-model="form.customerResponsible" type="checkbox" />
                <span>Aktif kiralamaya bağla · müşteri sorumlu (alacak oluştur)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <template v-if="savedDamageId">
        <RcButton variant="accent" @click="finishWithDocuments">
          <RcIcon name="check" />
          Bitir
        </RcButton>
      </template>
      <template v-else>
        <RcButton variant="ghost" @click="emit('close')">İptal</RcButton>
        <span class="rc-spacer" />
        <RcButton
          variant="accent"
          type="submit"
          form="create-damage-form"
          :disabled="submitting || loadingEdit"
        >
          <RcIcon name="check" />
          {{ submitLabel }}
        </RcButton>
      </template>
    </template>
  </RcModal>
</template>
