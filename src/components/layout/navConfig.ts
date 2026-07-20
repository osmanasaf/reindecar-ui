import type { IconName } from '@/components/icons'
import type { FeatureKey } from '@/types/feature'

export interface NavItem {
  name: string
  label: string
  icon: IconName
  adminOnly?: boolean
  superAdminOnly?: boolean
  featureKey?: FeatureKey
}

export interface NavSection {
  section?: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    items: [
      { name: 'dashboard', label: 'Dashboard', icon: 'chart' },
      { name: 'rentals', label: 'Kiralamalar', icon: 'key' },
      { name: 'vehicles', label: 'Araçlar', icon: 'car' },
      { name: 'customers', label: 'Müşteriler', icon: 'users' },
    ],
  },
  {
    section: 'Operasyon',
    items: [
      { name: 'service-manifests', label: 'UETDS Manifestoları', icon: 'globe', featureKey: 'UETDS_MANIFESTS' },
      { name: 'kabis-notifications', label: 'KABİS Bildirimleri', icon: 'shield', featureKey: 'KABIS_NOTIFICATIONS' },
    ],
  },
  {
    section: 'Finans',
    items: [
      { name: 'finance', label: 'Alacak / Verecek', icon: 'receipt' },
      { name: 'insurance-claims', label: 'Sigorta Başvuruları', icon: 'shield' },
      { name: 'service-providers', label: 'Servis Sağlayıcılar', icon: 'wrench' },
      { name: 'penalties', label: 'Cezalar', icon: 'warning' },
      { name: 'km-packages', label: 'KM Paketleri', icon: 'bolt' },
      { name: 'customer-contracts', label: 'Özel Fiyat Sözleşmeleri', icon: 'folder' },
      { name: 'campaigns', label: 'Kampanyalar', icon: 'bolt' },
      { name: 'rental-pricing', label: 'Araç/Müşteri Fiyat Kuralları', icon: 'cash' },
    ],
  },
  {
    section: 'Sistem',
    items: [
      { name: 'branches', label: 'Şubeler', icon: 'building', adminOnly: true },
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
