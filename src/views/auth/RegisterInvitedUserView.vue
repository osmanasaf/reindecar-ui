<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { publicUserInvitationsApi } from '@/api'
import { useAuthStore } from '@/stores'
import { RcButton, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
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
  lastName: '',
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
  form.value.confirmPassword.length > 0,
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
    lastName: form.value.lastName.trim(),
  })

  if (success) {
    await router.push({ name: 'dashboard' })
  } else {
    submitError.value = authStore.error || 'Davet kaydı tamamlanamadı.'
  }
}
</script>

<template>
  <div class="rc-auth-register">
    <section class="rc-auth-register__card rc-auth-register__card--sm">
      <div class="rc-auth-register__header">
        <RouterLink :to="{ name: 'login' }" class="rc-auth-register__back">
          <RcIcon name="chevronLeft" :size="16" />
          Girişe dön
        </RouterLink>
        <h1>Davet ile Kayıt</h1>
        <p>Hesabınızı oluşturup firmanıza katılın.</p>
      </div>

      <div v-if="loadingPreview" class="rc-auth-register__state">
        <span class="rc-spin" aria-hidden="true" />
        Davet kontrol ediliyor…
      </div>

      <div v-else-if="previewError" class="rc-alert rc-alert--danger" role="alert">
        {{ previewError }}
      </div>

      <form v-else class="rc-auth-register__form" @submit.prevent="handleSubmit">
        <div v-if="preview" class="rc-auth-register__invite">
          <strong>{{ preview.tenantName }}</strong>
          <span>{{ preview.email }} · {{ preview.role === 'ADMIN' ? 'Tenant admin' : 'Operatör' }}</span>
        </div>

        <div v-if="submitError" class="rc-alert rc-alert--danger" role="alert">
          {{ submitError }}
        </div>

        <label
          class="rc-field"
          :class="{ 'rc-field--error': fieldError('username') }"
        >
          <span class="rc-field__label">Kullanıcı adı</span>
          <RcInput
            id="username"
            v-model="form.username"
            autocomplete="username"
            @update:model-value="touch('username')"
            @blur="touch('username')"
          />
          <span v-if="fieldError('username')" class="rc-field__error">{{ fieldError('username') }}</span>
        </label>

        <div class="rc-auth-register__grid">
          <label
            class="rc-field"
            :class="{ 'rc-field--error': fieldError('firstName') }"
          >
            <span class="rc-field__label">Ad</span>
            <RcInput
              id="firstName"
              v-model="form.firstName"
              autocomplete="given-name"
              @update:model-value="touch('firstName')"
              @blur="touch('firstName')"
            />
            <span v-if="fieldError('firstName')" class="rc-field__error">{{ fieldError('firstName') }}</span>
          </label>

          <label
            class="rc-field"
            :class="{ 'rc-field--error': fieldError('lastName') }"
          >
            <span class="rc-field__label">Soyad</span>
            <RcInput
              id="lastName"
              v-model="form.lastName"
              autocomplete="family-name"
              @update:model-value="touch('lastName')"
              @blur="touch('lastName')"
            />
            <span v-if="fieldError('lastName')" class="rc-field__error">{{ fieldError('lastName') }}</span>
          </label>
        </div>

        <label
          class="rc-field"
          :class="{ 'rc-field--error': fieldError('password') }"
        >
          <span class="rc-field__label">Şifre</span>
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
          <span class="rc-field__label">Şifre tekrar</span>
          <RcInput
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            @update:model-value="touch('confirmPassword')"
            @blur="touch('confirmPassword')"
          />
          <span class="rc-field__hint">En az 8 karakter, bir büyük harf ve bir rakam içermelidir.</span>
          <span v-if="fieldError('confirmPassword')" class="rc-field__error">{{ fieldError('confirmPassword') }}</span>
        </label>

        <RcButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="authStore.loading"
        >
          Kaydı tamamla
        </RcButton>
      </form>
    </section>
  </div>
</template>

<style scoped>
.rc-auth-register__state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

:deep(.rc-btn) {
  width: 100%;
}
</style>
