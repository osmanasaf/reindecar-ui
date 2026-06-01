<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores'
import { RcMark } from '@/components/rc'
import LoginForm from '@/components/auth/LoginForm.vue'
import type { LoginForm as LoginFormType } from '@/types'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const stats = [
  { value: '60sn', label: 'Yeni kiralama' },
  { value: '190', label: 'Araç filosu' },
  { value: '%99.8', label: 'Uptime' },
]

onMounted(() => {
  if (authStore.isAuthenticated) {
    redirectAfterLogin()
  }
})

async function handleLogin(credentials: LoginFormType) {
  const success = await authStore.login(credentials)
  if (success) {
    redirectAfterLogin()
  }
}

function redirectAfterLogin() {
  const redirect = route.query.redirect as string
  router.push(redirect || { name: 'dashboard' })
}
</script>

<template>
  <div class="rc-auth">
    <div class="rc-auth__panel">
      <div class="rc-auth__brand">
        <RcMark />
      </div>

      <div class="rc-auth__hero">
        <div>
          <h1>Hoş geldin.</h1>
          <p style="margin-top: 8px">
            Filonu, kiralamalarını ve tahsilatlarını tek panelden yönet.
          </p>
        </div>

        <LoginForm
          :loading="authStore.loading"
          :error="authStore.error"
          @submit="handleLogin"
        />

        <div class="rc-auth__links">
          <p>
            Hesabınız yok mu?
            <RouterLink :to="{ name: 'register-tenant' }">Firma kaydı oluşturun</RouterLink>
          </p>
        </div>
      </div>

      <div class="rc-auth__footer">
        <span>© 2026 Reindecar</span>
        <span class="rc-auth__footer-links">
          <a href="#">Gizlilik</a>
          <a href="#">Kullanım koşulları</a>
          <a href="#">Destek</a>
        </span>
      </div>
    </div>

    <div class="rc-auth__visual">
      <div class="rc-auth__visual-bg" />
      <div class="rc-auth__visual-inner">
        <div class="rc-auth__visual-badge">
          <span class="rc-dot rc-dot--accent" />
          Yenilik · v2.0
        </div>
        <h2>Filonu daha az tıklayarak yönet.</h2>
        <p class="rc-auth__visual-desc">
          Reindecar v2 ile yeni bir kiralama 60 saniyede oluşur. Klavye kısayolları,
          akıllı arama ve tek-tıkla iade. Şube operatörleri için yeniden tasarlandı.
        </p>
        <div class="rc-auth__stats">
          <div v-for="(stat, i) in stats" :key="i">
            <div class="rc-auth__stat-value rc-num">{{ stat.value }}</div>
            <div class="rc-auth__stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
