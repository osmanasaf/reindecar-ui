<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores'

defineProps<{
  collapsed: boolean
  mobileOpen: boolean
}>()

const route = useRoute()
const authStore = useAuthStore()

interface NavItem {
  name: string
  label: string
  icon: string
  adminOnly?: boolean
  children?: NavItem[]
}

const allNavItems: NavItem[] = [
  { name: 'dashboard', label: 'Dashboard', icon: '📊' },
  { name: 'vehicles', label: 'Araçlar', icon: '🚗' },
  { name: 'customers', label: 'Müşteriler', icon: '👥' },
  { name: 'rentals', label: 'Kiralamalar', icon: '📋' },
  { 
    name: 'accounting',
    label: 'Finans', 
    icon: '💰',
    children: [
      { name: 'receivables', label: 'Alacaklar', icon: '📥' },
      { name: 'payables', label: 'Verecekler', icon: '📤' },
      { name: 'insurance-claims', label: 'Sigorta Başvuruları', icon: '🛡️' },
      { name: 'service-providers', label: 'Servis Sağlayıcılar', icon: '🔧' }
    ]
  },
  { name: 'installments-dashboard', label: 'Taksit Yönetimi', icon: '💳' },
  { name: 'branches', label: 'Şubeler', icon: '🏢', adminOnly: true },
  { name: 'users', label: 'Kullanıcılar', icon: '👤', adminOnly: true },
  { name: 'settings', label: 'Ayarlar', icon: '⚙️' }
]

const navItems = computed(() => {
  if (authStore.isAdmin) return allNavItems
  return allNavItems.filter(item => !item.adminOnly)
})

const expandedMenus = ref<Set<string>>(new Set())

const isActive = (name: string) => computed(() => {
  if (name === 'accounting') {
    return route.path.startsWith('/accounting')
  }
  return route.name === name || route.path.startsWith(`/${name}`)
})

const isExpanded = (name: string) => {
  return expandedMenus.value.has(name) || isActive(name).value
}

const toggleMenu = (name: string) => {
  if (expandedMenus.value.has(name)) {
    expandedMenus.value.delete(name)
  } else {
    expandedMenus.value.add(name)
  }
}


watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/accounting')) {
    expandedMenus.value.add('accounting')
  }
}, { immediate: true })
</script>

<template>
  <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <div class="sidebar-header">
      <RouterLink to="/" class="logo">
        <span class="logo-icon">🦌</span>
        <span v-if="!collapsed" class="logo-text">Reindecar</span>
      </RouterLink>
    </div>

    <nav class="sidebar-nav">
      <template v-for="item in navItems" :key="item.name">

        <div v-if="item.children" class="nav-group">
          <div 
            class="nav-item nav-parent" 
            :class="{ active: isActive(item.name).value, expanded: isExpanded(item.name) }"
            @click="toggleMenu(item.name)"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
            <span v-if="!collapsed" class="nav-arrow">{{ isExpanded(item.name) ? '▼' : '▶' }}</span>
          </div>
          <div v-if="!collapsed && isExpanded(item.name)" class="nav-children">
            <RouterLink
              v-for="child in item.children"
              :key="child.name"
              :to="{ name: child.name }"
              class="nav-item nav-child"
              :class="{ active: isActive(child.name).value }"
            >
              <span class="nav-icon">{{ child.icon }}</span>
              <span class="nav-label">{{ child.label }}</span>
            </RouterLink>
          </div>
        </div>


        <RouterLink
          v-else
          :to="{ name: item.name }"
          class="nav-item"
          :class="{ active: isActive(item.name).value }"
          :title="collapsed ? item.label : undefined"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <div class="sidebar-footer">
      <div class="version" v-if="!collapsed">v1.0.0</div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal), transform var(--transition-normal);
  z-index: var(--sidebar-overlay-z);
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  text-decoration: none;
  color: var(--color-text);
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-primary);
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-md);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-xs);
}

.nav-item:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

.nav-icon {
  font-size: 1.25rem;
  width: 24px;
  text-align: center;
}

.nav-label {
  white-space: nowrap;
}

.nav-group {
  margin-bottom: var(--spacing-xs);
}

.nav-parent {
  cursor: pointer;
  font-weight: 500;
  justify-content: flex-start;
}

.nav-arrow {
  margin-left: auto;
  font-size: 10px;
  color: var(--color-text-muted);
  transition: transform 0.2s;
}

.nav-parent.expanded .nav-arrow {
  color: var(--color-primary);
}

.nav-children {
  margin-left: calc(24px + var(--spacing-md));
  margin-top: var(--spacing-xs);
}

.nav-child {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 0.875rem;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: var(--spacing-md);
}

.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.version {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-align: center;
}

@media (max-width: 768px) {
  .sidebar {
    width: min(85vw, 320px);
    transform: translateX(-100%);
  }
  
  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar.collapsed {
    width: min(85vw, 320px);
  }
}
</style>
