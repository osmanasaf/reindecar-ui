import { ref, readonly } from 'vue'

const searchOpen = ref(false)

export function useShellSearch() {
  function openSearch() {
    searchOpen.value = true
  }

  function closeSearch() {
    searchOpen.value = false
  }

  function toggleSearch() {
    searchOpen.value = !searchOpen.value
  }

  return {
    searchOpen: readonly(searchOpen),
    openSearch,
    closeSearch,
    toggleSearch,
  }
}
