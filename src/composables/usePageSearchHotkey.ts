import { type Ref, onMounted, onBeforeUnmount } from 'vue'

/** `/` ile sayfa arama kutusuna odaklanır (input/textarea içindeyken devre dışı). */
export function usePageSearchHotkey(searchInputRef: Ref<HTMLInputElement | null>) {
  function onKeydown(e: KeyboardEvent) {
    if (e.key !== '/') return
    const target = e.target as HTMLElement | null
    if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
    e.preventDefault()
    searchInputRef.value?.focus()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
