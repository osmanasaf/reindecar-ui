import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores'

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

    if (to.meta.requiresAdmin && !authStore.isAdmin) {
        next({ name: 'dashboard' })
        return
    }

    next()
}
