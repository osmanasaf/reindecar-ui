<script setup lang="ts">
import { useEnumTranslations } from '@/composables'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import { RcModal, RcBadge, RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { MaintenanceHistoryItem, MaintenanceRecord } from '@/types'

type MaintenanceDetail = MaintenanceHistoryItem | MaintenanceRecord

interface Props {
  maintenance: MaintenanceDetail | null
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  edit: [maintenanceId: number]
}>()

const { translateMaintenanceType } = useEnumTranslations()

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function formatCurrency(amount: number | null): string {
  if (!amount) return '-'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount)
}

function formatKm(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

function serviceProviderDisplay(m: MaintenanceDetail | null): string | null {
  if (!m) return null
  const r = m as unknown as Record<string, unknown>
  return (r.serviceProvider as string) ?? (r.serviceProviderName as string) ?? null
}

function handleEdit() {
  if (props.maintenance) {
    emit('edit', props.maintenance.id)
  }
}
</script>

<template>
  <RcModal
    :open="visible && maintenance !== null"
    wide
    :title="maintenance ? translateMaintenanceType(maintenance.maintenanceType) : ''"
    @close="emit('close')"
  >
    <div v-if="maintenance" class="rc-veh-detail-modal">
      <RcBadge variant="info" class="rc-veh-detail-modal__status">Bakım</RcBadge>

      <div class="detail-section">
        <h3>Bakım Bilgileri</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Bakım Tipi</span>
            <span class="value">{{ translateMaintenanceType(maintenance.maintenanceType) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Bakım Tarihi</span>
            <span class="value">{{ formatDate(maintenance.maintenanceDate) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Güncel KM</span>
            <span class="value">{{ formatKm(maintenance.currentKm) }}</span>
          </div>
          <div v-if="maintenance.costAmount" class="detail-item">
            <span class="label">Maliyet</span>
            <span class="value">{{ formatCurrency(maintenance.costAmount) }}</span>
          </div>
        </div>
      </div>

      <div v-if="serviceProviderDisplay(maintenance)" class="detail-section">
        <h3>Servis Bilgileri</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Servis Sağlayıcı</span>
            <span class="value">{{ serviceProviderDisplay(maintenance) }}</span>
          </div>
        </div>
      </div>

      <DocumentsSection
        reference-type="MAINTENANCE"
        :reference-id="maintenance.id"
        title="Bakım Belgeleri"
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
