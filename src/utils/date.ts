import { ref } from 'vue'

/**
 * A single shared "now" that ticks once a minute. Components read it inside a
 * computed so relative timestamps stay fresh without one timer per row.
 */
export const now = ref(Date.now())
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    now.value = Date.now()
  }, 60_000)
}

/** Relative time such as "5m ago", "3h ago", "2d ago", "4mo ago". */
export function formatTimeAgo(dateString: string | null | undefined, nowMs = now.value): string {
  if (!dateString) return ''
  const diff = nowMs - new Date(dateString).getTime()
  if (diff < 60_000) return 'just now'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

/** Absolute date and time in the reader's locale, e.g. "March 4, 2026, 1:20 PM". */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Short absolute date and time, e.g. "3/4/2026, 1:20 PM". */
export function formatShortDateTime(dateString: string | null | undefined, fallback = 'Never'): string {
  if (!dateString) return fallback
  return new Date(dateString).toLocaleString()
}
