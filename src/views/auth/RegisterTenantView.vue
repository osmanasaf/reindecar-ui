<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  companyName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phone: ''
})

const error = ref<string | null>(null)
const submitted = ref(false)
const touched = ref<Record<string, boolean>>({})

const validationErrors = computed(() => {
  const errors: Record<string, string> = {}
  if (form.value.companyName.trim().length < 2) errors.companyName = 'Firma adı en az 2 karakter olmalı.'
  if (!/^[a-zA-Z0-9_]{3,50}$/.test(form.value.username.trim())) {
    errors.username = 'Kullanıcı adı 3-50 karakter olmalı; harf, rakam ve alt çizgi içerebilir.'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) errors.email = 'Geçerli bir e-posta adresi girin.'
  if (form.value.firstName.trim().length < 2) errors.firstName = 'Ad en az 2 karakter olmalı.'
  if (form.value.lastName.trim().length < 2) errors.lastName = 'Soyad en az 2 karakter olmalı.'
  if (form.value.password.length < 8) errors.password = 'Şifre en az 8 karakter olmalı.'
  else if (!/[A-Z]/.test(form.value.password)) errors.password = 'Şifre en az bir büyük harf içermeli.'
  else if (!/\d/.test(form.value.password)) errors.password = 'Şifre en az bir rakam içermeli.'
  if (!form.value.confirmPassword) {
    errors.confirmPassword = 'Şifre tekrarı zorunlu.'
  } else if (form.value.password !== form.value.confirmPassword) {
    errors.confirmPassword = 'Şifreler eşleşmiyor.'
  }
  if (form.value.phone.trim() && !/^[0-9+\s()-]{7,20}$/.test(form.value.phone.trim())) {
    errors.phone = 'Telefon formatı geçerli değil.'
  }
  return errors
})

const isFormValid = computed(() =>
  Object.keys(validationErrors.value).length === 0 &&
  form.value.confirmPassword.length > 0
)

const passwordChecks = computed(() => [
  { label: 'En az 8 karakter', valid: form.value.password.length >= 8 },
  { label: 'En az bir büyük harf', valid: /[A-Z]/.test(form.value.password) },
  { label: 'En az bir rakam', valid: /\d/.test(form.value.password) },
  { label: 'Şifre tekrarı eşleşiyor', valid: !!form.value.confirmPassword && form.value.password === form.value.confirmPassword }
])

const completedRequiredFields = computed(() => {
  const checks = [
    form.value.companyName.trim().length >= 2,
    /^[a-zA-Z0-9_]{3,50}$/.test(form.value.username.trim()),
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim()),
    form.value.firstName.trim().length >= 2,
    form.value.lastName.trim().length >= 2,
    passwordChecks.value.every(check => check.valid)
  ]
  return checks.filter(Boolean).length
})

function fieldError(field: string) {
  return submitted.value || touched.value[field] ? validationErrors.value[field] : ''
}

function touch(field: string) {
  touched.value[field] = true
}

async function handleSubmit() {
  submitted.value = true
  error.value = null

  if (!isFormValid.value) {
    error.value = 'Lütfen formdaki hataları düzeltin.'
    return
  }

  const success = await authStore.registerTenant({
    companyName: form.value.companyName.trim(),
    username: form.value.username.trim(),
    email: form.value.email.trim(),
    password: form.value.password,
    firstName: form.value.firstName.trim(),
    lastName: form.value.lastName.trim(),
    phone: form.value.phone.trim() || undefined
  })

  if (success) {
    await router.push({ name: 'dashboard' })
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="auth-card">
      <div class="auth-header">
        <RouterLink :to="{ name: 'login' }" class="back-link">← Girişe dön</RouterLink>
        <h1>Firma Kaydı</h1>
        <p>Firmanızı oluşturun, ilk yönetici hesabınızla hemen giriş yapın.</p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div v-if="error || authStore.error" class="error-message">
          {{ error || authStore.error }}
        </div>

        <div class="progress-card">
          <div class="progress-card__header">
            <span>Kayıt ilerlemesi</span>
            <strong>{{ completedRequiredFields }}/6</strong>
          </div>
          <div class="progress-bar" aria-hidden="true">
            <span :style="{ width: `${(completedRequiredFields / 6) * 100}%` }" />
          </div>
        </div>

        <section class="form-section">
          <div class="section-title">
            <span>1</span>
            <div>
              <h2>Firma bilgisi</h2>
              <p>Tenant kodu firma adından otomatik üretilir.</p>
            </div>
          </div>

          <div class="form-grid single">
            <div class="form-group">
              <label for="companyName">Firma adı <span>*</span></label>
              <input
                id="companyName"
                v-model="form.companyName"
                :class="{ invalid: fieldError('companyName') }"
                type="text"
                autocomplete="organization"
                placeholder="Örn. Altek Filo"
                required
                @input="touch('companyName')"
                @blur="touch('companyName')"
              />
              <small v-if="fieldError('companyName')" class="field-error">{{ fieldError('companyName') }}</small>
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <span>2</span>
            <div>
              <h2>İlk yönetici</h2>
              <p>Bu kişi tenant’ın ilk admin kullanıcısı olacak.</p>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="firstName">Ad <span>*</span></label>
              <input
                id="firstName"
                v-model="form.firstName"
                :class="{ invalid: fieldError('firstName') }"
                type="text"
                autocomplete="given-name"
                placeholder="Ad"
                required
                @input="touch('firstName')"
                @blur="touch('firstName')"
              />
              <small v-if="fieldError('firstName')" class="field-error">{{ fieldError('firstName') }}</small>
            </div>

            <div class="form-group">
              <label for="lastName">Soyad <span>*</span></label>
              <input
                id="lastName"
                v-model="form.lastName"
                :class="{ invalid: fieldError('lastName') }"
                type="text"
                autocomplete="family-name"
                placeholder="Soyad"
                required
                @input="touch('lastName')"
                @blur="touch('lastName')"
              />
              <small v-if="fieldError('lastName')" class="field-error">{{ fieldError('lastName') }}</small>
            </div>

            <div class="form-group">
              <label for="username">Kullanıcı adı <span>*</span></label>
              <input
                id="username"
                v-model="form.username"
                :class="{ invalid: fieldError('username') }"
                type="text"
                autocomplete="username"
                placeholder="ornek_admin"
                required
                @input="touch('username')"
                @blur="touch('username')"
              />
              <small v-if="!fieldError('username')" class="field-hint">Giriş yaparken bu kullanıcı adını kullanacaksınız.</small>
              <small v-if="fieldError('username')" class="field-error">{{ fieldError('username') }}</small>
            </div>

            <div class="form-group">
              <label for="email">E-posta <span>*</span></label>
              <input
                id="email"
                v-model="form.email"
                :class="{ invalid: fieldError('email') }"
                type="email"
                autocomplete="email"
                placeholder="admin@firma.com"
                required
                @input="touch('email')"
                @blur="touch('email')"
              />
              <small v-if="fieldError('email')" class="field-error">{{ fieldError('email') }}</small>
            </div>

            <div class="form-group full">
              <label for="phone">Telefon (opsiyonel)</label>
              <input
                id="phone"
                v-model="form.phone"
                :class="{ invalid: fieldError('phone') }"
                type="tel"
                autocomplete="tel"
                placeholder="5XX XXX XX XX"
                @input="touch('phone')"
                @blur="touch('phone')"
              />
              <small v-if="fieldError('phone')" class="field-error">{{ fieldError('phone') }}</small>
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <span>3</span>
            <div>
              <h2>Güvenlik</h2>
              <p>Şifre şartları yazarken canlı kontrol edilir.</p>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="password">Şifre <span>*</span></label>
              <input
                id="password"
                v-model="form.password"
                :class="{ invalid: fieldError('password') }"
                type="password"
                autocomplete="new-password"
                required
                @input="touch('password')"
                @blur="touch('password')"
              />
              <small v-if="fieldError('password')" class="field-error">{{ fieldError('password') }}</small>
            </div>

            <div class="form-group">
              <label for="confirmPassword">Şifre tekrar <span>*</span></label>
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                :class="{ invalid: fieldError('confirmPassword') }"
                type="password"
                autocomplete="new-password"
                required
                @input="touch('confirmPassword')"
                @blur="touch('confirmPassword')"
              />
              <small v-if="fieldError('confirmPassword')" class="field-error">{{ fieldError('confirmPassword') }}</small>
            </div>

            <div class="password-hints full" aria-live="polite">
              <span
                v-for="check in passwordChecks"
                :key="check.label"
                :class="{ valid: check.valid }"
              >
                <i>{{ check.valid ? '✓' : '•' }}</i>
                {{ check.label }}
              </span>
            </div>
          </div>
        </section>

        <button class="submit-btn" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Kaydediliyor...' : 'Firmayı oluştur' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 40px 16px;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
}

.auth-card {
  width: min(640px, 100%);
  background: var(--color-surface);
  border-radius: 22px;
  padding: 34px;
  box-shadow: 0 24px 60px rgb(15 23 42 / 0.25);
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.back-link {
  display: inline-block;
  margin-bottom: 16px;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
}

.auth-header h1 {
  margin: 0 0 8px;
  color: var(--color-text);
  font-size: 30px;
  letter-spacing: -0.03em;
}

.auth-header p {
  margin: 0;
  color: var(--color-text-secondary);
}

.progress-card {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
}

.progress-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.progress-card__header strong {
  color: var(--color-text);
}

.progress-bar {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-border);
}

.progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
  transition: width var(--transition-normal);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--color-surface) 86%, var(--color-bg));
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid.single {
  grid-template-columns: 1fr;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: 1 / -1;
}

.section-title {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.section-title span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-size-sm);
  font-weight: 800;
  flex-shrink: 0;
}

.section-title h2 {
  margin: 0;
  font-size: 17px;
  color: var(--color-text);
}

.section-title p {
  margin: 2px 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.form-group label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-group label span {
  color: var(--color-danger);
}

.form-group input {
  min-height: 44px;
  padding: 11px 13px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.form-group input.invalid {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 12%, transparent);
}

.form-group small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.form-group .field-hint {
  color: var(--color-text-muted);
}

.form-group .field-error {
  color: var(--color-danger);
}

.password-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: -4px;
  padding: 0 2px;
}

.password-hints span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.3;
}

.password-hints i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--color-border);
  color: var(--color-text-secondary);
  font-style: normal;
  font-size: 9px;
  font-weight: 800;
  flex-shrink: 0;
}

.password-hints span.valid {
  color: var(--color-success);
}

.password-hints span.valid i {
  background: var(--color-success-light);
  color: var(--color-success);
}

.error-message {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.submit-btn {
  min-height: 48px;
  padding: 14px 18px;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast), opacity var(--transition-fast);
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .auth-card {
    padding: 24px 18px;
    border-radius: 18px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-section {
    padding: 16px;
  }

  .password-hints {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
