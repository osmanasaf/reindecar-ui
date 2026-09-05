import { defineStore } from 'pinia'
import { computed, ref, readonly } from 'vue'
import { featuresApi } from '@/api/features.api'
import type { FeatureKey, TenantFeature } from '@/types/feature'

const SURFACES_ENABLED_BEFORE_FLAGS: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
    'RENTAL_PRICING',
    'RENTAL_EXTRA_CHARGES',
    'KM_PACKAGES',
    'PRICING_CAMPAIGNS',
    'RENTAL_INVOICING',
    'RECEIVABLES_MODULE',
])

export const useFeaturesStore = defineStore('features', () => {
    const features = ref<TenantFeature[]>([])
    const loaded = ref(false)
    const loadFailed = ref(false)
    const loading = ref(false)
    const updatingKeys = ref<Set<FeatureKey>>(new Set())
    const applyingPreset = ref(false)

    const enabledKeys = computed(() =>
        new Set(features.value.filter((feature) => feature.enabled).map((feature) => feature.key)),
    )

    function isEnabled(key: FeatureKey): boolean {
        if (loadFailed.value) {
            return SURFACES_ENABLED_BEFORE_FLAGS.has(key)
        }
        return enabledKeys.value.has(key)
    }

    async function loadFeatures(): Promise<void> {
        if (loading.value) return
        loading.value = true
        try {
            features.value = await featuresApi.listFeatures()
            loadFailed.value = false
            loaded.value = true
        } catch (error) {
            console.error('[Features] Ozellik listesi yuklenemedi', error)
            features.value = []
            loadFailed.value = true
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

    async function applyInternalFleetPreset(): Promise<void> {
        applyingPreset.value = true
        try {
            features.value = await featuresApi.applyInternalFleetPreset()
            loadFailed.value = false
        } finally {
            applyingPreset.value = false
        }
    }

    function reset(): void {
        features.value = []
        loaded.value = false
        loadFailed.value = false
        loading.value = false
        updatingKeys.value = new Set()
        applyingPreset.value = false
    }

    return {
        features: readonly(features),
        loaded: readonly(loaded),
        loadFailed: readonly(loadFailed),
        loading: readonly(loading),
        enabledKeys,
        isEnabled,
        loadFeatures,
        updateFeature,
        isUpdating,
        applyingPreset: readonly(applyingPreset),
        applyInternalFleetPreset,
        reset,
    }
})
