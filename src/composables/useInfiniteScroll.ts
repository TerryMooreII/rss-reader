import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function useInfiniteScroll(loadMore: () => Promise<void>) {
  const sentinel = ref<HTMLElement | null>(null)
  const isLoading = ref(false)
  let observer: IntersectionObserver | null = null

  function createObserver() {
    if (!sentinel.value) return

    observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0]!
        if (entry.isIntersecting && !isLoading.value) {
          isLoading.value = true
          try {
            await loadMore()
          } finally {
            isLoading.value = false
          }
        }
      },
      {
        rootMargin: '200px',
      }
    )

    observer.observe(sentinel.value)
  }

  function destroyObserver() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  onMounted(() => {
    createObserver()
  })

  onUnmounted(() => {
    destroyObserver()
  })

  return {
    sentinel: sentinel as Ref<HTMLElement | null>,
    isLoading,
  }
}
