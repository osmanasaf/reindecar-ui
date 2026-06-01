<script setup lang="ts">
import { useEnumTranslations } from '@/composables'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import { RcModal, RcBadge, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { DamageHistoryItem, DamageReport } from '@/types'

type DamageDetail = DamageHistoryItem | DamageReport

interface Props {
  damage: DamageDetail | null
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  edit: [damageId: number]
}>()

const { translateDamageType, translateSeverity, translateDamageLocation } = useEnumTranslations()

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
      <RcButton variant="secondary" @click="handleEdit">
        <RcIcon name="edit" />
        Düzenle
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rc-veh-detail-modal__status {
  margin-bottom: 16px;
}
</style>
