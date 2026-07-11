<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { adminTenantsApi, adminTenantFeaturesApi } from '@/api'
import { useToast } from '@/composables'
import { RcPageHeader, RcButton, RcBadge, RcField, RcInput, RcSkeletonText } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_CATEGORY_ORDER,
  type FeatureCategory,
  type TenantFeature,
} from '@/types/feature'
import type { Tenant, TenantStatus } from '@/types/tenant'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const tenantId = computed(() => Number(route.params.id))

const tenant = ref<Tenant | null>(null)
const loadingTenant = ref(true)
const savingTenant = ref(false)

const features = ref<TenantFeature[]>([])
const loadingFeatures = ref(true)
const updatingKey = ref<string | null>(null)

const editName = ref('')
const editStatus = ref<TenantStatus>('ACTIVE')
const editCurrency = ref('')

const statusOptions: Array<{ value: TenantStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'SUSPENDED', label: 'Askıda' },
  { value: 'DELETED', label: 'Silindi' },
]

const currentStatusMeta = computed(() => {
  const status = tenant.value?.status
  return statusOptions.find((s) => s.value === status) ?? { value: 'ACTIVE' as TenantStatus, label: 'Aktif' }
})

const groupedFeatures = computed(() => {
  const groups = new Map<FeatureCategory, TenantFeature[]>()
  for (const feature of features.value) {
    const list = groups.get(feature.category) ?? []
    list.push(feature)
    groups.set(feature.category, list)
  }
  return FEATURE_CATEGORY_ORDER
    .filter((category) => groups.has(category))
    .map((category) => ({
      category,
      label: FEATURE_CATEGORY_LABELS[category],
      items: groups.get(category) ?? [],
    }))
})

async function loadTenant() {
  loadingTenant.value = true
  try {
    tenant.value = await adminTenantsApi.getById(tenantId.value)
    editName.value = tenant.value.name
    editStatus.value = tenant.value.status
    editCurrency.value = tenant.value.defaultCurrency ?? ''
  } catch (err) {
    toast.apiError(err, 'Firma yüklenemedi')
    router.push({ name: 'admin-tenants' })
  } finally {
    loadingTenant.value = false
  }
}

async function loadFeatures() {
  loadingFeatures.value = true
  try {
    features.value = await adminTenantFeaturesApi.listTenantFeatures(tenantId.value)
  } catch (err) {
    toast.apiError(err, 'Modül listesi yüklenemedi')
  } finally {
    loadingFeatures.value = false
  }
}

async function handleSaveTenant() {
  if (!editName.value.trim()) {
    toast.error('Firma adı zorunludur')
    return
  }
  savingTenant.value = true
  try {
    tenant.value = await adminTenantsApi.update(tenantId.value, {
      name: editName.value.trim(),
      status: editStatus.value,
      defaultCurrency: editCurrency.value.trim() || undefined,
    })
    toast.success('Firma bilgileri güncellendi')
  } catch (err) {
    toast.apiError(err, 'Güncelleme başarısız')
  } finally {
    savingTenant.value = false
  }
}

async function handleToggleFeature(feature: TenantFeature) {
  if (updatingKey.value) return
  const nextEnabled = !feature.enabled
  updatingKey.value = feature.key
  try {
    await adminTenantFeaturesApi.updateTenantFeature(tenantId.value, feature.key, { enabled: nextEnabled })
    feature.enabled = nextEnabled
    toast.success(
      nextEnabled ? `"${feature.displayName}" etkinleştirildi` : `"${feature.displayName}" kapatıldı`,
    )
  } catch (err) {
    toast.apiError(err, 'Modül güncellenemedi')
  } finally {
    updatingKey.value = null
  }
}

onMounted(() => {
  void loadTenant()
  void loadFeatures()
})
</script>

<template>
  <div class="rc-page">
    <div class="rc-cust-detail-nav">
      <RouterLink to="/admin/tenants" class="rc-btn rc-btn--ghost rc-btn--sm">
        <RcIcon name="chevronLeft" :size="14" />
        Firmalar
      </RouterLink>
    </div>

    <RcSkeletonText v-if="loadingTenant" :lines="3" />

    <template v-else-if="tenant">
      <RcPageHeader :title="tenant.name" :subtitle="`Kod: ${tenant.code}`">
        <template #actions>
          <RcBadge :variant="tenant.status === 'ACTIVE' ? 'success' : tenant.status === 'SUSPENDED' ? 'warning' : 'danger'">
            {{ currentStatusMeta.label }}
          </RcBadge>
        </template>
      </RcPageHeader>

      <div class="rc-card rcr-panel-card">
        <h3 class="rcr-panel-card__title">Firma bilgileri</h3>
        <div class="rcv-form-grid">
          <RcField label="Firma adı *">
            <RcInput v-model="editName" />
          </RcField>
          <RcField label="Durum">
            <select v-model="editStatus" class="rc-select">
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </RcField>
          <RcField label="Varsayılan para birimi">
            <RcInput v-model="editCurrency" placeholder="TRY" maxlength="3" />
          </RcField>
        </div>
        <div style="margin-top: 14px">
          <RcButton variant="accent" :loading="savingTenant" @click="handleSaveTenant">Kaydet</RcButton>
        </div>
      </div>

      <div class="rc-card rcr-panel-card" style="margin-top: 14px">
        <h3 class="rcr-panel-card__title">Modüller</h3>
        <p class="rcr-panel-card__sub">
          Bu firma için açık/kapalı modülleri buradan yönetebilirsiniz. Süper yönetici tüm modülleri
          değiştirebilir.
        </p>

        <div v-if="loadingFeatures" style="padding: 16px 0">
          <RcSkeletonText :lines="6" />
        </div>

        <div v-else class="rcs-features__groups">
          <section v-for="group in groupedFeatures" :key="group.category" class="rcs-features__group">
            <h4 class="rcs-features__group-title">{{ group.label }}</h4>
            <div class="rcs-features__list">
              <div v-for="feature in group.items" :key="feature.key" class="rcs-features__item">
                <div class="rcs-features__item-text">
                  <span class="rcs-features__item-title">{{ feature.displayName }}</span>
                  <span class="rcs-features__item-desc">{{ feature.description }}</span>
                </div>
                <button
                  type="button"
                  class="rcs-toggle"
                  :disabled="updatingKey === feature.key"
                  :aria-pressed="feature.enabled"
                  :aria-label="`${feature.displayName} ${feature.enabled ? 'açık' : 'kapalı'}`"
                  @click="handleToggleFeature(feature)"
                >
                  <span class="rcs-toggle__track" :class="{ 'rcs-toggle__track--on': feature.enabled }">
                    <span class="rcs-toggle__thumb" />
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
