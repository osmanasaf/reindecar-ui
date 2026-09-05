<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useTerminology } from '@/composables/useTerminology'

interface BreadcrumbItem {
  label: string
  to?: string
}

const route = useRoute()
const { terms } = useTerminology()

const terminologyOverrides = computed<Record<string, string>>(() => ({
  rentals: terms.value.rentalPlural,
  'rental-create': terms.value.rentalNew,
  'rental-detail': `${terms.value.rental} Detayı`,
  customers: terms.value.customerPlural,
  'customer-create': terms.value.customerNew,
  'customer-edit': `${terms.value.customer} Düzenle`,
  'customer-detail': `${terms.value.customer} Detayı`,
  branches: terms.value.branchPlural,
}))

const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  vehicles: 'Araçlar',
  'vehicle-create': 'Yeni Araç',
  'vehicle-edit': 'Araç Düzenle',
  'vehicle-detail': 'Araç Detayı',
  customers: 'Müşteriler',
  'customer-create': 'Yeni Müşteri',
  'customer-edit': 'Müşteri Düzenle',
  'customer-detail': 'Müşteri Detayı',
  rentals: 'Kiralamalar',
  'rental-create': 'Yeni Kiralama',
  'rental-detail': 'Kiralama Detayı',
  branches: 'Şubeler',
  users: 'Kullanıcılar',
  'user-invitations': 'Davetler',
  settings: 'Ayarlar',
  receivables: 'Alacak / Verecek',
  'receivable-detail': 'Alacak Detayı',
  payables: 'Alacak / Verecek',
  'payable-detail': 'Verecek Detayı',
  finance: 'Alacak / Verecek',
  'insurance-claims': 'Sigorta Başvuruları',
  'claim-detail': 'Başvuru Detayı',
  'service-providers': 'Servis Sağlayıcılar',
  'provider-detail': 'Sağlayıcı Detayı',
  'installments-dashboard': 'Araç Taksitleri',
  'installment-detail': 'Taksit Detayı',
  'km-packages': 'KM Paketleri',
  'internal-fleet-assignments': 'Zimmet Panosu',
  'vehicle-km-readings': 'Kilometre Bildirimi',
  penalties: 'Cezalar',
  'penalty-detail': 'Ceza Detayı',
  'service-manifests': 'UETDS Manifestoları',
  'service-manifest-detail': 'Manifesto Detayı',
  'kabis-notifications': 'KABİS Bildirimleri',
  'kabis-notification-detail': 'Bildirim Detayı',
  maintenance: 'Bakım Takibi',
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const routeName = route.name as string | undefined
  if (!routeName || routeName === 'dashboard') {
    return [{ label: 'Dashboard' }]
  }

  const items: BreadcrumbItem[] = []
  const label = terminologyOverrides.value[routeName] ?? breadcrumbLabels[routeName] ?? routeName

  const sectionMap: Record<string, { label: string; to: string }> = {
    'vehicle-create': { label: 'Araçlar', to: '/vehicles' },
    'vehicle-edit': { label: 'Araçlar', to: '/vehicles' },
    'vehicle-detail': { label: 'Araçlar', to: '/vehicles' },
    'customer-create': { label: terms.value.customerPlural, to: '/customers' },
    'customer-edit': { label: terms.value.customerPlural, to: '/customers' },
    'customer-detail': { label: terms.value.customerPlural, to: '/customers' },
    'rental-create': { label: terms.value.rentalPlural, to: '/rentals' },
    'rental-detail': { label: terms.value.rentalPlural, to: '/rentals' },
    'receivable-detail': { label: 'Alacak / Verecek', to: '/accounting/receivables' },
    'payable-detail': { label: 'Alacak / Verecek', to: '/accounting/payables' },
    'claim-detail': { label: 'Sigorta Başvuruları', to: '/accounting/insurance-claims' },
    'provider-detail': { label: 'Servis Sağlayıcılar', to: '/accounting/service-providers' },
    'installment-detail': { label: 'Alacak / Verecek', to: '/installments/dashboard' },
    'installments-dashboard': { label: 'Alacak / Verecek', to: '/accounting/receivables' },
    'penalty-detail': { label: 'Cezalar', to: '/penalties' },
    'service-manifest-detail': { label: 'UETDS Manifestoları', to: '/service-manifests' },
    'kabis-notification-detail': { label: 'KABİS Bildirimleri', to: '/kabis/notifications' },
  }

  const parent = sectionMap[routeName]
  if (parent) {
    items.push({ label: parent.label, to: parent.to })
  } else if (
    routeName.startsWith('receivable') ||
    routeName.startsWith('payable') ||
    routeName.startsWith('claim') ||
    routeName.startsWith('provider') ||
    routeName === 'finance' ||
    routeName === 'receivables' ||
    routeName === 'payables' ||
    routeName === 'installments-dashboard' ||
    routeName.startsWith('installment') ||
    routeName === 'insurance-claims' ||
    routeName === 'service-providers'
  ) {
    items.push({ label: 'Finans' })
  }

  items.push({ label })
  return items
})
</script>

<template>
  <nav class="rc-head__crumb" aria-label="Breadcrumb">
    <template v-for="(item, index) in breadcrumbs" :key="index">
      <span v-if="index > 0" class="rc-head__crumb-sep">/</span>
      <RouterLink v-if="item.to && index < breadcrumbs.length - 1" :to="item.to">
        {{ item.label }}
      </RouterLink>
      <b v-else>{{ item.label }}</b>
    </template>
  </nav>
</template>
