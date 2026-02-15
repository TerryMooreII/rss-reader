import { ref, computed, onMounted, onUnmounted } from 'vue'

function formatTimeAgo(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diffMs = now - date

  if (diffMs < 0) return 'just now'

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 5) return `${weeks}w ago`
  if (months < 12) return `${months}mo ago`
  return `${years}y ago`
}

export function useTimeAgo(dateString: string) {
  // A tick counter that increments every minute to force re-evaluation
  const tick = ref(0)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const timeAgo = computed(() => {
    // Access tick to create a reactive dependency
    void tick.value
    return formatTimeAgo(dateString)
  })

  onMounted(() => {
    intervalId = setInterval(() => {
      tick.value++
    }, 60_000)
  })

  onUnmounted(() => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  })

  return timeAgo
}
