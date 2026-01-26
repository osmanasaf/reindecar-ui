import { ref } from 'vue'

interface PaginationOptions {
    defaultPage?: number
    defaultSize?: number
}

export function usePagination(options: PaginationOptions = {}) {
    const { defaultPage = 0, defaultSize = 20 } = options

    const page = ref(defaultPage)
    const size = ref(defaultSize)
    const sort = ref<string | undefined>(undefined)
    const direction = ref<'asc' | 'desc'>('asc')
    const totalElements = ref(0)
    const totalPages = ref(0)

    function setPage(newPage: number) {
        page.value = newPage
    }

    function setSize(newSize: number) {
        size.value = newSize
        page.value = 0 // Reset to first page
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
        size.value = defaultSize
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
        setPage,
        setSize,
        setSort,
        setTotal,
        reset,
        getParams
    }
}
