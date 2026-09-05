<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { integrationsApi } from '@/api'
import { useToast } from '@/composables'
import { useFeaturesStore } from '@/stores/features.store'
import { RcButton, RcField, RcBadge, RcModal, RcSkeletonText } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import {
  INTEGRATION_META,
  INTEGRATION_ORDER,
  type IntegrationCredential,
  type IntegrationKey,
} from '@/types/integration'

const toast = useToast()
const featuresStore = useFeaturesStore()

const loading = ref(true)
const items = ref<Record<IntegrationKey, IntegrationCredential | null>>({ KABIS: null, UETDS: null })
const forms = ref<Record<IntegrationKey, { username: string; secret: string }>>({
  KABIS: { username: '', secret: '' },
  UETDS: { username: '', secret: '' },
})
const savingKey = ref<IntegrationKey | null>(null)
const removingKey = ref<IntegrationKey | null>(null)
const confirmRemoveKey = ref<IntegrationKey | null>(null)

const cards = computed(() =>
  INTEGRATION_ORDER.map((key) => ({
    key,
    meta: INTEGRATION_META[key],
    item: items.value[key],
    moduleEnabled: featuresStore.isEnabled(INTEGRATION_META[key].featureKey),
  })),
)

function applyItem(item: IntegrationCredential) {
  items.value[item.key] = item
  forms.value[item.key] = { username: item.username ?? '', secret: '' }
}

async function fetchCredentials() {
  loading.value = true
  try {
    const list = await integrationsApi.list()
    list.forEach(applyItem)
  } catch (err) {
    toast.apiError(err, 'Entegrasyon bilgileri yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function save(key: IntegrationKey) {
  const form = forms.value[key]
  if (!form.username.trim() || !form.secret) {
    toast.error('Kullanıcı adı ve şifre zorunludur')
    return
  }
  savingKey.value = key
  try {
    applyItem(await integrationsApi.upsert(key, { username: form.username.trim(), secret: form.secret }))
    toast.success(`${INTEGRATION_META[key].title} erişim bilgileri kaydedildi`)
  } catch (err) {
    toast.apiError(err, 'Kaydedilemedi')
  } finally {
    savingKey.value = null
  }
}

async function remove() {
  const key = confirmRemoveKey.value
  if (!key) return
  removingKey.value = key
  try {
    await integrationsApi.remove(key)
    items.value[key] = { key, configured: false, username: null, updatedAt: null, updatedBy: null }
    forms.value[key] = { username: '', secret: '' }
    toast.success(`${INTEGRATION_META[key].title} erişim bilgileri kaldırıldı`)
  } catch (err) {
    toast.apiError(err, 'Kaldırılamadı')
  } finally {
    removingKey.value = null
    confirmRemoveKey.value = null
  }
}

onMounted(fetchCredentials)
</script>

<template>
  <div class="rcs-manager">
    <p class="rcs-features__intro">
      Dış kurum servislerine gönderim, firmanıza ait erişim bilgileriyle yapılır. Şifreler şifrelenerek saklanır ve
      bir daha görüntülenmez; değiştirmek için yeniden girilir.
    </p>

    <RcSkeletonText v-if="loading" :lines="6" />

    <div v-else class="rcs-integrations">
      <form v-for="card in cards" :key="card.key" class="rcs-card" @submit.prevent="save(card.key)">
        <div class="rcs-card__head">
          <div>
            <h3 class="rcs-card__title">{{ card.meta.title }}</h3>
            <p class="rcs-integrations__subtitle">{{ card.meta.subtitle }}</p>
          </div>
          <RcBadge :variant="card.item?.configured ? 'success' : 'warning'">
            {{ card.item?.configured ? 'Tanımlı' : 'Eksik' }}
          </RcBadge>
        </div>

        <div class="rcs-card__body">
          <p class="rcs-integrations__hint">{{ card.meta.hint }}</p>
          <p v-if="!card.moduleEnabled" class="rcs-integrations__module-note">
            <RcIcon name="sparkle" :size="14" />
            İlgili modül kapalı; bilgiler saklanır, modül açıldığında kullanılır.
          </p>

          <div class="rcs-form-grid">
            <RcField :label="card.meta.usernameLabel">
              <input
                v-model="forms[card.key].username"
                type="text"
                class="rc-input"
                autocomplete="off"
                :maxlength="100"
              />
            </RcField>
            <RcField label="Şifre">
              <input
                v-model="forms[card.key].secret"
                type="password"
                class="rc-input"
                autocomplete="new-password"
                :maxlength="200"
                :placeholder="card.item?.configured ? 'Değiştirmek için yeniden girin' : ''"
              />
            </RcField>
          </div>

          <p v-if="card.item?.configured" class="rcs-integrations__meta">
            Son güncelleme: {{ formatDateTime(card.item.updatedAt) }}
            <template v-if="card.item.updatedBy"> · {{ card.item.updatedBy }}</template>
          </p>
        </div>

        <div class="rcs-card__foot">
          <RcButton
            v-if="card.item?.configured"
            type="button"
            variant="ghost"
            :disabled="removingKey === card.key"
            @click="confirmRemoveKey = card.key"
          >
            <RcIcon name="trash" :size="14" />
            Kaldır
          </RcButton>
          <RcButton type="submit" variant="primary" :loading="savingKey === card.key">Kaydet</RcButton>
        </div>
      </form>
    </div>

    <RcModal
      :open="confirmRemoveKey !== null"
      title="Erişim bilgilerini kaldır"
      @close="confirmRemoveKey = null"
    >
      <p v-if="confirmRemoveKey">
        {{ INTEGRATION_META[confirmRemoveKey].title }} erişim bilgileri silinecek. Yeni bilgi girilene kadar bu
        entegrasyona gönderim yapılamaz.
      </p>
      <template #footer>
        <RcButton variant="ghost" @click="confirmRemoveKey = null">Vazgeç</RcButton>
        <RcButton variant="danger" :loading="removingKey !== null" @click="remove">Kaldır</RcButton>
      </template>
    </RcModal>
  </div>
</template>

<style scoped>
.rcs-integrations {
  display: grid;
  gap: 16px;
}

.rcs-integrations__subtitle,
.rcs-integrations__hint,
.rcs-integrations__meta {
  color: var(--rc-text-muted);
  font-size: 13px;
  margin: 0;
}

.rcs-integrations__hint {
  margin-bottom: 14px;
}

.rcs-integrations__meta {
  margin-top: 10px;
  font-size: 12px;
}

.rcs-integrations__module-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--rc-text-muted);
}
</style>
