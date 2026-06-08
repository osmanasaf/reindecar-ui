<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useValidation, rules } from '@/composables'
import { RcButton, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
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
const remember = ref(true)
const showPassword = ref(false)

const { validateForm, getError, hasError, touch, reset } = useValidation(() => formFields.value)

const formFields = computed(() => ({
  username: { value: username.value, rules: [rules.required(), rules.minLength(3)] },
  password: { value: password.value, rules: [rules.required(), rules.minLength(4)] },
}))

const isFormValid = computed(() =>
  username.value.trim().length >= 3 && password.value.length >= 4,
)

function handleSubmit() {
  const isValid = validateForm(formFields.value)
  if (!isValid) return

  emit('submit', {
    username: username.value.trim(),
    password: password.value,
    remember: remember.value,
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
  <form class="rc-auth__form" @submit.prevent="handleSubmit">
    <div v-if="error" class="rc-alert rc-alert--danger" role="alert">
      {{ error }}
    </div>

    <label
      class="rc-field"
      :class="{ 'rc-field--error': hasError('username') }"
    >
      <span class="rc-field__label">Kullanıcı adı</span>
      <RcInput
        id="username"
        v-model="username"
        autocomplete="username"
        placeholder="Kullanıcı adınızı girin"
        class="rc-input--lg"
        :disabled="loading"
        @blur="handleBlur('username')"
      />
      <span v-if="hasError('username')" class="rc-field__error">{{ getError('username') }}</span>
    </label>

    <label
      class="rc-field"
      :class="{ 'rc-field--error': hasError('password') }"
    >
      <span class="rc-auth__field-label-row rc-field__label">
        <span>Parola</span>
        <a href="#">Unuttum</a>
      </span>
      <div class="rc-input-group rc-input--lg">
        <input
          id="password"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="Şifrenizi girin"
          :disabled="loading"
          @blur="handleBlur('password')"
        />
        <RcButton
          type="button"
          variant="ghost"
          icon
          :aria-label="showPassword ? 'Parolayı gizle' : 'Parolayı göster'"
          :disabled="loading"
          @click="togglePassword"
        >
          <RcIcon name="eye" :size="16" />
        </RcButton>
      </div>
      <span v-if="hasError('password')" class="rc-field__error">{{ getError('password') }}</span>
    </label>

    <label class="rc-auth__remember">
      <input v-model="remember" type="checkbox" :disabled="loading" />
      1 hafta boyunca hatırla
    </label>

    <RcButton
      type="submit"
      variant="primary"
      size="lg"
      class="rc-auth__submit"
      :disabled="!isFormValid"
      :loading="loading"
    >
      Giriş yap
      <RcIcon v-if="!loading" name="arrowRight" :size="16" />
    </RcButton>
  </form>
</template>

<style scoped>
.rc-auth__submit {
  width: 100%;
  margin-top: 4px;
}

.rc-input-group.rc-input--lg {
  height: 40px;
}
</style>
