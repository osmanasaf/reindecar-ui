<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

interface BreadcrumbItem {
  label: string
  to?: string
}

const route = useRoute()

const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  vehicles: 'Araçlar',
  'vehicle-detail': 'Araç Detayı',
  customers: 'Müşteriler',
  'customer-detail': 'Müşteri Detayı',
  rentals: 'Kiralamalar',
  'rental-create': 'Yeni Kiralama',
  'rental-detail': 'Kiralama Detayı',
  branches: 'Şubeler',
  payments: 'Ödemeler',
  users: 'Kullanıcılar',
  settings: 'Ayarlar'
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [
    { label: 'Ana Sayfa', to: '/' }
  ]

  const routeName = route.name as string
  
  if (routeName && routeName !== 'dashboard') {
    const baseName = routeName.split('-')[0]
    
    if (routeName.includes('-')) {
      items.push({
        label: breadcrumbLabels[baseName] || baseName,
        to: `/${baseName}`
      })
    }
    
    items.push({
      label: breadcrumbLabels[routeName] || routeName
    })
  }

  return items
})
</script>

<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      <li 
        v-for="(item, index) in breadcrumbs" 
        :key="index"
        class="breadcrumb-item"
      >
        <RouterLink 
          v-if="item.to && index < breadcrumbs.length - 1" 
          :to="item.to"
          class="breadcrumb-link"
        >
          {{ item.label }}
        </RouterLink>
        <span v-else class="breadcrumb-current">
          {{ item.label }}
        </span>
        <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb {
  font-size: var(--font-size-sm);
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
}

.breadcrumb-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.breadcrumb-link:hover {
  color: var(--color-primary);
}

.breadcrumb-current {
  color: var(--color-text);
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 var(--spacing-sm);
  color: var(--color-text-muted);
}
</style>
