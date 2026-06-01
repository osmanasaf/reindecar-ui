<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useShellHotkeys } from '@/composables/useShellHotkeys'
import { useShellNavCounts } from '@/composables/useShellNavCounts'
import { useShellSearch } from '@/composables/useShellSearch'
import ShellSearchModal from './ShellSearchModal.vue'

const route = useRoute()
const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const viewportWidth = ref(globalThis.window === undefined ? 1280 : globalThis.window.innerWidth)

const isMobile = computed(() => viewportWidth.value <= 768)

const { searchOpen, closeSearch } = useShellSearch()
const { fetchNavCounts } = useShellNavCounts()

useShellHotkeys()

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  fetchNavCounts()
})

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

watch(() => route.path, () => {
  if (isMobile.value) {
    sidebarOpen.value = false
  }
})


onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})
</script>

<template>
  <div
    class="rc-app"
    :class="{ 'rc-app--collapsed': sidebarCollapsed && !isMobile }"
  >
    <AppSidebar
      :collapsed="sidebarCollapsed"
      :mobile-open="isMobile && sidebarOpen"
      :is-mobile="isMobile"
      @toggle-collapse="toggleSidebar"
    />

    <div
      class="rc-side-backdrop"
      :class="{ 'rc-side-backdrop--visible': isMobile && sidebarOpen }"
      @click="closeSidebar"
    />

    <div class="rc-app__main">
      <AppHeader @toggle-sidebar="toggleSidebar" />
      <main class="rc-app__scroll">
        <RouterView />
      </main>
    </div>

    <ShellSearchModal :open="searchOpen" @close="closeSearch" />
  </div>
</template>
