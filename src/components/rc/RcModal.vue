<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RcIcon } from '@/components/icons'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  subtitle?: string
  wide?: boolean
  xl?: boolean
}>(), {
  wide: false,
  xl: false,
})

const emit = defineEmits<{ close: [] }>()

const modalRef = ref<HTMLElement | null>(null)
const titleId = `rc-modal-title-${Math.random().toString(36).slice(2, 9)}`

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

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
  trapFocus(e)
}

watch(() => props.open, async (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
  if (isOpen) {
    await nextTick()
    focusFirst()
  }
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="rc-overlay" @click.self="emit('close')">
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
            <div>
              <h2 :id="titleId" class="rc-modal__title">{{ title }}</h2>
              <div v-if="subtitle" class="rc-modal__sub">{{ subtitle }}</div>
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
