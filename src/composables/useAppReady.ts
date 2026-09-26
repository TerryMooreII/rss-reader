import { ref, readonly } from 'vue'

/**
 * Flag flipped by AppLayout once feeds, groups, filters, tags and user settings
 * have loaded. Pages that need those (for titles, unreadOnly, hide rules) wait
 * on it instead of firing a first request with cached defaults.
 */
const ready = ref(false)

export function useAppReady() {
  return {
    ready: readonly(ready),
    markReady: () => {
      ready.value = true
    },
    resetReady: () => {
      ready.value = false
    },
  }
}
