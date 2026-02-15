import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ---------------------------------------------------------------------------
// Custom fetch with timeout
// ---------------------------------------------------------------------------
// After a tab is backgrounded, the browser may keep stale TCP connections.
// When the tab becomes visible the Supabase auth library tries to refresh the
// token over one of those stale connections.  That request can hang, which
// holds an internal Web Lock and blocks **every** subsequent API call
// (they all call getSession() which waits on the same lock).
//
// A fetch timeout ensures stale requests fail fast so the lock is released and
// the auto-refresh timer can retry on a fresh connection.
// ---------------------------------------------------------------------------
const FETCH_TIMEOUT_MS = 15_000

const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  // Combine with any existing signal
  const existingSignal = init?.signal
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort())
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id))
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: fetchWithTimeout,
  },
})
