import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useShellSearch } from './useShellSearch'

export function useShellHotkeys() {
  const router = useRouter()
  const { searchOpen, openSearch, closeSearch } = useShellSearch()

  function onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null
    const inField = target?.matches('input, textarea, select, [contenteditable="true"]')

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      if (searchOpen.value) {
        closeSearch()
      } else {
        openSearch()
      }
      return
    }

    if (searchOpen.value) return

    if (inField) return

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      router.push({ name: 'rental-create' })
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
