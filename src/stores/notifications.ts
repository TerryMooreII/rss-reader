import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Toast } from '@/types/models'

const DEFAULT_DURATION = 5000

export const useNotificationStore = defineStore('notifications', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const toasts = ref<Toast[]>([])

  // Track active timers so we can cancel if dismissed early
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Generate a unique id for a toast.
   */
  function _generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Show a toast notification. Auto-dismisses after `duration` ms.
   */
  function show(toast: Omit<Toast, 'id'> & { id?: string }): string {
    const id = toast.id ?? _generateId()
    const duration = toast.duration ?? DEFAULT_DURATION

    const newToast: Toast = {
      id,
      type: toast.type,
      message: toast.message,
      duration,
    }

    toasts.value.push(newToast)

    // Auto-dismiss
    const timer = setTimeout(() => {
      dismiss(id)
    }, duration)
    timers.set(id, timer)

    return id
  }

  /**
   * Dismiss a toast by its id.
   */
  function dismiss(id: string): void {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }

    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /**
   * Shorthand: show a success toast.
   */
  function success(message: string, duration?: number): string {
    return show({ type: 'success', message, duration })
  }

  /**
   * Shorthand: show an error toast.
   */
  function error(message: string, duration?: number): string {
    return show({ type: 'error', message, duration })
  }

  /**
   * Shorthand: show an info toast.
   */
  function info(message: string, duration?: number): string {
    return show({ type: 'info', message, duration })
  }

  return {
    // State
    toasts,
    // Actions
    show,
    dismiss,
    success,
    error,
    info,
  }
})
