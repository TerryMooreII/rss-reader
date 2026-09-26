import { ref } from 'vue'
import { useNotificationStore } from '@/stores/notifications'

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return fallback
}

/**
 * Wraps an async function with a `loading` flag and success / error toasts.
 *
 *   const { loading, run } = useAsyncAction()
 *   run(() => store.renameGroup(id, name), { success: 'Renamed', error: 'Rename failed' })
 */
export function useAsyncAction() {
  const loading = ref(false)
  const notifications = useNotificationStore()

  async function run<T>(
    fn: () => Promise<T>,
    messages: { success?: string | ((result: T) => string); error?: string } = {},
  ): Promise<T | undefined> {
    loading.value = true
    try {
      const result = await fn()
      if (messages.success) {
        notifications.success(
          typeof messages.success === 'function' ? messages.success(result) : messages.success,
        )
      }
      return result
    } catch (err) {
      notifications.error(errorMessage(err, messages.error ?? 'Something went wrong'))
      return undefined
    } finally {
      loading.value = false
    }
  }

  return { loading, run }
}
