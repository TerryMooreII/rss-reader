import { ref } from 'vue'

const mobileQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null

/** True below Tailwind's `md` breakpoint. Shared across all callers. */
const isMobile = ref(mobileQuery?.matches ?? false)
mobileQuery?.addEventListener('change', (e) => {
  isMobile.value = e.matches
})

export function useBreakpoint() {
  return { isMobile }
}
