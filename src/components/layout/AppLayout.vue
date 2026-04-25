<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const viewportWidth = ref(globalThis.window === undefined ? 1280 : globalThis.window.innerWidth)

const isMobile = computed(() => viewportWidth.value <= 768)

function syncViewport() {
  viewportWidth.value = window.innerWidth

  if (!isMobile.value) {
    sidebarOpen.value = false
  }
}

function toggleSidebar() {
  if (isMobile.value) {
    sidebarOpen.value = !sidebarOpen.value
    return
  }

  sidebarCollapsed.value = !sidebarCollapsed.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

onMounted(() => {
  syncViewport()
  globalThis.window.addEventListener('resize', syncViewport)
})

onBeforeUnmount(() => {
  globalThis.window.removeEventListener('resize', syncViewport)
})
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <AppSidebar :collapsed="sidebarCollapsed" :mobile-open="isMobile && sidebarOpen" />
    <div
      class="sidebar-backdrop"
      :class="{ visible: isMobile && sidebarOpen }"
      @click="closeSidebar"
    ></div>
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

.sidebar-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .main-area {
    margin-left: 0;
  }

  .page-content {
    padding: var(--spacing-lg);
  }

  .sidebar-backdrop.visible {
    display: block;
    position: fixed;
    inset: 0;
    background: rgb(15 23 42 / 0.4);
    z-index: calc(var(--sidebar-overlay-z) - 1);
  }
}
</style>
