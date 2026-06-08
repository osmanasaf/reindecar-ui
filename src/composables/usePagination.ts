import { ref } from 'vue'
import { readStoredValue, writeStoredValue } from './useLocalStorage'
import { UI_STORAGE_KEYS, normalizePageSize, PAGE_SIZE_OPTIONS, type PageSizeOption } from './uiPreferences'

interface PaginationOptions {
    defaultPage?: number
    defaultSize?: number
    /** false verilirse sayfa boyutu localStorage'a yazılmaz */
    persistSize?: boolean
}

export function usePagination(options: PaginationOptions = {}) {
    const { defaultPage = 0, defaultSize = 20, persistSize = true } = options

    const initialSize = persistSize
        ? normalizePageSize(readStoredValue(UI_STORAGE_KEYS.pageSize, defaultSize), defaultSize)
        : normalizePageSize(defaultSize, defaultSize)

    const page = ref(defaultPage)
    const size = ref<PageSizeOption>(initialSize)
    const sort = ref<string | undefined>(undefined)
    const direction = ref<'asc' | 'desc'>('asc')
    const totalElements = ref(0)
    const totalPages = ref(0)

    function setPage(newPage: number) {
        page.value = newPage
    }

    function setSize(newSize: number) {
        const next = normalizePageSize(newSize, size.value)
        size.value = next
        page.value = 0
        if (persistSize) {
            writeStoredValue(UI_STORAGE_KEYS.pageSize, next)
        }
    }

    function setSort(field: string, dir: 'asc' | 'desc' = 'asc') {
        sort.value = field
        direction.value = dir
    }

    function setTotal(elements: number, pages: number) {
        totalElements.value = elements
        totalPages.value = pages
    }

    function reset() {
        page.value = defaultPage
        size.value = normalizePageSize(defaultSize, defaultSize)
        sort.value = undefined
        direction.value = 'asc'
    }

    function getParams() {
        return {
            page: page.value,
            size: size.value,
            sort: sort.value,
            direction: direction.value
        }
    }

    return {
        page,
        size,
        sort,
        direction,
        totalElements,
        totalPages,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        setPage,
        setSize,
        setSort,
        setTotal,
        reset,
        getParams,
    }
}
