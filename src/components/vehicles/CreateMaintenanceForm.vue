<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { maintenancesApi, serviceProvidersApi, vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import FeatureGate from '@/components/common/FeatureGate.vue'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { MaintenanceType } from '@/types'
import type { CreateMaintenanceRecordForm, MaintenanceRecord, ServiceProviderResponse } from '@/types'

const props = defineProps<{
  vehicleId: number
  initialCurrentKm?: number
  maintenanceId?: number
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
const savedMaintenanceId = ref<number | null>(null)
const serviceProviders = ref<ServiceProviderResponse[]>([])
const loadingProviders = ref(false)
const newPart = ref('')
const resolvedVehicleLabel = ref(props.vehicleLabel ?? '')
const createReminder = ref(true)

const isEditMode = computed(() => props.maintenanceId != null)

const form = ref<CreateMaintenanceRecordForm>({
  vehicleId: props.vehicleId,
  maintenanceType: MaintenanceType.SERVICE,
  maintenanceDate: new Date().toISOString().split('T')[0] ?? '',
  endDate: undefined,
  currentKm: props.initialCurrentKm ?? 0,
  costAmount: undefined,
  costCurrency: 'TRY',
  serviceProviderId: undefined,
  description: '',
  affectedZones: [],
  partsReplaced: [],
  paintColor: ''
})

const maintenanceTypeCards: Array<{
  value: MaintenanceType
  label: string
  desc: string
  icon: IconName
  nextHint: string
}> = [
  { value: MaintenanceType.SERVICE, label: 'Periyodik bakım', desc: 'Yağ, filtre, fren kontrolü', icon: 'wrench', nextHint: 'Sonraki periyodik bakım · +10.000 km' },
  { value: MaintenanceType.TIRE_CHANGE, label: 'Lastik / jant', desc: 'Değişim, dengeleme', icon: 'globe', nextHint: 'Lastik rotasyonu · 6 ay sonra' },
  { value: MaintenanceType.ELECTRICAL_REPAIR, label: 'Akü & elektrik', desc: 'Akü, marş, far', icon: 'bolt', nextHint: 'Akü kontrolü · 12 ay sonra' },
  { value: MaintenanceType.BRAKE_SERVICE, label: 'Fren sistemi', desc: 'Balata, disk, hidrolik', icon: 'shield', nextHint: 'Fren balata kontrolü · +15.000 km' },
  { value: MaintenanceType.BODY_WORK, label: 'Kaporta / boya', desc: 'Boyasız onarım, boya', icon: 'sparkle', nextHint: 'Kaporta kontrolü · ihtiyaç halinde' },
  { value: MaintenanceType.INSPECTION, label: 'Muayene / vizite', desc: 'TÜVTürk, ekspertiz', icon: 'check', nextHint: 'Yıllık muayene tarihi' },
  { value: MaintenanceType.OIL_CHANGE, label: 'Yağ değişimi', desc: 'Motor yağı + filtre', icon: 'wrench', nextHint: 'Sonraki yağ değişimi · +10.000 km' },
  { value: MaintenanceType.OTHER, label: 'Diğer', desc: 'Klima, lastik tamiri, vb.', icon: 'folder', nextHint: 'Genel kontrol önerisi' }
]

const selectedTypeCard = computed(() =>
  maintenanceTypeCards.find(t => t.value === form.value.maintenanceType)
)

const currencyOptions = [
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' }
]

const serviceProviderOptions = computed(() =>
  serviceProviders.value.map(p => ({ value: p.id as number, label: p.name }))
)

const zones = [
  { id: 1, name: 'Sağ ön' },
  { id: 2, name: 'Ön cam' },
  { id: 3, name: 'Kaput' },
  { id: 4, name: 'Sol ön' },
  { id: 6, name: 'Sol yan' },
  { id: 7, name: 'Arka sol' },
  { id: 8, name: 'Bagaj' },
  { id: 9, name: 'Arka cam' },
  { id: 10, name: 'Sağ arka' },
  { id: 12, name: 'Sağ yan' },
  { id: 13, name: 'Tavan' }
]

const modalTitle = computed(() => {
  if (savedMaintenanceId.value) return 'Bakım kaydedildi'
  if (isEditMode.value) return 'Bakım kaydını düzenle'
  return 'Yeni bakım / servis kaydı'
})

const submitLabel = computed(() => {
  if (submitting.value) return 'Kaydediliyor...'
  if (isEditMode.value) return 'Değişiklikleri kaydet'
  return 'Kaydı oluştur'
})

function toggleZone(zoneId: number) {
  const index = form.value.affectedZones!.indexOf(zoneId)
  if (index > -1) {
    form.value.affectedZones!.splice(index, 1)
  } else {
    form.value.affectedZones!.push(zoneId)
  }
}

function addPart() {
  if (newPart.value.trim()) {
    form.value.partsReplaced!.push(newPart.value.trim())
    newPart.value = ''
  }
}

function removePart(index: number) {
  form.value.partsReplaced!.splice(index, 1)
}

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

async function fetchServiceProviders() {
  loadingProviders.value = true
  try {
    serviceProviders.value = await serviceProvidersApi.getAll(true)
  } catch {
    toast.error('Servis sağlayıcılar yüklenemedi')
  } finally {
    loadingProviders.value = false
  }
}

async function loadMaintenanceForEdit() {
  if (!props.maintenanceId) return
  loadingEdit.value = true
  try {
    const record = await maintenancesApi.getById(props.maintenanceId)
    form.value = {
      vehicleId: record.vehicleId,
      maintenanceType: record.maintenanceType,
      maintenanceDate: record.maintenanceDate.split('T')[0] ?? '',
      endDate: record.endDate ? (record.endDate.split('T')[0] ?? undefined) : undefined,
      currentKm: record.currentKm,
      costAmount: record.costAmount ?? undefined,
      costCurrency: record.costCurrency ?? 'TRY',
      serviceProviderId: (record as MaintenanceRecord & { serviceProviderId?: number }).serviceProviderId ?? undefined,
      description: record.description ?? '',
      affectedZones: record.affectedZones ?? [],
      partsReplaced: record.partsReplaced ?? [],
      paintColor: record.paintColor ?? ''
    }
  } catch (err) {
    toast.apiError(err, 'Bakım kaydı yüklenemedi')
    emit('close')
  } finally {
    loadingEdit.value = false
  }
}

async function handleSubmit() {
  if (!form.value.currentKm || form.value.currentKm <= 0) {
    toast.error('Lütfen geçerli bir KM değeri girin')
    return
  }

  if (form.value.endDate && form.value.endDate < form.value.maintenanceDate) {
    toast.error('Bitiş tarihi servis tarihinden önce olamaz')
    return
  }

  submitting.value = true
  try {
    if (isEditMode.value && props.maintenanceId) {
      await maintenancesApi.update(props.maintenanceId, form.value)
      toast.success('Bakım kaydı güncellendi')
      emit('saved')
      emit('created')
    } else {
      const created = await maintenancesApi.create(form.value)
      toast.success('Bakım kaydı oluşturuldu')
      savedMaintenanceId.value = created.id
      if (createReminder.value) {
        toast.info('Bakım hatırlatıcısı planlandı')
      }
    }
  } catch (err) {
    toast.apiError(err, isEditMode.value ? 'Bakım güncellenemedi' : 'Bakım kaydı oluşturulamadı')
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
  await Promise.all([fetchServiceProviders(), loadVehicleLabel()])
  if (props.initialCurrentKm != null && props.initialCurrentKm >= 0 && !isEditMode.value) {
    form.value.currentKm = props.initialCurrentKm
  }
  if (!isEditMode.value) {
    try {
      const v = await vehiclesApi.getById(props.vehicleId)
      if (v?.currentKm != null) form.value.currentKm = v.currentKm
    } catch { /* ignore */ }
  }
  if (isEditMode.value) await loadMaintenanceForEdit()
})
</script>

<template>
  <RcModal :open="true" wide @close="emit('close')">
    <template #header>
      <div class="rcv-veh-modal__head-title">
        <div
          class="rcv-veh-modal__head-icon"
          :class="savedMaintenanceId ? 'rcv-veh-modal__head-icon--docs' : 'rcv-veh-modal__head-icon--maint'"
        >
          <RcIcon :name="savedMaintenanceId ? 'check' : 'wrench'" />
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

    <div v-else-if="savedMaintenanceId" class="rc-veh-modal-form">
      <div class="rcv-form-success">
        <RcIcon name="check" />
        <div>
          <b>Servis kaydı oluşturuldu</b>
          {{ selectedTypeCard?.label }} · belgeleri şimdi ekleyebilirsiniz.
        </div>
      </div>
      <FeatureGate feature="MAINTENANCE_ATTACHMENTS">
        <DocumentsSection
          reference-type="MAINTENANCE"
          :reference-id="savedMaintenanceId"
          title="Bakım Belgeleri"
        />
      </FeatureGate>
    </div>

    <form v-else id="create-maintenance-form" class="rc-veh-modal-form" @submit.prevent="handleSubmit">
      <div v-if="isEditMode" class="rcv-form-mode-banner rcv-form-mode-banner--edit">
        <RcIcon name="edit" />
        Mevcut bakım kaydını düzenliyorsunuz · #{{ maintenanceId }}
      </div>

      <div class="rcv-damage-form-layout__step">1. Bakım tipi</div>
      <div class="rcv-segopt rcv-segopt--cols-4 rcv-veh-modal-form__type-grid">
        <button
          v-for="t in maintenanceTypeCards"
          :key="t.value"
          type="button"
          class="rcv-segopt__item"
          :class="{ 'is-on': form.maintenanceType === t.value }"
          @click="form.maintenanceType = t.value"
        >
          <div class="rcv-segopt__item-head">
            <RcIcon :name="t.icon" />
            <b>{{ t.label }}</b>
          </div>
          <small>{{ t.desc }}</small>
        </button>
      </div>

      <div class="rcv-damage-form-layout__step">2. Servis detayları</div>
      <div class="rcv-form-grid">
        <DatePicker
          v-model="form.maintenanceDate"
          label="Servis tarihi"
          placeholder="Tarih seçin"
        />

        <RcField label="Araç ne zaman hazır olacak? (opsiyonel)">
          <DatePicker
            v-model="form.endDate"
            :min="form.maintenanceDate || undefined"
            placeholder="Tarih seçin"
          />
        </RcField>

        <RcField label="KM *">
          <div class="rc-input-group">
            <input
              v-model.number="form.currentKm"
              type="number"
              placeholder="0"
              min="0"
              required
            />
            <span>km</span>
          </div>
        </RcField>

        <RcField label="Servis sağlayıcı">
          <SearchableSelect
            :model-value="form.serviceProviderId ?? null"
            :options="serviceProviderOptions"
            placeholder="Bosch Servis · Yetkili"
            search-placeholder="Sağlayıcı ara..."
            clearable
            :loading="loadingProviders"
            @update:model-value="(v) => form.serviceProviderId = v ?? undefined"
          />
        </RcField>

        <RcField label="Tutar">
          <div class="rc-input-group">
            <span>₺</span>
            <input
              v-model.number="form.costAmount"
              type="number"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
        </RcField>

        <RcField label="Para birimi">
          <SearchableSelect
            :model-value="form.costCurrency ?? null"
            :options="currencyOptions"
            placeholder="Para birimi"
            search-placeholder="Ara..."
            @update:model-value="form.costCurrency = ($event as string) ?? 'TRY'"
          />
        </RcField>

        <RcField v-if="form.maintenanceType === MaintenanceType.PAINT" label="Boya rengi">
          <RcInput v-model="form.paintColor" placeholder="Beyaz, Siyah, vb." />
        </RcField>

        <RcField label="İşlem detayı" class="span-2">
          <textarea
            v-model="form.description"
            class="rc-textarea"
            rows="3"
            :placeholder="`${selectedTypeCard?.label ?? 'Bakım'} — örn: motor yağı + yağ filtresi değişimi`"
          />
        </RcField>

        <RcField label="Etkilenen bölgeler" class="span-2">
          <div class="rcv-zone-segopt">
            <button
              v-for="zone in zones"
              :key="zone.id"
              type="button"
              class="rcv-zone-segopt__item"
              :class="{ 'is-on': form.affectedZones!.includes(zone.id) }"
              @click="toggleZone(zone.id)"
            >
              {{ zone.name }}
            </button>
          </div>
        </RcField>

        <RcField label="Değiştirilen parçalar" class="span-2">
          <div class="parts-manager">
            <div class="parts-input">
              <RcInput
                v-model="newPart"
                placeholder="Parça adı girin"
                @keyup.enter.prevent="addPart"
              />
              <RcButton type="button" variant="ghost" size="xs" @click="addPart">
                Ekle
              </RcButton>
            </div>
            <div v-if="form.partsReplaced!.length > 0" class="parts-list">
              <div v-for="(part, index) in form.partsReplaced" :key="index" class="part-item">
                <span>{{ part }}</span>
                <button type="button" class="btn-remove" @click="removePart(index)">×</button>
              </div>
            </div>
          </div>
        </RcField>

        <div v-if="!isEditMode && selectedTypeCard" class="span-2">
          <div class="rcv-form-hint-card">
            <div class="rcv-form-hint-card__label">Sonraki bakım önerisi</div>
            <div class="rcv-form-hint-card__row">
              <RcIcon name="calendar" />
              <div class="rcv-form-hint-card__body">
                <div class="rcv-form-hint-card__title">{{ selectedTypeCard.nextHint }}</div>
                <div class="rcv-form-hint-card__sub">
                  ≈ {{ new Intl.NumberFormat('tr-TR').format(form.currentKm + 10000) }} km
                </div>
              </div>
              <label class="rc-veh-modal-form__checkbox">
                <input v-model="createReminder" type="checkbox" />
                <span>Hatırlatıcı</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <template v-if="savedMaintenanceId">
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
          form="create-maintenance-form"
          :disabled="submitting || loadingEdit"
        >
          <RcIcon name="check" />
          {{ submitLabel }}
        </RcButton>
      </template>
    </template>
  </RcModal>
</template>
