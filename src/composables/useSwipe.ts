import { watch, onUnmounted, type Ref } from 'vue'

type SwipeDirection = 'left' | 'right'

interface UseSwipeOptions {
  /** Element ref to attach touch listeners to */
  target: Ref<HTMLElement | null | undefined>
  /** Swipe direction to detect */
  direction: SwipeDirection
  /** Callback when swipe is detected */
  onSwipe: () => void
  /** Minimum horizontal distance in px (default: 50) */
  threshold?: number
}

/**
 * Detects horizontal swipe gestures on a target element.
 * Only fires when horizontal movement exceeds vertical (avoids scroll conflicts).
 */
export function useSwipe({ target, direction, onSwipe, threshold = 50 }: UseSwipeOptions) {
  let startX = 0
  let startY = 0
  let currentEl: HTMLElement | null = null

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
  }

  function onTouchEnd(e: TouchEvent) {
    const touch = e.changedTouches[0]
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY

    // Only trigger if horizontal movement is dominant
    if (Math.abs(dx) < Math.abs(dy)) return
    if (Math.abs(dx) < threshold) return

    if (direction === 'left' && dx < 0) onSwipe()
    if (direction === 'right' && dx > 0) onSwipe()
  }

  function attach(el: HTMLElement) {
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    currentEl = el
  }

  function detach() {
    if (!currentEl) return
    currentEl.removeEventListener('touchstart', onTouchStart)
    currentEl.removeEventListener('touchend', onTouchEnd)
    currentEl = null
  }

  watch(
    target,
    (el) => {
      detach()
      if (el) attach(el)
    },
    { immediate: true },
  )

  onUnmounted(detach)
}
