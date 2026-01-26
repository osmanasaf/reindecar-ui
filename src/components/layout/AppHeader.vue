<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import AppBreadcrumb from './AppBreadcrumb.vue'

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const authStore = useAuthStore()
const router = useRouter()
const userMenuOpen = ref(false)

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

function closeUserMenu() {
  userMenuOpen.value = false
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <button class="menu-toggle" @click="emit('toggle-sidebar')">
        ☰
      </button>
      <AppBreadcrumb />
    </div>

    <div class="header-right">
      <div class="user-menu" @click="toggleUserMenu" v-click-outside="closeUserMenu">
        <div class="user-avatar">
          {{ authStore.userFullName?.charAt(0) || 'U' }}
        </div>
        <span class="user-name">{{ authStore.userFullName || 'Kullanıcı' }}</span>
        <span class="dropdown-arrow">▼</span>

        <div v-if="userMenuOpen" class="dropdown-menu">
          <RouterLink to="/settings" class="dropdown-item" @click="closeUserMenu">
            ⚙️ Ayarlar
          </RouterLink>
          <button class="dropdown-item" @click="handleLogout">
            🚪 Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  position: sticky;
  top: 0;
  z-index: 40;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.menu-toggle {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.menu-toggle:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.user-menu:hover {
  background: var(--color-bg-secondary);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.user-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
}

.dropdown-arrow {
  font-size: 0.625rem;
  color: var(--color-text-muted);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-xs);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 160px;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-md);
  background: none;
  border: none;
  text-align: left;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-decoration: none;
  transition: background var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--color-bg-secondary);
}

@media (max-width: 768px) {
  .user-name {
    display: none;
  }
}
</style>
