import { defineStore } from 'pinia'
import { computed, ref, readonly } from 'vue'
import { featuresApi } from '@/api/features.api'
import type { FeatureKey, TenantFeature } from '@/types/feature'

export const useFeaturesStore = defineStore('features', () => {
    const features = ref<TenantFeature[]>([])
    const loaded = ref(false)
    const loading = ref(false)
    const updatingKeys = ref<Set<FeatureKey>>(new Set())

    const enabledKeys = computed(() =>
        new Set(features.value.filter((feature) => feature.enabled).map((feature) => feature.key)),
    )

    function isEnabled(key: FeatureKey): boolean {
        return enabledKeys.value.has(key)
    }

    async function loadFeatures(): Promise<void> {
        if (loading.value) return
        loading.value = true
        try {
            features.value = await featuresApi.listFeatures()
            loaded.value = true
        } catch {
            features.value = []
            loaded.value = true
        } finally {
            loading.value = false
        }
    }

    async function updateFeature(key: FeatureKey, enabled: boolean): Promise<TenantFeature> {
        updatingKeys.value.add(key)
        try {
            const updated = await featuresApi.updateFeature(key, { enabled })
            const index = features.value.findIndex((feature) => feature.key === key)
            if (index >= 0) {
                features.value[index] = updated
            } else {
                features.value.push(updated)
            }
            return updated
        } finally {
            updatingKeys.value.delete(key)
        }
    }

    function isUpdating(key: FeatureKey): boolean {
        return updatingKeys.value.has(key)
    }

    function reset(): void {
        features.value = []
        loaded.value = false
        loading.value = false
        updatingKeys.value = new Set()
    }

    return {
        features: readonly(features),
        loaded: readonly(loaded),
        loading: readonly(loading),
        enabledKeys,
        isEnabled,
        loadFeatures,
        updateFeature,
        isUpdating,
        reset,
    }
})
