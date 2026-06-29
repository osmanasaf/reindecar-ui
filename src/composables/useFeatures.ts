import { storeToRefs } from 'pinia'
import { useFeaturesStore } from '@/stores/features.store'
import type { FeatureKey } from '@/types/feature'

export function useFeatures() {
    const store = useFeaturesStore()
    const { features, loaded, loading } = storeToRefs(store)

    function isEnabled(key: FeatureKey): boolean {
        return store.isEnabled(key)
    }

    function isAnyEnabled(...keys: FeatureKey[]): boolean {
        return keys.some((key) => store.isEnabled(key))
    }

    function areAllEnabled(...keys: FeatureKey[]): boolean {
        return keys.every((key) => store.isEnabled(key))
    }

    return {
        features,
        loaded,
        loading,
        isEnabled,
        isAnyEnabled,
        areAllEnabled,
        loadFeatures: store.loadFeatures,
        updateFeature: store.updateFeature,
        isUpdating: store.isUpdating,
    }
}
