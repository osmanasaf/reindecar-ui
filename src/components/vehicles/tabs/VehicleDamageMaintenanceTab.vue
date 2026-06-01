<script setup lang="ts">
import { ref } from 'vue'
import { RcSegTab } from '@/components/rc'
import VehicleDamageMap from '../VehicleDamageMap.vue'
import VehicleMaintenanceSection from '../VehicleMaintenanceSection.vue'
import CreateDamageForm from '../CreateDamageForm.vue'
import CreateMaintenanceForm from '../CreateMaintenanceForm.vue'

const props = defineProps<{
  vehicleId: number
  currentKm: number
  vehicleLabel?: string
}>()

type SubView = 'damage' | 'maintenance'

const activeView = ref<SubView>('damage')
const damageOpenCount = ref(0)
const maintenanceCount = ref(0)

const showDamageForm = ref(false)
const damageFormZoneId = ref<number | undefined>()
const editingDamageId = ref<number | undefined>()

const showMaintenanceForm = ref(false)
const editingMaintenanceId = ref<number | undefined>()

const damageMapRef = ref<InstanceType<typeof VehicleDamageMap> | null>(null)
const maintenanceRef = ref<InstanceType<typeof VehicleMaintenanceSection> | null>(null)

function onDamageCounts(payload: { open: number; total: number }) {
  damageOpenCount.value = payload.open
}

function onMaintenanceCount(count: number) {
  maintenanceCount.value = count
}

function openDamageCreate(zoneId?: number) {
  editingDamageId.value = undefined
  damageFormZoneId.value = zoneId
  showDamageForm.value = true
}

function openDamageEdit(damageId: number) {
  editingDamageId.value = damageId
  damageFormZoneId.value = undefined
  showDamageForm.value = true
}

function openMaintenanceCreate() {
  editingMaintenanceId.value = undefined
  showMaintenanceForm.value = true
}

function openMaintenanceEdit(maintenanceId: number) {
  editingMaintenanceId.value = maintenanceId
  showMaintenanceForm.value = true
}

function closeDamageForm() {
  showDamageForm.value = false
  editingDamageId.value = undefined
  damageFormZoneId.value = undefined
}

function closeMaintenanceForm() {
  showMaintenanceForm.value = false
  editingMaintenanceId.value = undefined
}

function onDamageSaved() {
  closeDamageForm()
  damageMapRef.value?.refresh()
}

function onMaintenanceSaved() {
  closeMaintenanceForm()
  maintenanceRef.value?.refresh()
}
</script>

<template>
  <div class="rc-veh-damage-maint-tab">
    <div class="rc-segtabs rc-veh-damage-maint-tab__segtabs">
      <RcSegTab
        id="damage"
        :active="activeView"
        :count="damageOpenCount || undefined"
        @select="activeView = $event as SubView"
      >
        Hasar
      </RcSegTab>
      <RcSegTab
        id="maintenance"
        :active="activeView"
        :count="maintenanceCount || undefined"
        @select="activeView = $event as SubView"
      >
        Bakım
      </RcSegTab>
    </div>

    <Transition name="rcv-view-fade" mode="out-in">
      <VehicleDamageMap
        v-if="activeView === 'damage'"
        ref="damageMapRef"
        :vehicle-id="vehicleId"
        @counts="onDamageCounts"
        @add-damage="openDamageCreate"
        @edit-damage="openDamageEdit"
      />
      <VehicleMaintenanceSection
        v-else
        ref="maintenanceRef"
        :vehicle-id="vehicleId"
        :current-km="currentKm"
        @count="onMaintenanceCount"
        @add-maintenance="openMaintenanceCreate"
        @edit-maintenance="openMaintenanceEdit"
      />
    </Transition>

    <CreateDamageForm
      v-if="showDamageForm"
      :vehicle-id="vehicleId"
      :vehicle-label="props.vehicleLabel"
      :initial-zone-id="damageFormZoneId"
      :damage-id="editingDamageId"
      @close="closeDamageForm"
      @saved="onDamageSaved"
    />

    <CreateMaintenanceForm
      v-if="showMaintenanceForm"
      :vehicle-id="vehicleId"
      :vehicle-label="props.vehicleLabel"
      :initial-current-km="currentKm"
      :maintenance-id="editingMaintenanceId"
      @close="closeMaintenanceForm"
      @saved="onMaintenanceSaved"
    />
  </div>
</template>
