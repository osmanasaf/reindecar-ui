<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RcIcon } from '@/components/icons'
import type { IconName } from '@/components/icons/iconPaths'

/** rc-primitives.css'teki rcModalOut/rcOverlayOut süresiyle aynı olmalı. */
const CLOSE_ANIM_MS = 180

/** Başlık rozetinin rengini belirler; `rc-modal__badge--*` sınıflarıyla eşleşir. */
export type ModalIntent = 'operation' | 'destructive' | 'success' | 'warning'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  subtitle?: string
  /** Başlık rozeti ikonu; verilmezse rozet çizilmez. */
  icon?: IconName
  intent?: ModalIntent
  wide?: boolean
  xl?: boolean
}>(), {
  intent: 'operation',
  wide: false,
  xl: false,
})

const emit = defineEmits<{ close: [] }>()

const modalRef = ref<HTMLElement | null>(null)
const titleId = `rc-modal-title-${Math.random().toString(36).slice(2, 9)}`

// Kapanış animasyonu bilinçli olarak <Transition> ile değil, görünürlüğü
// setTimeout ile düşürerek yapılıyor: Vue'nun class tabanlı geçişi elemanı
// requestAnimationFrame callback'inde kaldırır; kare üretilmeyen bir sekmede
// modal ekranda asılı kalır. setTimeout kare üretiminden bağımsız çalışır.
const visible = ref(props.open)
const closing = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  )
}

function trapFocus(e: KeyboardEvent) {
  if (!props.open || e.key !== 'Tab' || !modalRef.value) return
  const nodes = focusables(modalRef.value)
  if (nodes.length === 0) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last?.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first?.focus()
  }
}

function focusFirst() {
  if (!modalRef.value) return
  const nodes = focusables(modalRef.value)
  const closeBtn = modalRef.value.querySelector<HTMLElement>('.rc-modal__close')
  ;(closeBtn && nodes.includes(closeBtn) ? closeBtn : nodes[0])?.focus()
}

/**
 * Escape once en ustteki katmana aittir. Ic bilesenler (takvim, dropdown)
 * olayi kendileri isledigin de preventDefault ile isaretler; o durumda modal
 * kapanmaz ve kullanicinin girdigi veri uyarisiz gitmez.
 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && !e.defaultPrevented) emit('close')
  trapFocus(e)
}

function closeDelay(): number {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : CLOSE_ANIM_MS
}

watch(() => props.open, async (isOpen) => {
  clearTimeout(closeTimer)
  document.body.style.overflow = isOpen ? 'hidden' : ''

  if (isOpen) {
    closing.value = false
    visible.value = true
    await nextTick()
    focusFirst()
    return
  }

  if (!visible.value) return
  closing.value = true
  closeTimer = setTimeout(() => {
    closing.value = false
    visible.value = false
  }, closeDelay())
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  // v-if ile zaten açık olarak mount edilen modallarda watch tetiklenmez;
  // kilidi ve odağı burada uygula. (Kapalıyken dokunmuyoruz — başka bir
  // modalın kilidini temizlememek için.)
  if (props.open) {
    document.body.style.overflow = 'hidden'
    await nextTick()
    focusFirst()
  }
})
onUnmounted(() => {
  clearTimeout(closeTimer)
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="rc-overlay"
      :class="{ 'rc-modal-closing': closing }"
      @click.self="emit('close')"
    >
      <div
        ref="modalRef"
        class="rc-modal"
        :class="{ 'rc-modal--wide': wide, 'rc-modal--xl': xl }"
        role="dialog"
        aria-modal="true"
        :aria-label="title ? undefined : 'Dialog'"
        :aria-labelledby="title ? titleId : undefined"
      >
        <div v-if="title || $slots.header" class="rc-modal__head">
          <slot name="header">
            <div class="rc-modal__heading">
              <span
                v-if="icon"
                class="rc-modal__badge"
                :class="`rc-modal__badge--${intent}`"
                aria-hidden="true"
              >
                <RcIcon :name="icon" :size="18" />
              </span>
              <div class="rc-modal__heading-text">
                <h2 :id="titleId" class="rc-modal__title">{{ title }}</h2>
                <div v-if="subtitle" class="rc-modal__sub">{{ subtitle }}</div>
              </div>
            </div>
          </slot>
          <button type="button" class="rc-modal__close" aria-label="Kapat" @click="emit('close')">
            <RcIcon name="close" />
          </button>
        </div>
        <div class="rc-modal__body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="rc-modal__foot">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
