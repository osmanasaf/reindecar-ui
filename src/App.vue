<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import { AppLayout } from '@/components/layout'
import SessionTimeoutWarning from '@/components/base/SessionTimeoutWarning.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'

const route = useRoute()

const showLayout = computed(() => {
  return route.meta.requiresAuth !== false
})
</script>

<template>
  <ToastContainer />
  <SessionTimeoutWarning v-if="showLayout" />
  <AppLayout v-if="showLayout">
    <RouterView />
  </AppLayout>
  <RouterView v-else />
</template>

<style>
#app {
  min-height: 100vh;
}
</style>
