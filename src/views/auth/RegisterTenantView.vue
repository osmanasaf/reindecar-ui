<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { RcButton, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'

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
  phone: '',
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
  form.value.confirmPassword.length > 0,
)

const passwordChecks = computed(() => [
  { label: 'En az 8 karakter', valid: form.value.password.length >= 8 },
  { label: 'En az bir büyük harf', valid: /[A-Z]/.test(form.value.password) },
  { label: 'En az bir rakam', valid: /\d/.test(form.value.password) },
  { label: 'Şifre tekrarı eşleşiyor', valid: !!form.value.confirmPassword && form.value.password === form.value.confirmPassword },
])

const completedRequiredFields = computed(() => {
  const checks = [
    form.value.companyName.trim().length >= 2,
    /^[a-zA-Z0-9_]{3,50}$/.test(form.value.username.trim()),
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim()),
    form.value.firstName.trim().length >= 2,
    form.value.lastName.trim().length >= 2,
    passwordChecks.value.every(check => check.valid),
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
    phone: form.value.phone.trim() || undefined,
  })

  if (success) {
    await router.push({ name: 'dashboard' })
  }
}
</script>

<template>
  <div class="rc-auth-register">
    <section class="rc-auth-register__card">
      <div class="rc-auth-register__header">
        <RouterLink :to="{ name: 'login' }" class="rc-auth-register__back">
          <RcIcon name="chevronLeft" :size="16" />
          Girişe dön
        </RouterLink>
        <h1>Firma Kaydı</h1>
        <p>Firmanızı oluşturun, ilk yönetici hesabınızla hemen giriş yapın.</p>
      </div>

      <form class="rc-auth-register__form" @submit.prevent="handleSubmit">
        <div v-if="error || authStore.error" class="rc-alert rc-alert--danger" role="alert">
          {{ error || authStore.error }}
        </div>

        <div class="rc-auth-register__progress">
          <div class="rc-auth-register__progress-head">
            <span>Kayıt ilerlemesi</span>
            <strong>{{ completedRequiredFields }}/6</strong>
          </div>
          <div class="rc-auth-register__progress-bar" aria-hidden="true">
            <span :style="{ width: `${(completedRequiredFields / 6) * 100}%` }" />
          </div>
        </div>

        <section class="rc-auth-register__section">
          <div class="rc-auth-register__section-title">
            <span class="rc-auth-register__section-num">1</span>
            <div>
              <h2>Firma bilgisi</h2>
              <p>Tenant kodu firma adından otomatik üretilir.</p>
            </div>
          </div>

          <div class="rc-auth-register__grid rc-auth-register__grid--single">
            <label
              class="rc-field"
              :class="{ 'rc-field--error': fieldError('companyName') }"
            >
              <span class="rc-field__label">Firma adı *</span>
              <RcInput
                id="companyName"
                v-model="form.companyName"
                autocomplete="organization"
                placeholder="Örn. Altek Filo"
                @update:model-value="touch('companyName')"
                @blur="touch('companyName')"
              />
              <span v-if="fieldError('companyName')" class="rc-field__error">{{ fieldError('companyName') }}</span>
            </label>
          </div>
        </section>

        <section class="rc-auth-register__section">
          <div class="rc-auth-register__section-title">
            <span class="rc-auth-register__section-num">2</span>
            <div>
              <h2>İlk yönetici</h2>
              <p>Bu kişi tenant'ın ilk admin kullanıcısı olacak.</p>
            </div>
          </div>

          <div class="rc-auth-register__grid">
            <label
              class="rc-field"
              :class="{ 'rc-field--error': fieldError('firstName') }"
            >
              <span class="rc-field__label">Ad *</span>
              <RcInput
                id="firstName"
                v-model="form.firstName"
                autocomplete="given-name"
                placeholder="Ad"
                @update:model-value="touch('firstName')"
                @blur="touch('firstName')"
              />
              <span v-if="fieldError('firstName')" class="rc-field__error">{{ fieldError('firstName') }}</span>
            </label>

            <label
              class="rc-field"
              :class="{ 'rc-field--error': fieldError('lastName') }"
            >
              <span class="rc-field__label">Soyad *</span>
              <RcInput
                id="lastName"
                v-model="form.lastName"
                autocomplete="family-name"
                placeholder="Soyad"
                @update:model-value="touch('lastName')"
                @blur="touch('lastName')"
              />
              <span v-if="fieldError('lastName')" class="rc-field__error">{{ fieldError('lastName') }}</span>
            </label>

            <label
              class="rc-field"
              :class="{ 'rc-field--error': fieldError('username') }"
            >
              <span class="rc-field__label">Kullanıcı adı *</span>
              <RcInput
                id="username"
                v-model="form.username"
                autocomplete="username"
                placeholder="ornek_admin"
                @update:model-value="touch('username')"
                @blur="touch('username')"
              />
              <span v-if="!fieldError('username')" class="rc-field__hint">Giriş yaparken bu kullanıcı adını kullanacaksınız.</span>
              <span v-if="fieldError('username')" class="rc-field__error">{{ fieldError('username') }}</span>
            </label>

            <label
              class="rc-field"
              :class="{ 'rc-field--error': fieldError('email') }"
            >
              <span class="rc-field__label">E-posta *</span>
              <RcInput
                id="email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="admin@firma.com"
                @update:model-value="touch('email')"
                @blur="touch('email')"
              />
              <span v-if="fieldError('email')" class="rc-field__error">{{ fieldError('email') }}</span>
            </label>

            <label
              class="rc-field rc-field--full"
              :class="{ 'rc-field--error': fieldError('phone') }"
            >
              <span class="rc-field__label">Telefon (opsiyonel)</span>
              <RcInput
                id="phone"
                v-model="form.phone"
                type="tel"
                autocomplete="tel"
                placeholder="5XX XXX XX XX"
                @update:model-value="touch('phone')"
                @blur="touch('phone')"
              />
              <span v-if="fieldError('phone')" class="rc-field__error">{{ fieldError('phone') }}</span>
            </label>
          </div>
        </section>

        <section class="rc-auth-register__section">
          <div class="rc-auth-register__section-title">
            <span class="rc-auth-register__section-num">3</span>
            <div>
              <h2>Güvenlik</h2>
              <p>Şifre şartları yazarken canlı kontrol edilir.</p>
            </div>
          </div>

          <div class="rc-auth-register__grid">
            <label
              class="rc-field"
              :class="{ 'rc-field--error': fieldError('password') }"
            >
              <span class="rc-field__label">Şifre *</span>
              <RcInput
                id="password"
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                @update:model-value="touch('password')"
                @blur="touch('password')"
              />
              <span v-if="fieldError('password')" class="rc-field__error">{{ fieldError('password') }}</span>
            </label>

            <label
              class="rc-field"
              :class="{ 'rc-field--error': fieldError('confirmPassword') }"
            >
              <span class="rc-field__label">Şifre tekrar *</span>
              <RcInput
                id="confirmPassword"
                v-model="form.confirmPassword"
                type="password"
                autocomplete="new-password"
                @update:model-value="touch('confirmPassword')"
                @blur="touch('confirmPassword')"
              />
              <span v-if="fieldError('confirmPassword')" class="rc-field__error">{{ fieldError('confirmPassword') }}</span>
            </label>

            <div class="rc-auth-register__password-hints" aria-live="polite">
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

        <RcButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="authStore.loading"
        >
          Firmayı oluştur
        </RcButton>
      </form>
    </section>
  </div>
</template>

<style scoped>
:deep(.rc-btn) {
  width: 100%;
}
</style>
