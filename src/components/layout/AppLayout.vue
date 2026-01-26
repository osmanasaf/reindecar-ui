<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const sidebarCollapsed = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <AppSidebar :collapsed="sidebarCollapsed" />
    <div class="main-area">
      <AppHeader @toggle-sidebar="toggleSidebar" />
      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width);
  transition: margin-left var(--transition-normal);
}

.app-layout.sidebar-collapsed .main-area {
  margin-left: var(--sidebar-collapsed-width);
}

.page-content {
  flex: 1;
  padding: var(--spacing-xl);
  background: var(--color-bg);
  overflow-y: auto;
}

@media (max-width: 768px) {
  .main-area {
    margin-left: 0;
  }
}
</style>
