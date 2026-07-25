<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEnumTranslations, useToast } from '@/composables'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import CreateClaimModal from '@/components/accounting/insurance-claims/CreateClaimModal.vue'
import { insuranceClaimsApi } from '@/api'
import { RcModal, RcBadge, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { CreateClaimRequest, DamageHistoryItem, DamageReport } from '@/types'

type DamageDetail = DamageHistoryItem | DamageReport

interface Props {
  damage: DamageDetail | null
  visible: boolean
  vehicleId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  edit: [damageId: number]
  claimCreated: [damageId: number]
}>()

const { translateDamageType, translateSeverity, translateDamageLocation } = useEnumTranslations()
const toast = useToast()

const showCreateClaimModal = ref(false)
const creatingClaim = ref(false)

const claimVehicleId = computed(() => props.vehicleId ?? (props.damage as DamageReport | null)?.vehicleId ?? null)

const canCreateClaim = computed(() => props.damage !== null && claimVehicleId.value !== null)

async function handleCreateClaim(request: CreateClaimRequest) {
  creatingClaim.value = true
  try {
    await insuranceClaimsApi.create(request)
    toast.success('Sigorta başvurusu oluşturuldu')
    showCreateClaimModal.value = false
    if (props.damage) emit('claimCreated', props.damage.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Sigorta başvurusu oluşturulamadı')
  } finally {
    creatingClaim.value = false
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function handleEdit() {
  if (props.damage) {
    emit('edit', props.damage.id)
  }
}
</script>

<template>
  <RcModal
    :open="visible && damage !== null"
    wide
    :title="damage ? translateDamageType(damage.damageType) : ''"
    @close="emit('close')"
  >
    <div v-if="damage" class="rc-veh-detail-modal">
      <RcBadge :variant="damage.repaired ? 'success' : 'warning'" class="rc-veh-detail-modal__status">
        {{ damage.repaired ? 'Onarıldı' : 'Aktif Hasar' }}
      </RcBadge>

      <div class="detail-section">
        <h3>Hasar Bilgileri</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Hasar Tipi</span>
            <span class="value">{{ translateDamageType(damage.damageType) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Lokasyon</span>
            <span class="value">{{ translateDamageLocation(damage.location) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Şiddet</span>
            <span class="value">{{ translateSeverity(damage.severity) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Rapor Tarihi</span>
            <span class="value">{{ formatDate(damage.reportDate) }}</span>
          </div>
        </div>
      </div>

      <div v-if="damage.repaired" class="detail-section repair-section">
        <h3>Onarım Bilgileri</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Onarım Tarihi</span>
            <span class="value">{{ damage.repairedDate ? formatDate(damage.repairedDate) : '-' }}</span>
          </div>
        </div>
      </div>

      <DocumentsSection
        reference-type="DAMAGE"
        :reference-id="damage.id"
        title="Hasar Belgeleri"
      />
    </div>

    <template #footer>
      <RcButton variant="ghost" @click="emit('close')">Kapat</RcButton>
      <RcButton
        v-if="canCreateClaim"
        variant="secondary"
        :disabled="creatingClaim"
        @click="showCreateClaimModal = true"
      >
        <RcIcon name="shield" />
        Sigorta başvurusu
      </RcButton>
      <RcButton variant="secondary" @click="handleEdit">
        <RcIcon name="edit" />
        Düzenle
      </RcButton>
    </template>
  </RcModal>

  <CreateClaimModal
    v-if="damage && claimVehicleId !== null"
    :show="showCreateClaimModal"
    :vehicle-id="claimVehicleId"
    :damage-report-id="damage.id"
    :default-amount="damage.estimatedCostAmount ?? undefined"
    @close="showCreateClaimModal = false"
    @submit="handleCreateClaim"
  />
</template>

<style scoped>
.rc-veh-detail-modal__status {
  margin-bottom: 16px;
}
</style>
