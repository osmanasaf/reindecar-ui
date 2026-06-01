<script setup lang="ts">
import { useRouter } from 'vue-router'
import { RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'

const router = useRouter()
</script>

<template>
  <div class="rc-page rc-not-found">
    <div class="rc-not-found__inner">
      <div class="rc-not-found__code rc-num">404</div>
      <h1 class="rc-not-found__title">Sayfa bulunamadı</h1>
      <p class="rc-not-found__desc">Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.</p>
      <RcButton variant="accent" @click="router.push({ name: 'dashboard' })">
        <RcIcon name="chevronLeft" :size="14" />
        Ana sayfaya dön
      </RcButton>
    </div>
  </div>
</template>

<style scoped>
.rc-not-found {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rc-not-found__inner {
  text-align: center;
  max-width: 420px;
  padding: 24px;
}

.rc-not-found__code {
  font-family: var(--rc-font-display);
  font-size: 72px;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: var(--rc-text-faint);
  line-height: 1;
  margin-bottom: 12px;
}

.rc-not-found__title {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--rc-text);
}

.rc-not-found__desc {
  font-size: 14px;
  color: var(--rc-text-muted);
  margin: 0 0 20px;
  line-height: 1.5;
}
</style>
