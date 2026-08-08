import { onUnmounted, ref, type Ref } from 'vue'

const DEFAULT_DURATION_MS = 800
/** rAF hiç çalışmazsa (gizli sekme/panel) değeri tamamlayan güvenlik payı. */
const SAFETY_SLACK_MS = 200

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export interface CountUp {
  /** 0 → 1 arası easeOutCubic ilerleme. Sayısal değeri bununla çarp. */
  progress: Ref<number>
  /** Animasyonu başlatır; yalnızca ilk çağrı etkilidir. */
  start: () => void
}

/**
 * Sayaç animasyonu için tek bir ilerleme değeri üretir; aynı ekrandaki tüm
 * sayılar tek rAF döngüsüyle birlikte sayar.
 *
 * İlerleme hiçbir koşulda 1'in altında takılı kalmaz: prefers-reduced-motion
 * açıkken anında 1 olur, requestAnimationFrame çalışmasa bile setTimeout
 * yedeği değeri tamamlar. Böylece gösterilen sayı eksik kalmaz.
 */
export function useCountUp(durationMs = DEFAULT_DURATION_MS): CountUp {
  const progress = ref(0)
  let started = false
  let frame: number | undefined
  let safety: ReturnType<typeof setTimeout> | undefined

  function finish() {
    if (frame !== undefined) cancelAnimationFrame(frame)
    clearTimeout(safety)
    frame = undefined
    safety = undefined
    progress.value = 1
  }

  function start() {
    if (started) return
    started = true

    if (prefersReducedMotion()) {
      progress.value = 1
      return
    }

    const startedAt = performance.now()
    const step = (now: number) => {
      const elapsed = Math.min((now - startedAt) / durationMs, 1)
      if (elapsed >= 1) {
        finish()
        return
      }
      progress.value = easeOutCubic(elapsed)
      frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    safety = setTimeout(finish, durationMs + SAFETY_SLACK_MS)
  }

  onUnmounted(finish)

  return { progress, start }
}
