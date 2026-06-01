import { ref, computed, readonly, watch, onScopeDispose } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'reindecar_theme'

const preference = ref<ThemePreference>(readStoredPreference())
const systemDark = ref(getSystemDark())

function readStoredPreference(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolvedTheme(pref: ThemePreference, sysDark: boolean): 'light' | 'dark' {
  if (pref === 'system') return sysDark ? 'dark' : 'light'
  return pref
}

function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

const resolved = computed(() => resolvedTheme(preference.value, systemDark.value))

let mediaQuery: MediaQueryList | null = null
let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null

function attachSystemListener(): void {
  if (typeof window === 'undefined' || mediaQuery) return
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaHandler = (e: MediaQueryListEvent) => {
    systemDark.value = e.matches
  }
  mediaQuery.addEventListener('change', mediaHandler)
}

function detachSystemListener(): void {
  if (mediaQuery && mediaHandler) {
    mediaQuery.removeEventListener('change', mediaHandler)
  }
  mediaQuery = null
  mediaHandler = null
}

watch(resolved, (theme) => applyTheme(theme), { immediate: true })

export function initTheme(): void {
  systemDark.value = getSystemDark()
  applyTheme(resolvedTheme(preference.value, systemDark.value))
  attachSystemListener()
}

export function useTheme() {
  attachSystemListener()

  onScopeDispose(() => {
    // Global listener — yalnızca son scope dispose olunca kaldırma
  })

  function setPreference(next: ThemePreference): void {
    preference.value = next
    localStorage.setItem(STORAGE_KEY, next)
  }

  function toggleTheme(): void {
    const next = resolved.value === 'dark' ? 'light' : 'dark'
    setPreference(next)
  }

  const isDark = computed(() => resolved.value === 'dark')

  return {
    preference: readonly(preference),
    resolved: readonly(resolved),
    isDark,
    setPreference,
    toggleTheme,
  }
}

export function teardownTheme(): void {
  detachSystemListener()
}
