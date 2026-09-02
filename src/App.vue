<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { AppLayout } from '@/components/layout'
import SessionTimeoutWarning from '@/components/base/SessionTimeoutWarning.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'

const route = useRoute()
const router = useRouter()

/**
 * İlk render'da route hâlâ START_LOCATION ve meta boş; requiresAuth !== false
 * true dönüp AppLayout'u authGuard çözülmeden mount ediyordu. O mount üç
 * kimliksiz istek atıp 403 alıyordu. İlk navigasyon onaylanana kadar bekle.
 */
const routerReady = ref(false)
void router.isReady().then(() => {
  routerReady.value = true
})

const showLayout = computed(() => {
  return routerReady.value && route.meta.requiresAuth !== false
})
</script>

<template>
  <ToastContainer />
  <SessionTimeoutWarning v-if="showLayout" />
  <AppLayout v-if="showLayout" />
  <RouterView v-else />
</template>

<style>
#app {
  min-height: 100vh;
}
</style>
