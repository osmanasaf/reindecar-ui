import type { Directive, DirectiveBinding } from 'vue'

export const clickOutside: Directive = {
    mounted(el: HTMLElement, binding: DirectiveBinding) {
        el.clickOutsideEvent = function (event: Event) {
            if (!(el === event.target || el.contains(event.target as Node))) {
                binding.value(event)
            }
        }
        document.addEventListener('click', el.clickOutsideEvent)
    },
    unmounted(el: HTMLElement) {
        document.removeEventListener('click', el.clickOutsideEvent)
    }
}

declare module '@vue/runtime-core' {
    interface HTMLElement {
        clickOutsideEvent?: (event: Event) => void
    }
}
