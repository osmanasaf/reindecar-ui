<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { vehiclesApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import { RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import DatePicker from '@/components/base/DatePicker.vue'
import { formatDate, formatKm } from '@/utils/format'
import type { VehicleDetails } from '@/types'

const props = defineProps<{ vehicleId: number }>()

const toast = useToast()
const { isEnabled } = useFeatures()

const loading = ref(true)
const saving = ref(false)
const savingService = ref(false)
const hasUtts = ref(false)
const loaded = ref(false)
const details = ref<VehicleDetails | null>(null)
const editingService = ref(false)

const serviceForm = ref({
  nextServiceDate: '',
  nextServiceKm: null as number | null,
  nextTireChangeDate: '',
})

const serviceRows = computed(() => {
  const d = details.value
  return [
    { label: 'Sonraki servis tarihi', value: d?.nextServiceDate ? formatDate(d.nextServiceDate) : '—' },
    { label: 'Sonraki servis km', value: d?.nextServiceKm != null ? formatKm(d.nextServiceKm) : '—' },
    { label: 'Lastik değişim tarihi', value: d?.nextTireChangeDate ? formatDate(d.nextTireChangeDate) : '—' },
    { label: 'Son servis tarihi', value: d?.lastServiceDate ? formatDate(d.lastServiceDate) : '—' },
  ]
})

async function loadDetails() {
  if (!isEnabled('VEHICLE_UTTS')) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    details.value = await vehiclesApi.getDetails(props.vehicleId)
    hasUtts.value = details.value.hasUtts
    loaded.value = true
  } catch {
    toast.error('Araç filo bilgileri yüklenemedi')
  } finally {
    loading.value = false
  }
}

function startServiceEdit() {
  serviceForm.value = {
    nextServiceDate: details.value?.nextServiceDate?.slice(0, 10) ?? '',
    nextServiceKm: details.value?.nextServiceKm ?? null,
    nextTireChangeDate: details.value?.nextTireChangeDate?.slice(0, 10) ?? '',
  }
  editingService.value = true
}

async function saveServiceDates() {
  savingService.value = true
  try {
    details.value = await vehiclesApi.patchDetails(props.vehicleId, {
      nextServiceDate: serviceForm.value.nextServiceDate || null,
      nextServiceKm: serviceForm.value.nextServiceKm,
      nextTireChangeDate: serviceForm.value.nextTireChangeDate || null,
    })
    hasUtts.value = details.value.hasUtts
    editingService.value = false
    toast.success('Servis bilgileri güncellendi')
  } catch (err) {
    toast.apiError(err, 'Servis bilgileri kaydedilemedi')
  } finally {
    savingService.value = false
  }
}

async function saveUtts() {
  saving.value = true
  try {
    const updated = await vehiclesApi.patchDetails(props.vehicleId, { hasUtts: hasUtts.value })
    details.value = updated
    hasUtts.value = updated.hasUtts
    toast.success('UTTS bilgisi güncellendi')
  } catch (err) {
    toast.apiError(err, 'UTTS bilgisi kaydedilemedi')
  } finally {
    saving.value = false
  }
}

onMounted(loadDetails)
</script>

<template>
  <FeatureGate feature="VEHICLE_UTTS">
    <div class="rc-card rc-veh-fleet-card">
      <div class="rc-card__head">
        <div>
          <div class="rc-card__title">Filo &amp; UTTS</div>
          <div class="rc-veh-fleet-card__sub">Ulusal Taşıt Tanıma Sistemi kaydı ve servis takibi</div>
        </div>
      </div>
      <div class="rc-card__body">
        <div v-if="loading" class="rc-skeleton" style="height: 48px" />
        <template v-else-if="loaded">
          <label class="rc-veh-fleet-card__check">
            <input v-model="hasUtts" type="checkbox" />
            <span>
              <strong>UTTS kayıtlı araç</strong>
              <small>Araç Ulusal Taşıt Tanıma Sistemine kayıtlıdır</small>
            </span>
          </label>
          <div class="rc-veh-fleet-card__actions">
            <RcButton variant="secondary" size="sm" :disabled="saving" @click="saveUtts">
              <RcIcon name="check" :size="14" />
              Kaydet
            </RcButton>
          </div>

          <div class="rc-veh-fleet-card__section">
            <div class="rc-veh-fleet-card__section-head">
              <span class="rc-veh-fleet-card__section-title">Servis tarihleri</span>
              <RcButton
                v-if="!editingService"
                variant="ghost"
                size="xs"
                @click="startServiceEdit"
              >
                <RcIcon name="edit" :size="13" />
                Düzenle
              </RcButton>
            </div>

            <div v-if="!editingService" class="rc-veh-fleet-card__rows">
              <div v-for="row in serviceRows" :key="row.label" class="rc-veh-fleet-card__row">
                <span class="rc-veh-fleet-card__row-label">{{ row.label }}</span>
                <span class="rc-veh-fleet-card__row-value rc-mono">{{ row.value }}</span>
              </div>
            </div>

            <form v-else class="rc-veh-fleet-card__form" @submit.prevent="saveServiceDates">
              <RcField label="Sonraki servis tarihi">
                <DatePicker v-model="serviceForm.nextServiceDate" placeholder="Tarih seçin" />
              </RcField>
              <RcField label="Sonraki servis km">
                <input v-model.number="serviceForm.nextServiceKm" type="number" class="rc-input" min="0" placeholder="Örn: 52000" />
              </RcField>
              <RcField label="Lastik değişim tarihi">
                <DatePicker v-model="serviceForm.nextTireChangeDate" placeholder="Tarih seçin" />
              </RcField>
              <div class="rc-veh-fleet-card__form-actions">
                <RcButton variant="ghost" size="sm" @click="editingService = false">Vazgeç</RcButton>
                <RcButton type="submit" variant="secondary" size="sm" :loading="savingService">Kaydet</RcButton>
              </div>
            </form>
          </div>
        </template>
      </div>
    </div>
  </FeatureGate>
</template>

<style scoped>
.rc-veh-fleet-card__sub {
  font-size: 12.5px;
  color: var(--rc-text-muted);
  margin-top: 2px;
}

.rc-veh-fleet-card__check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.rc-veh-fleet-card__check input {
  margin-top: 3px;
}

.rc-veh-fleet-card__check strong {
  display: block;
  font-size: 14px;
}

.rc-veh-fleet-card__check small {
  display: block;
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--rc-text-muted);
}

.rc-veh-fleet-card__actions {
  margin-top: 14px;
}

.rc-veh-fleet-card__section {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--rc-border-subtle);
}

.rc-veh-fleet-card__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.rc-veh-fleet-card__section-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: var(--rc-tracking-wide);
  text-transform: uppercase;
  color: var(--rc-text-faint);
}

.rc-veh-fleet-card__rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rc-veh-fleet-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.rc-veh-fleet-card__row-label {
  color: var(--rc-text-muted);
}

.rc-veh-fleet-card__row-value {
  font-size: 12.5px;
}

.rc-veh-fleet-card__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rc-veh-fleet-card__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
