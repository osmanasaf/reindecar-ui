import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore, useAppSettingsStore, useFeaturesStore } from '@/stores'
import type { FeatureKey } from '@/types/feature'

export async function authGuard(
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
): Promise<void> {
    const authStore = useAuthStore()

    if (to.meta.requiresAuth === false) {
        next()
        return
    }

    const isAuthenticated = await authStore.checkAuth()

    if (!isAuthenticated) {
        next({ name: 'login', query: { redirect: to.fullPath } })
        return
    }

    const appSettingsStore = useAppSettingsStore()
    if (!appSettingsStore.loaded) {
        await appSettingsStore.loadSettings()
    }

    const featuresStore = useFeaturesStore()
    if (!featuresStore.loaded) {
        await featuresStore.loadFeatures()
    }

    if (to.meta.requiresAdmin && !authStore.isAdmin) {
        next({ name: 'dashboard' })
        return
    }

    const roles = to.meta.roles as string[] | undefined
    if (roles?.length && !roles.includes(authStore.user?.role ?? '')) {
        next({ name: 'dashboard' })
        return
    }

    const featureKey = to.meta.featureKey as FeatureKey | undefined
    if (featureKey && !authStore.isSuperAdmin && !featuresStore.isEnabled(featureKey)) {
        next({ name: 'settings', query: { tab: 'features' } })
        return
    }

    next()
}
