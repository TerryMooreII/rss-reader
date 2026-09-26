import { watch, onUnmounted, type Ref } from 'vue'

/**
 * Calls `handler` when a click lands outside `target`.
 *
 * The document listener is attached only while `active` is true, so a page
 * with hundreds of potential menus registers zero listeners until one opens.
 */
export function useClickOutside(
  target: Ref<HTMLElement | null>,
  handler: (event: MouseEvent) => void,
  active: Ref<boolean>,
) {
  function onDocClick(e: MouseEvent) {
    const el = target.value
    if (el && el.contains(e.target as Node)) return
    handler(e)
  }

  let attached = false
  function attach() {
    if (attached) return
    attached = true
    // Defer so the click that opened the menu is not treated as "outside".
    setTimeout(() => {
      if (attached) document.addEventListener('click', onDocClick)
    }, 0)
  }
  function detach() {
    if (!attached) return
    attached = false
    document.removeEventListener('click', onDocClick)
  }

  watch(active, (isActive) => (isActive ? attach() : detach()), { immediate: true })
  onUnmounted(detach)
}
