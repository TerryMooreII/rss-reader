import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/config/supabase'
import router from '@/router'
import type { UserProfile } from '@/types/models'

export const useAuthStore = defineStore('auth', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const user = ref<User | null>(null)
  const profile = ref<UserProfile | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)

  // Incremented whenever the auth token is refreshed (e.g. after returning to a
  // backgrounded tab). Other stores/components can watch this to re-fetch data.
  const tokenRefreshCount = ref(0)

  // Promise that resolves once initialize() has completed.
  // The router guard awaits this to avoid race conditions.
  let _resolveInit!: () => void
  const initPromise = new Promise<void>((resolve) => {
    _resolveInit = resolve
  })

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const displayName = computed(() => {
    if (!profile.value) return ''
    if (profile.value.first_name || profile.value.last_name) {
      return [profile.value.first_name, profile.value.last_name]
        .filter(Boolean)
        .join(' ')
    }
    return profile.value.handle || profile.value.email || ''
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Check for an existing session and set up the auth state change listener.
   * Should be called once at app startup.
   */
  async function initialize(): Promise<void> {
    if (initialized.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      if (data.session) {
        session.value = data.session
        user.value = data.session.user
        await fetchProfile()
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize auth'
    } finally {
      loading.value = false
      initialized.value = true
      _resolveInit()
    }

    // Listen for subsequent auth events
    //
    // IMPORTANT: This callback can be invoked while Supabase's internal auth
    // lock is held (e.g. during _recoverAndRefresh on tab return).  Any
    // Supabase API call we make here goes through getSession() which tries to
    // acquire the same lock.  The re-entrant queue waits for the outer
    // operation, creating a deadlock.
    //
    // To avoid this, NEVER await Supabase calls inside this callback.
    // Fire-and-forget (or defer to a microtask) instead.
    supabase.auth.onAuthStateChange((event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null

      if (event === 'SIGNED_IN' && newSession?.user) {
        // Defer to avoid deadlock with the auth lock
        queueMicrotask(() => {
          fetchProfile()
        })
      }

      if (event === 'SIGNED_OUT') {
        profile.value = null
      }

      if (event === 'TOKEN_REFRESHED') {
        tokenRefreshCount.value++
      }
    })
  }

  /**
   * Returns a promise that resolves once initialize() has finished.
   * Used by the router guard to wait for session restoration.
   */
  function untilReady(): Promise<void> {
    return initPromise
  }

  /**
   * Sign in with email and password.
   */
  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Register a new user with email, password, and profile metadata.
   */
  async function register(data: {
    email: string
    password: string
    first_name: string
    last_name: string
    handle: string
  }): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
            handle: data.handle,
          },
        },
      })

      if (signUpError) throw signUpError
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign out the current user.
   */
  async function logout(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError

      user.value = null
      profile.value = null
      session.value = null
      router.push({ name: 'marketing' })
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Logout failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Send a password reset email.
   */
  async function resetPassword(email: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) throw resetError
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Password reset failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch the current user's profile from the profiles table.
   */
  async function fetchProfile(): Promise<void> {
    if (!user.value) return

    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (profileError) throw profileError

      profile.value = data as UserProfile
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch profile'
    }
  }

  /**
   * Update the current user's profile.
   */
  async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.value.id)

      if (updateError) throw updateError

      // Merge updates into the local profile
      if (profile.value) {
        profile.value = { ...profile.value, ...updates }
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to update profile'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    user,
    profile,
    session,
    loading,
    initialized,
    error,
    tokenRefreshCount,
    // Getters
    isAuthenticated,
    isAdmin,
    displayName,
    // Actions
    initialize,
    untilReady,
    login,
    register,
    logout,
    resetPassword,
    fetchProfile,
    updateProfile,
  }
})
