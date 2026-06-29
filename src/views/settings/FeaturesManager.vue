<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useFeaturesStore } from '@/stores/features.store'
import { useToast } from '@/composables'
import { RcEmpty, RcSkeletonText } from '@/components/rc'
import {
    FEATURE_CATEGORY_LABELS,
    FEATURE_CATEGORY_ORDER,
    type FeatureCategory,
    type TenantFeature,
} from '@/types/feature'

const toast = useToast()
const featuresStore = useFeaturesStore()
const { features, loading } = storeToRefs(featuresStore)
const { loadFeatures, updateFeature, isUpdating } = featuresStore

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

const configurableCount = computed(() =>
    features.value.filter((feature) => feature.tenantConfigurable).length,
)

onMounted(async () => {
    await loadFeatures()
})

async function handleToggle(feature: TenantFeature) {
    if (!feature.tenantConfigurable || isUpdating(feature.key)) {
        return
    }
  const nextEnabled = !feature.enabled
  try {
    await updateFeature(feature.key, nextEnabled)
    toast.success(
      nextEnabled
        ? `"${feature.displayName}" etkinleştirildi`
        : `"${feature.displayName}" kapatıldı`,
    )
    } catch (error: unknown) {
        const err = error as { message?: string }
        toast.error(err.message || 'Özellik güncellenemedi')
    }
}
</script>

<template>
  <div class="rcs-features">
    <p class="rcs-features__intro">
      Firmanızın kullanacağı modülleri buradan açıp kapatabilirsiniz.
      Yalnızca platformda yayınlanmış özellikler yapılandırılabilir.
    </p>

    <div v-if="loading" style="padding: 24px 0">
      <RcSkeletonText :lines="6" />
    </div>

    <RcEmpty
      v-else-if="configurableCount === 0"
      title="Yapılandırılabilir özellik yok"
      description="Henüz firmanız için açılmış modül bulunmuyor. Platform yöneticinizle iletişime geçin."
    />

    <div v-else class="rcs-features__groups">
      <section
        v-for="group in groupedFeatures"
        :key="group.category"
        class="rcs-features__group"
      >
        <h3 class="rcs-features__group-title">{{ group.label }}</h3>
        <div class="rcs-features__list">
          <div
            v-for="feature in group.items"
            :key="feature.key"
            class="rcs-features__item"
            :class="{ 'rcs-features__item--disabled': !feature.tenantConfigurable }"
          >
            <div class="rcs-features__item-text">
              <span class="rcs-features__item-title">{{ feature.displayName }}</span>
              <span class="rcs-features__item-desc">{{ feature.description }}</span>
              <span v-if="!feature.tenantConfigurable" class="rcs-features__item-badge">
                Platformda henüz açılmadı
              </span>
            </div>
            <button
              type="button"
              class="rcs-toggle"
              :disabled="!feature.tenantConfigurable || isUpdating(feature.key)"
              :aria-pressed="feature.enabled"
              :aria-label="`${feature.displayName} ${feature.enabled ? 'açık' : 'kapalı'}`"
              @click="handleToggle(feature)"
            >
              <span
                class="rcs-toggle__track"
                :class="{ 'rcs-toggle__track--on': feature.enabled }"
              >
                <span class="rcs-toggle__thumb" />
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
