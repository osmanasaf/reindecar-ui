import type { IconName } from '@/components/icons'
import type { FeatureKey } from '@/types/feature'
import type { Terminology } from '@/composables/useTerminology'

export interface NavItem {
  name: string
  label: string
  labelKey?: keyof Terminology
  icon: IconName
  adminOnly?: boolean
  superAdminOnly?: boolean
  featureKey?: FeatureKey
  children?: NavItem[]
}

export interface NavSection {
  section?: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    items: [
      { name: 'dashboard', label: 'Dashboard', icon: 'chart' },
      {
        name: 'internal-fleet-assignments',
        label: 'Zimmet Panosu',
        icon: 'tableGrid',
        featureKey: 'INTERNAL_FLEET_MODE',
      },
      { name: 'rentals', label: 'Kiralamalar', labelKey: 'rentalPlural', icon: 'key' },
      { name: 'vehicles', label: 'Araçlar', icon: 'car' },
      { name: 'customers', label: 'Müşteriler', labelKey: 'customerPlural', icon: 'users' },
    ],
  },
  {
    section: 'Operasyon',
    items: [
      { name: 'service-manifests', label: 'UETDS Manifestoları', icon: 'globe', featureKey: 'UETDS_MANIFESTS' },
      { name: 'kabis-notifications', label: 'KABİS Bildirimleri', icon: 'shield', featureKey: 'KABIS_NOTIFICATIONS' },
      { name: 'maintenance', label: 'Bakım Takibi', icon: 'wrench', featureKey: 'MAINTENANCE_REMINDERS' },
      { name: 'vehicle-km-readings', label: 'Kilometre Bildirimi', icon: 'bolt', featureKey: 'PERIODIC_KM_REPORTING' },
    ],
  },
  {
    section: 'Finans',
    items: [
      { name: 'finance', label: 'Alacak / Verecek', icon: 'receipt' },
      { name: 'insurance-claims', label: 'Sigorta Başvuruları', icon: 'shield' },
      { name: 'service-providers', label: 'Servis Sağlayıcılar', icon: 'wrench' },
      { name: 'penalties', label: 'Cezalar', icon: 'warning' },
      { name: 'km-packages', label: 'KM Paketleri', icon: 'bolt', featureKey: 'KM_PACKAGES' },
      {
        name: 'pricing-agreements',
        label: 'Fiyat Anlaşmaları',
        icon: 'cash',
        children: [
          { name: 'campaigns', label: 'Sezonluk Kampanyalar', icon: 'bolt', featureKey: 'PRICING_CAMPAIGNS' },
          {
            name: 'customer-contracts',
            label: 'Kurumsal Fiyat Anlaşmaları',
            icon: 'folder',
            featureKey: 'CUSTOMER_PRICING_AGREEMENTS',
          },
          { name: 'rental-pricing', label: 'Araç/Müşteri Fiyat Kuralları', icon: 'cash', featureKey: 'RENTAL_PRICING' },
        ],
      },
    ],
  },
  {
    section: 'Sistem',
    items: [
      { name: 'branches', label: 'Şubeler', labelKey: 'branchPlural', icon: 'building', adminOnly: true },
      { name: 'users', label: 'Kullanıcılar', icon: 'user', adminOnly: true },
      { name: 'user-invitations', label: 'Davetler', icon: 'mail', adminOnly: true },
      { name: 'settings', label: 'Ayarlar', icon: 'settings' },
    ],
  },
  {
    section: 'Süper Yönetici',
    items: [
      { name: 'admin-tenants', label: 'Firmalar', icon: 'building', superAdminOnly: true },
    ],
  },
]

const ACCOUNTING_ROUTES = new Set([
  'receivables',
  'receivable-detail',
  'payables',
  'payable-detail',
  'insurance-claims',
  'claim-detail',
  'service-providers',
  'provider-detail',
])

export function isNavItemActive(routeName: string | undefined, path: string, itemName: string): boolean {
  if (!routeName) return false

  if (itemName === 'rentals') {
    return routeName === 'rentals'
      || routeName === 'rental-detail'
      || routeName === 'rental-create'
      || path.startsWith('/rentals')
  }

  if (itemName === 'vehicles') {
    if (routeName === 'vehicle-km-readings') return false
    return routeName === 'vehicles'
      || routeName === 'vehicle-detail'
      || routeName === 'vehicle-create'
      || routeName === 'vehicle-edit'
      || path.startsWith('/vehicles')
  }

  if (itemName === 'customers') {
    return routeName === 'customers'
      || routeName === 'customer-detail'
      || routeName === 'customer-create'
      || routeName === 'customer-edit'
      || path.startsWith('/customers')
  }

  if (ACCOUNTING_ROUTES.has(itemName) || ACCOUNTING_ROUTES.has(routeName)) {
    if (itemName === 'finance') {
      return routeName === 'finance'
        || routeName === 'receivables'
        || routeName === 'receivable-detail'
        || routeName === 'payables'
        || routeName === 'payable-detail'
        || routeName === 'installments-dashboard'
        || routeName === 'installment-detail'
        || path.startsWith('/installments')
    }
    if (itemName === 'insurance-claims') {
      return routeName === 'insurance-claims' || routeName === 'claim-detail'
    }
    if (itemName === 'service-providers') {
      return routeName === 'service-providers' || routeName === 'provider-detail'
    }
  }

  if (itemName === 'dashboard') {
    return routeName === 'dashboard' && path === '/'
  }

  if (itemName === 'penalties') {
    return routeName === 'penalties' || routeName === 'penalty-detail' || path.startsWith('/penalties')
  }

  if (itemName === 'km-packages') {
    return routeName === 'km-packages' || path.startsWith('/km-packages')
  }

  if (itemName === 'customer-contracts') {
    return routeName === 'customer-contracts' || path.startsWith('/customer-contracts')
  }

  if (itemName === 'campaigns') {
    return routeName === 'campaigns' || path.startsWith('/campaigns')
  }

  if (itemName === 'rental-pricing') {
    return routeName === 'rental-pricing' || path.startsWith('/rental-pricing')
  }

  if (itemName === 'service-manifests') {
    return routeName === 'service-manifests'
      || routeName === 'service-manifest-detail'
      || path.startsWith('/service-manifests')
  }

  if (itemName === 'kabis-notifications') {
    return routeName === 'kabis-notifications'
      || routeName === 'kabis-notification-detail'
      || path.startsWith('/kabis/notifications')
  }

  if (itemName === 'maintenance') {
    return routeName === 'maintenance' || path.startsWith('/maintenance')
  }

  if (itemName === 'internal-fleet-assignments') {
    return routeName === 'internal-fleet-assignments' || path.startsWith('/internal-fleet')
  }

  if (itemName === 'vehicle-km-readings') {
    return routeName === 'vehicle-km-readings' || path.startsWith('/vehicles/km-readings')
  }

  if (itemName === 'settings') {
    return routeName === 'settings' || path.startsWith('/settings')
  }

  if (itemName === 'admin-tenants') {
    return routeName === 'admin-tenants' || routeName === 'admin-tenant-detail' || path.startsWith('/admin/tenants')
  }

  return routeName === itemName
}

export function userInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function roleLabel(role: string | undefined): string {
  if (role === 'SUPER_ADMIN') return 'Süper Yönetici'
  if (role === 'ADMIN') return 'Yönetici'
  if (role === 'OPERATOR') return 'Operatör'
  if (role === 'USER') return 'Kullanıcı'
  return role ?? ''
}
