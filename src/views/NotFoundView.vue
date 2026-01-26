<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="not-found">
    <h1>404</h1>
    <p>Sayfa bulunamadı</p>
    <button @click="goHome">Ana Sayfaya Dön</button>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

h1 {
  font-size: 6rem;
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
}

p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

button {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  transition: background var(--transition-fast);
}

button:hover {
  background: var(--color-primary-hover);
}
</style>
