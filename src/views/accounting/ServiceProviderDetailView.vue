<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useEnumTranslations, useToast } from '@/composables'
import { formatPhoneInput, normalizePhoneDigits } from '@/utils/phone'
import type { UpdateServiceProviderRequest, ServiceProviderResponse } from '@/types'
import { EditProviderModal } from '@/components/accounting'
import { RcButton, RcEmpty, RcBadge, RcDetailSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'

const route = useRoute()
const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const { translateServiceType, translateProviderType } = useEnumTranslations()

const provider = computed(() => accountingStore.selectedProvider)

const editableProvider = computed((): ServiceProviderResponse | null => {
  const p = provider.value
  if (!p) return null
  return { ...p, serviceTypes: [...p.serviceTypes] }
})
const loading = computed(() => accountingStore.providersLoading)
const showEditModal = ref(false)

onMounted(() => {
  const id = Number(route.params.id)
  if (id) accountingStore.fetchProviderById(id)
})

function handleEdit() {
  showEditModal.value = true
}

async function handleEditSubmit(id: number, data: UpdateServiceProviderRequest) {
  try {
    await accountingStore.updateServiceProvider(id, data)
    toast.success('Servis sağlayıcı başarıyla güncellendi')
    showEditModal.value = false
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Servis sağlayıcı güncellenirken hata oluştu')
  }
}

async function handleToggleActive() {
  if (!provider.value) return
  try {
    if (provider.value.active) {
      await accountingStore.deactivateServiceProvider(provider.value.id)
      toast.success('Servis sağlayıcı pasif yapıldı')
    } else {
      await accountingStore.activateServiceProvider(provider.value.id)
      toast.success('Servis sağlayıcı aktif yapıldı')
    }
    await accountingStore.fetchProviderById(provider.value.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'İşlem sırasında hata oluştu')
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPhone(phone?: string | null) {
  return phone ? formatPhoneInput(phone) : ''
}

function toTelHref(phone?: string | null) {
  if (!phone) return 'tel:'
  const digits = normalizePhoneDigits(phone)
  return digits ? `tel:+90${digits}` : `tel:${phone}`
}
</script>

<template>
  <div class="rc-page rca-detail">
    <button type="button" class="rca-detail__back" @click="router.push({ name: 'service-providers' })">
      <RcIcon name="chevronLeft" :size="14" />
      Servis Sağlayıcılar
    </button>

    <RcDetailSkeleton v-if="loading" :sections="2" />

    <RcEmpty v-else-if="!provider" title="Sağlayıcı bulunamadı" description="Kayıt silinmiş veya erişim yok olabilir" />

    <template v-else>
      <div class="rca-detail__head">
        <div>
          <h1 class="rca-detail__title">{{ provider.name }}</h1>
          <p class="rca-detail__subtitle">{{ provider.code }} · {{ translateProviderType(provider.type) }}</p>
        </div>
        <div class="rca-detail__badges">
          <RcBadge :variant="provider.active ? 'success' : 'default'">
            {{ provider.active ? 'Aktif' : 'Pasif' }}
          </RcBadge>
        </div>
      </div>

      <div class="rca-detail__actions">
        <RcButton variant="secondary" @click="handleEdit">Düzenle</RcButton>
        <RcButton :variant="provider.active ? 'danger' : 'accent'" @click="handleToggleActive">
          {{ provider.active ? 'Pasif yap' : 'Aktif yap' }}
        </RcButton>
      </div>

      <div class="rca-detail__grid">
        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">İletişim</h3>
          <div v-if="provider.phone" class="rca-meta-row">
            <span class="rca-meta-row__label">Telefon</span>
            <a class="rca-meta-row__value" :href="toTelHref(provider.phone)">{{ formatPhone(provider.phone) }}</a>
          </div>
          <div v-if="provider.email" class="rca-meta-row">
            <span class="rca-meta-row__label">E-posta</span>
            <a class="rca-meta-row__value" :href="`mailto:${provider.email}`">{{ provider.email }}</a>
          </div>
          <div v-if="provider.contactPerson" class="rca-meta-row">
            <span class="rca-meta-row__label">İletişim kişisi</span>
            <span class="rca-meta-row__value">{{ provider.contactPerson }}</span>
          </div>
          <div v-if="provider.contactPhone" class="rca-meta-row">
            <span class="rca-meta-row__label">İletişim tel.</span>
            <a class="rca-meta-row__value" :href="toTelHref(provider.contactPhone)">{{ formatPhone(provider.contactPhone) }}</a>
          </div>
          <p v-if="!provider.phone && !provider.email && !provider.contactPerson" class="rca-detail__text rca-detail__text--muted">
            İletişim bilgisi girilmemiş
          </p>
        </div>

        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Adres</h3>
          <div v-if="provider.address" class="rca-meta-row">
            <span class="rca-meta-row__label">Adres</span>
            <span class="rca-meta-row__value">{{ provider.address }}</span>
          </div>
          <div v-if="provider.city || provider.district" class="rca-meta-row">
            <span class="rca-meta-row__label">Şehir / ilçe</span>
            <span class="rca-meta-row__value">{{ [provider.district, provider.city].filter(Boolean).join(', ') }}</span>
          </div>
          <p v-if="!provider.address && !provider.city && !provider.district" class="rca-detail__text rca-detail__text--muted">
            Adres bilgisi girilmemiş
          </p>
        </div>

        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Vergi</h3>
          <div v-if="provider.taxNumber" class="rca-meta-row">
            <span class="rca-meta-row__label">Vergi no</span>
            <span class="rca-meta-row__value rc-mono">{{ provider.taxNumber }}</span>
          </div>
          <div v-if="provider.taxOffice" class="rca-meta-row">
            <span class="rca-meta-row__label">Vergi dairesi</span>
            <span class="rca-meta-row__value">{{ provider.taxOffice }}</span>
          </div>
          <p v-if="!provider.taxNumber && !provider.taxOffice" class="rca-detail__text rca-detail__text--muted">
            Vergi bilgisi girilmemiş
          </p>
        </div>

        <div class="rca-panel-card">
          <h3 class="rca-panel-card__title">Hizmet türleri</h3>
          <div v-if="provider.serviceTypes?.length" class="rc-filterbar" style="padding: 0; border: none; margin: 0">
            <span v-for="type in provider.serviceTypes" :key="type" class="rc-chip rc-chip--on">
              {{ translateServiceType(type) }}
            </span>
          </div>
          <p v-else class="rca-detail__text rca-detail__text--muted">Hizmet türü belirtilmemiş</p>
        </div>
      </div>

      <div v-if="provider.notes" class="rca-panel-card" style="margin-top: 16px">
        <h3 class="rca-panel-card__title">Notlar</h3>
        <p class="rca-detail__text">{{ provider.notes }}</p>
      </div>

      <div class="rca-detail__meta">
        <span>Oluşturan: {{ provider.createdBy }}</span>
        <span>Oluşturulma: {{ formatDate(provider.createdAt) }}</span>
        <span>Güncelleme: {{ formatDate(provider.updatedAt) }}</span>
      </div>

      <EditProviderModal
        v-if="editableProvider"
        :show="showEditModal"
        :provider="editableProvider"
        @close="showEditModal = false"
        @submit="handleEditSubmit"
      />
    </template>
  </div>
</template>

<style scoped>
.rca-detail__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
}

.rca-detail__text--muted {
  color: var(--rc-text-muted);
}

.rca-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--rc-border);
  font-size: 12px;
  color: var(--rc-text-muted);
}

.rca-meta-row__value {
  color: var(--rc-text);
  text-decoration: none;
}

a.rca-meta-row__value:hover {
  color: var(--rc-blue-600);
}
</style>
