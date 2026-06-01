<script setup lang="ts">
import { ref } from 'vue'
import VehicleInsuranceList from '../insurance/VehicleInsuranceList.vue'
import CreateInsuranceModal from '../insurance/CreateInsuranceModal.vue'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import { useToast } from '@/composables'

const props = defineProps<{ vehicleId: number }>()

const toast = useToast()
const insuranceListRef = ref<InstanceType<typeof VehicleInsuranceList> | null>(null)
const showCreateInsuranceModal = ref(false)

function handleInsuranceCreated() {
  showCreateInsuranceModal.value = false
  insuranceListRef.value?.refresh()
  toast.success('Sigorta poliçesi eklendi')
}
</script>

<template>
  <div class="rc-veh-docs-tab">
    <div class="rc-card">
      <div class="rc-card__body rc-card__body--flush">
        <VehicleInsuranceList
          ref="insuranceListRef"
          :vehicle-id="vehicleId"
          @create-new="showCreateInsuranceModal = true"
        />
      </div>
    </div>

    <div class="rc-card">
      <div class="rc-card__head">
        <div class="rc-card__title">Resmi belgeler</div>
      </div>
      <div class="rc-card__body rc-card__body--flush rc-veh-docs-tab__files">
        <DocumentsSection
          reference-type="VEHICLE"
          :reference-id="vehicleId"
          title=""
        />
      </div>
    </div>

    <Teleport to="body">
      <CreateInsuranceModal
        :show="showCreateInsuranceModal"
        :vehicle-id="vehicleId"
        @close="showCreateInsuranceModal = false"
        @success="handleInsuranceCreated"
      />
    </Teleport>
  </div>
</template>
