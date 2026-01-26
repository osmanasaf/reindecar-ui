<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useValidation, rules } from '@/composables'
import type { LoginForm } from '@/types'

const emit = defineEmits<{
  submit: [credentials: LoginForm]
}>()

defineProps<{
  loading: boolean
  error: string | null
}>()

const username = ref('')
const password = ref('')
const showPassword = ref(false)

const { validateForm, getError, hasError, touch, reset } = useValidation()

const formFields = computed(() => ({
  username: { value: username.value, rules: [rules.required(), rules.minLength(3)] },
  password: { value: password.value, rules: [rules.required(), rules.minLength(4)] }
}))

const isFormValid = computed(() => 
  username.value.trim().length >= 3 && password.value.length >= 4
)

function handleSubmit() {
  const isValid = validateForm(formFields.value)
  if (!isValid) return
  
  emit('submit', {
    username: username.value.trim(),
    password: password.value
  })
}

function handleBlur(field: 'username' | 'password') {
  touch(field)
  validateForm({ [field]: formFields.value[field] })
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

watch([username, password], () => reset())
</script>

<template>
  <form class="login-form" @submit.prevent="handleSubmit">
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div class="form-group" :class="{ error: hasError('username') }">
      <label for="username">Kullanıcı Adı</label>
      <input
        id="username"
        v-model="username"
        type="text"
        autocomplete="username"
        placeholder="Kullanıcı adınızı girin"
        :disabled="loading"
        @blur="handleBlur('username')"
        required
      />
      <span v-if="hasError('username')" class="error-text">{{ getError('username') }}</span>
    </div>

    <div class="form-group" :class="{ error: hasError('password') }">
      <label for="password">Şifre</label>
      <div class="password-input">
        <input
          id="password"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="Şifrenizi girin"
          :disabled="loading"
          @blur="handleBlur('password')"
          required
        />
        <button 
          type="button" 
          class="toggle-password"
          @click="togglePassword"
          :disabled="loading"
        >
          {{ showPassword ? '🙈' : '👁️' }}
        </button>
      </div>
      <span v-if="hasError('password')" class="error-text">{{ getError('password') }}</span>
    </div>

    <button 
      type="submit" 
      class="submit-btn"
      :disabled="!isFormValid || loading"
    >
      <span v-if="loading">Giriş yapılıyor...</span>
      <span v-else>Giriş Yap</span>
    </button>
  </form>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.error-message {
  background: var(--color-danger-light);
  color: var(--color-danger);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group.error input {
  border-color: var(--color-danger);
}

.form-group label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-text {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
}

.password-input {
  position: relative;
  display: flex;
}

.password-input input {
  flex: 1;
  padding-right: 48px;
}

.toggle-password {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.toggle-password:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn {
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
