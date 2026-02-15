import { ref, watch, onUnmounted } from 'vue'

export function useDebouncedSearch(callback: (query: string) => void) {
  const searchQuery = ref('')
  const isSearching = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function clearDebounce() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  watch(searchQuery, (newQuery) => {
    clearDebounce()

    if (!newQuery.trim()) {
      isSearching.value = false
      callback('')
      return
    }

    isSearching.value = true

    debounceTimer = setTimeout(() => {
      callback(newQuery.trim())
      isSearching.value = false
    }, 300)
  })

  onUnmounted(() => {
    clearDebounce()
  })

  return {
    searchQuery,
    isSearching,
  }
}
