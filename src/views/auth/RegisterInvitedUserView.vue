<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { publicUserInvitationsApi } from '@/api'
import { useAuthStore } from '@/stores'
import type { UserInvitationPreviewResponse } from '@/api/auth.api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const token = ref('')
const loadingPreview = ref(true)
const preview = ref<UserInvitationPreviewResponse | null>(null)
const previewError = ref<string | null>(null)
const submitError = ref<string | null>(null)
const submitted = ref(false)
const touched = ref<Record<string, boolean>>({})

const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: ''
})

const validationErrors = computed(() => {
  const errors: Record<string, string> = {}
  if (!/^[a-zA-Z0-9_]{3,50}$/.test(form.value.username.trim())) {
    errors.username = 'Kullanıcı adı 3-50 karakter olmalı; harf, rakam ve alt çizgi içerebilir.'
  }
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
  return errors
})

const isFormValid = computed(() =>
  Object.keys(validationErrors.value).length === 0 &&
  form.value.confirmPassword.length > 0
)

function fieldError(field: string) {
  return submitted.value || touched.value[field] ? validationErrors.value[field] : ''
}

function touch(field: string) {
  touched.value[field] = true
}

onMounted(loadPreview)

async function loadPreview() {
  token.value = String(route.query.token || '')
  if (!token.value) {
    previewError.value = 'Davet token bulunamadı.'
    loadingPreview.value = false
    return
  }

  try {
    preview.value = await publicUserInvitationsApi.preview(token.value)
  } catch (e) {
    previewError.value = (e as Error).message || 'Davet bilgisi alınamadı.'
  } finally {
    loadingPreview.value = false
  }
}

async function handleSubmit() {
  submitted.value = true
  submitError.value = null

  if (!isFormValid.value) {
    submitError.value = 'Lütfen formdaki hataları düzeltin.'
    return
  }

  const success = await authStore.registerInvitedUser({
    token: token.value,
    username: form.value.username.trim(),
    password: form.value.password,
    firstName: form.value.firstName.trim(),
    lastName: form.value.lastName.trim()
  })

  if (success) {
    await router.push({ name: 'dashboard' })
  } else {
    submitError.value = authStore.error || 'Davet kaydı tamamlanamadı.'
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="auth-card">
      <div class="auth-header">
        <RouterLink :to="{ name: 'login' }" class="back-link">← Girişe dön</RouterLink>
        <h1>Davet ile Kayıt</h1>
        <p>Hesabınızı oluşturup firmanıza katılın.</p>
      </div>

      <div v-if="loadingPreview" class="state-box">Davet kontrol ediliyor...</div>

      <div v-else-if="previewError" class="error-message">
        {{ previewError }}
      </div>

      <form v-else class="auth-form" @submit.prevent="handleSubmit">
        <div v-if="preview" class="invite-summary">
          <strong>{{ preview.tenantName }}</strong>
          <span>{{ preview.email }} · {{ preview.role === 'ADMIN' ? 'Tenant admin' : 'Operatör' }}</span>
        </div>

        <div v-if="submitError" class="error-message">
          {{ submitError }}
        </div>

        <div class="form-group">
          <label for="username">Kullanıcı adı</label>
          <input
            id="username"
            v-model="form.username"
            :class="{ invalid: fieldError('username') }"
            type="text"
            autocomplete="username"
            required
            @input="touch('username')"
            @blur="touch('username')"
          />
          <small v-if="fieldError('username')" class="field-error">{{ fieldError('username') }}</small>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="firstName">Ad</label>
            <input
              id="firstName"
              v-model="form.firstName"
              :class="{ invalid: fieldError('firstName') }"
              type="text"
              autocomplete="given-name"
              required
              @input="touch('firstName')"
              @blur="touch('firstName')"
            />
            <small v-if="fieldError('firstName')" class="field-error">{{ fieldError('firstName') }}</small>
          </div>

          <div class="form-group">
            <label for="lastName">Soyad</label>
            <input
              id="lastName"
              v-model="form.lastName"
              :class="{ invalid: fieldError('lastName') }"
              type="text"
              autocomplete="family-name"
              required
              @input="touch('lastName')"
              @blur="touch('lastName')"
            />
            <small v-if="fieldError('lastName')" class="field-error">{{ fieldError('lastName') }}</small>
          </div>
        </div>

        <div class="form-group">
          <label for="password">Şifre</label>
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
          <label for="confirmPassword">Şifre tekrar</label>
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
          <small>En az 8 karakter, bir büyük harf ve bir rakam içermelidir.</small>
          <small v-if="fieldError('confirmPassword')" class="field-error">{{ fieldError('confirmPassword') }}</small>
        </div>

        <button class="submit-btn" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Kaydediliyor...' : 'Kaydı tamamla' }}
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
  padding: 32px 16px;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
}

.auth-card {
  width: min(560px, 100%);
  background: var(--color-surface);
  border-radius: 18px;
  padding: 32px;
  box-shadow: 0 24px 60px rgb(15 23 42 / 0.25);
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
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
}

.auth-header p {
  margin: 0;
  color: var(--color-text-secondary);
}

.auth-form,
.form-group {
  display: flex;
  flex-direction: column;
}

.auth-form {
  gap: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-group {
  gap: 6px;
}

.form-group label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-group input {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.form-group input.invalid {
  border-color: var(--color-danger);
}

.form-group small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.form-group .field-error {
  color: var(--color-danger);
}

.state-box,
.invite-summary,
.error-message {
  padding: 12px 14px;
  border-radius: var(--radius-md);
}

.state-box,
.invite-summary {
  background: var(--color-bg);
  color: var(--color-text-secondary);
}

.invite-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invite-summary strong {
  color: var(--color-text);
}

.error-message {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.submit-btn {
  padding: 14px 18px;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 560px) {
  .auth-card {
    padding: 24px 18px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
