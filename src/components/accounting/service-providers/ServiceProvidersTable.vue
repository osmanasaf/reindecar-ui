<script setup lang="ts">
import type { ServiceProviderResponse } from '@/types'
import { useEnumTranslations } from '@/composables'
import { RcButton, RcBadge } from '@/components/rc'
import { formatPhone } from '@/utils/format'

defineProps<{
  providers: readonly ServiceProviderResponse[]
}>()

const emit = defineEmits<{
  rowClick: [id: number]
  edit: [id: number]
}>()

const { translateProviderType, translateServiceType } = useEnumTranslations()

function location(provider: ServiceProviderResponse): string {
  const parts = [provider.district, provider.city].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

function servicesLabel(provider: ServiceProviderResponse): string {
  if (!provider.serviceTypes?.length) return '—'
  return provider.serviceTypes.map(t => translateServiceType(t)).join(', ')
}
</script>

<template>
  <div class="rc-card" style="overflow: hidden">
    <table class="rc-table rcv-table--slim">
      <thead>
        <tr>
          <th>Firma</th>
          <th>Tip</th>
          <th>Konum</th>
          <th>İletişim</th>
          <th>Hizmetler</th>
          <th>Durum</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="provider in providers"
          :key="provider.id"
          :class="{ 'rca-row--muted': !provider.active }"
          style="cursor: pointer"
          @click="emit('rowClick', provider.id)"
        >
          <td>
            <div class="rcr-row__primary">{{ provider.name }}</div>
            <div class="rcr-row__secondary rcr-row__mono">{{ provider.code }}</div>
          </td>
          <td>{{ translateProviderType(provider.type) }}</td>
          <td>{{ location(provider) }}</td>
          <td>
            <div v-if="provider.phone" class="rcr-row__primary">{{ formatPhone(provider.phone) }}</div>
            <div v-if="provider.contactPerson" class="rcr-row__secondary">{{ provider.contactPerson }}</div>
            <span v-if="!provider.phone && !provider.contactPerson" class="rcr-row__secondary">—</span>
          </td>
          <td>
            <span class="rcr-row__secondary" style="max-width: 200px; display: inline-block">
              {{ servicesLabel(provider) }}
            </span>
          </td>
          <td>
            <RcBadge :variant="provider.active ? 'success' : 'default'">
              {{ provider.active ? 'Aktif' : 'Pasif' }}
            </RcBadge>
          </td>
          <td class="rc-right" @click.stop>
            <RcButton variant="ghost" size="xs" @click="emit('edit', provider.id)">
              Düzenle
            </RcButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
