import type { Directive, DirectiveBinding } from 'vue'

type ClickOutsideElement = HTMLElement & {
    clickOutsideEvent?: (event: Event) => void
}

export const clickOutside: Directive = {
    mounted(el: HTMLElement, binding: DirectiveBinding) {
        const node = el as ClickOutsideElement
        node.clickOutsideEvent = function (event: Event) {
            if (!(el === event.target || el.contains(event.target as Node))) {
                binding.value(event)
            }
        }
        document.addEventListener('click', node.clickOutsideEvent)
    },
    unmounted(el: HTMLElement) {
        const node = el as ClickOutsideElement
        if (node.clickOutsideEvent) {
            document.removeEventListener('click', node.clickOutsideEvent)
        }
    }
}
