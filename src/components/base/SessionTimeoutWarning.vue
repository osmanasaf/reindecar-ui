<script setup lang="ts">
import { ref } from 'vue'
import { useTokenStatus } from '@/composables'
import { useRouter } from 'vue-router'
import { RcIcon } from '@/components/icons'

const router = useRouter()
const { isExpiringSoon, formattedTimeToExpiry, extendSession, timeToExpiry } = useTokenStatus()

const extending = ref(false)
const dismissed = ref(false)

async function handleExtend() {
  extending.value = true
  const success = await extendSession()
  extending.value = false

  if (success) {
    dismissed.value = true
    setTimeout(() => {
      dismissed.value = false
    }, 60000)
  }
}

function handleLogout() {
  router.push('/login')
}
</script>

<template>
  <Transition name="rc-session-bar">
    <div
      v-if="isExpiringSoon && !dismissed && timeToExpiry > 0"
      class="rc-session-bar"
      role="alert"
    >
      <div class="rc-session-bar__content">
        <RcIcon name="clock" :size="18" style="color: var(--rc-orange-400); flex-shrink: 0" />
        <div class="rc-session-bar__text">
          <span class="rc-session-bar__title">Oturum süresi doluyor</span>
          <span class="rc-session-bar__sub">Kalan süre: {{ formattedTimeToExpiry }}</span>
        </div>
      </div>
      <div class="rc-session-bar__actions">
        <button type="button" class="rc-session-bar__btn rc-session-bar__btn--ghost" @click="handleLogout">
          Çıkış yap
        </button>
        <button
          type="button"
          class="rc-session-bar__btn rc-session-bar__btn--primary"
          :disabled="extending"
          @click="handleExtend"
        >
          {{ extending ? 'Uzatılıyor…' : 'Oturumu uzat' }}
        </button>
      </div>
    </div>
  </Transition>
</template>
