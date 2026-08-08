import { computed, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue'

/** rcRise (200ms) + en büyük satır gecikmesi (360ms) + küçük pay. */
const STAGGER_HOLD_MS = 700

/**
 * Skeleton'dan içeriğe ilk geçişte `true` olan, `holdMs` sonunda kalıcı olarak
 * `false`'a dönen bayrak. Sayfalama, filtre veya yenileme sonrası tekrar
 * tetiklenmez; giriş animasyonu yalnız bir kez oynar.
 */
export function useFirstLoadIntro(loading: Readonly<Ref<boolean>>, holdMs: number): Ref<boolean> {
  const intro = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const stop = watch(loading, (isLoading) => {
    if (isLoading) return
    stop()
    intro.value = true
    timer = setTimeout(() => {
      intro.value = false
    }, holdMs)
  })

  onUnmounted(() => clearTimeout(timer))

  return intro
}

/**
 * Liste satırlarının ilk yüklemede bir kez kademeli girmesi için sınıf adı.
 * Animasyon bittiğinde sınıf kaldırılır; böylece sonradan oluşan satırlarda
 * (sayfalama, filtre) tekrar oynamaz.
 */
export function useFirstLoadStagger(loading: Readonly<Ref<boolean>>): ComputedRef<string> {
  const intro = useFirstLoadIntro(loading, STAGGER_HOLD_MS)
  return computed(() => (intro.value ? 'rc-stagger' : ''))
}
