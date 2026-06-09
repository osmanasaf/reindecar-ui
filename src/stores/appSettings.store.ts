import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { tenantSettingsApi } from '@/api/tenant-settings.api'
import { setDefaultCurrency } from '@/utils/format'

export const useAppSettingsStore = defineStore('appSettings', () => {
    const defaultCurrency = ref('TRY')
    const loaded = ref(false)
    const loading = ref(false)

    async function loadSettings(): Promise<void> {
        if (loading.value) return
        loading.value = true
        try {
            const settings = await tenantSettingsApi.getSettings()
            defaultCurrency.value = settings.defaultCurrency || 'TRY'
            setDefaultCurrency(defaultCurrency.value)
            loaded.value = true
        } catch {
            defaultCurrency.value = 'TRY'
            setDefaultCurrency('TRY')
        } finally {
            loading.value = false
        }
    }

    async function updateDefaultCurrency(currency: string): Promise<void> {
        const settings = await tenantSettingsApi.updateSettings({ defaultCurrency: currency })
        defaultCurrency.value = settings.defaultCurrency || currency
        setDefaultCurrency(defaultCurrency.value)
        loaded.value = true
    }

    return {
        defaultCurrency: readonly(defaultCurrency),
        loaded: readonly(loaded),
        loading: readonly(loading),
        loadSettings,
        updateDefaultCurrency,
    }
})
