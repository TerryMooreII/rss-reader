import type { NavigationGuardWithThis } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const authGuard: NavigationGuardWithThis<undefined> = async (to) => {
  const auth = useAuthStore()

  // Wait for the auth store to finish restoring the session from storage.
  // Without this, a page refresh would see isAuthenticated === false before
  // the Supabase session has been read from localStorage.
  await auth.untilReady()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'all-entries' }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'all-entries' }
  }
}
