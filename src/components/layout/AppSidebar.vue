<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

defineProps<{
  collapsed: boolean
}>()

const route = useRoute()

interface NavItem {
  name: string
  label: string
  icon: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { name: 'dashboard', label: 'Dashboard', icon: '📊' },
  { name: 'vehicles', label: 'Araçlar', icon: '🚗' },
  { name: 'customers', label: 'Müşteriler', icon: '👥' },
  { name: 'rentals', label: 'Kiralamalar', icon: '📋' },
  { name: 'branches', label: 'Şubeler', icon: '🏢' },
  { name: 'payments', label: 'Ödemeler', icon: '💳' },
  { name: 'users', label: 'Kullanıcılar', icon: '👤' },
  { name: 'settings', label: 'Ayarlar', icon: '⚙️' }
]

const isActive = (name: string) => computed(() => {
  return route.name === name || route.path.startsWith(`/${name}`)
})
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <RouterLink to="/" class="logo">
        <span class="logo-icon">🦌</span>
        <span v-if="!collapsed" class="logo-text">Reindecar</span>
      </RouterLink>
    </div>

    <nav class="sidebar-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="nav-item"
        :class="{ active: isActive(item.name).value }"
        :title="collapsed ? item.label : undefined"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
      </RouterLink>
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
  transition: width var(--transition-normal);
  z-index: 50;
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
    transform: translateX(-100%);
  }
  
  .sidebar.mobile-open {
    transform: translateX(0);
  }
}
</style>
