<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { vehiclesApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import { RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'

const props = defineProps<{ vehicleId: number }>()

const toast = useToast()
const { isEnabled } = useFeatures()

const loading = ref(true)
const saving = ref(false)
const hasUtts = ref(false)
const loaded = ref(false)

async function loadDetails() {
  if (!isEnabled('VEHICLE_UTTS')) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const details = await vehiclesApi.getDetails(props.vehicleId)
    hasUtts.value = details.hasUtts
    loaded.value = true
  } catch {
    toast.error('Araç filo bilgileri yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function saveUtts() {
  saving.value = true
  try {
    const updated = await vehiclesApi.patchDetails(props.vehicleId, { hasUtts: hasUtts.value })
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
          <div class="rc-veh-fleet-card__sub">Ulusal Taşıt Tanıma Sistemi kaydı</div>
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
</style>
