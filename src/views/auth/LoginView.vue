<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores'
import LoginForm from '@/components/auth/LoginForm.vue'
import type { LoginForm as LoginFormType } from '@/types'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

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
  <div class="login-page">
    <div class="login-branding">
      <div class="branding-content">
        <div class="logo">
          <span class="logo-icon">🦌</span>
          <h1>Reindecar</h1>
        </div>
        <p class="tagline">Araç Kiralama Yönetim Paneli</p>
        
        <div class="features">
          <div class="feature">
            <div class="feature-icon">📊</div>
            <div class="feature-text">
              <h3>Dashboard</h3>
              <p>Tüm operasyonlarınızı tek ekrandan yönetin</p>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon">🚗</div>
            <div class="feature-text">
              <h3>Filo Yönetimi</h3>
              <p>Araç durumları, bakım ve KM takibi</p>
            </div>
          </div>
          <div class="feature">
            <div class="feature-icon">📋</div>
            <div class="feature-text">
              <h3>Kiralama Takibi</h3>
              <p>Rezervasyondan iadeye tüm süreç</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="branding-footer">
        © 2026 Reindecar. Tüm hakları saklıdır.
      </div>
    </div>

    <div class="login-form-section">
      <div class="form-container">
        <div class="form-header">
          <h2>Hoş Geldiniz</h2>
          <p>Devam etmek için giriş yapın</p>
        </div>
        
        <LoginForm 
          :loading="authStore.loading"
          :error="authStore.error"
          @submit="handleLogin"
        />

        <div class="form-footer">
          <p>Şifrenizi mi unuttunuz? <a href="#">Yardım alın</a></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
}

.login-branding {
  flex: 1;
  background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px;
}

.branding-content {
  max-width: 520px;
  margin: 0 auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.logo-icon {
  font-size: 48px;
}

.logo h1 {
  font-size: 42px;
  font-weight: 700;
  margin: 0;
}

.tagline {
  font-size: 20px;
  opacity: 0.85;
  margin: 0 0 48px 0;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.feature-icon {
  font-size: 28px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  flex-shrink: 0;
}

.feature-text h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.feature-text p {
  font-size: 15px;
  opacity: 0.8;
  margin: 0;
  line-height: 1.5;
}

.branding-footer {
  position: absolute;
  bottom: 32px;
  left: 60px;
  font-size: 14px;
  opacity: 0.5;
}

.login-form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: var(--color-bg);
}

.form-container {
  width: 100%;
  max-width: 400px;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 8px 0;
}

.form-header p {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: 16px;
}

.form-footer {
  margin-top: 32px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.form-footer a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.form-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 1024px) {
  .login-branding {
    display: none;
  }
  
  .login-form-section {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }
  
  .form-container {
    background: var(--color-surface);
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  }
}
</style>
