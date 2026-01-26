import { ref, shallowRef, type Ref, readonly } from 'vue'
import type { ApiError } from '@/types'

interface UseFetchReturn<T> {
    data: Ref<T | null>
    error: Ref<ApiError | null>
    loading: Ref<boolean>
    execute: () => Promise<void>
    refresh: () => Promise<void>
}

export function useFetch<T>(fetcher: () => Promise<T>): UseFetchReturn<T> {
    const data = shallowRef<T | null>(null)
    const error = shallowRef<ApiError | null>(null)
    const loading = ref(false)

    async function execute() {
        loading.value = true
        error.value = null

        try {
            data.value = await fetcher()
        } catch (e) {
            error.value = e as ApiError
        } finally {
            loading.value = false
        }
    }

    async function refresh() {
        await execute()
    }

    return {
        data: readonly(data) as Ref<T | null>,
        error: readonly(error) as Ref<ApiError | null>,
        loading: readonly(loading),
        execute,
        refresh
    }
}
