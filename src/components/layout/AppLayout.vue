<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useFeedStore } from '@/stores/feeds'
import { useEntryStore } from '@/stores/entries'
import { useAuthStore } from '@/stores/auth'
import { useGroupStore } from '@/stores/groups'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import MobileNav from '@/components/layout/MobileNav.vue'

const route = useRoute()
const ui = useUIStore()
const feedStore = useFeedStore()
const entryStore = useEntryStore()
const authStore = useAuthStore()
const groupStore = useGroupStore()

const isMobile = ref(window.innerWidth < 768)

function onResize() {
  const wasMobile = isMobile.value
  isMobile.value = window.innerWidth < 768

  // Auto-open sidebar when crossing from mobile to desktop
  if (wasMobile && !isMobile.value && !ui.sidebarOpen) {
    ui.toggleSidebar()
  }
}

// Close sidebar on mobile when route changes
watch(
  () => route.fullPath,
  () => {
    if (isMobile.value && ui.sidebarOpen) {
      ui.closeSidebar()
    }
  },
)

function focusSelectedEntry() {
  const id = entryStore.selectedEntryId
  if (!id) return
  const el = document.querySelector(`[data-entry-id="${id}"]`) as HTMLElement | null
  el?.focus({ preventScroll: true })
}

useKeyboardShortcuts([
  { key: 'j', handler: () => { entryStore.selectNext(); requestAnimationFrame(focusSelectedEntry) }, description: 'Next entry' },
  { key: 'k', handler: () => { entryStore.selectPrevious(); requestAnimationFrame(focusSelectedEntry) }, description: 'Previous entry' },
  {
    key: 's',
    handler: () => {
      if (entryStore.selectedEntryId) entryStore.toggleStar(entryStore.selectedEntryId)
    },
    description: 'Star/unstar',
  },
  {
    key: 'm',
    handler: () => {
      if (entryStore.selectedEntryId) entryStore.toggleRead(entryStore.selectedEntryId)
    },
    description: 'Toggle read',
  },
  {
    key: 'o',
    handler: () => {
      const entry = entryStore.selectedEntry
      if (entry?.url) window.open(entry.url, '_blank')
    },
    description: 'Open in browser',
  },
  {
    key: 'Enter',
    handler: () => {
      if (entryStore.selectedEntryId) ui.openReader()
    },
    description: 'Open reader',
  },
  { key: 'Escape', handler: () => ui.closeReader(), description: 'Close reader' },
  { key: '/', handler: () => ui.toggleSearch(), description: 'Focus search' },
  {
    key: '?',
    shift: true,
    handler: () => ui.toggleShortcutsDialog(),
    description: 'Show shortcuts',
  },
])

onMounted(async () => {
  await Promise.all([feedStore.fetchFeeds(), groupStore.fetchGroups()])
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('online', handleOnline)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('resize', onResize)
})

// ---------------------------------------------------------------------------
// Tab-return recovery
// ---------------------------------------------------------------------------
// The Supabase JS client has its own visibilitychange handler that refreshes
// the access token when a backgrounded tab becomes visible.  We must NOT call
// refreshSession() ourselves — that races with the library's handler and can
// fail when the refresh token has already been consumed.
//
// Instead we:
//  1. Note when the tab is hidden.
//  2. When visible again, arm a pending recovery.
//  3. If the auth store's tokenRefreshCount increments (meaning the library
//     successfully refreshed the token), we immediately re-fetch app data.
//  4. As a fallback (e.g. the token was still valid so no refresh fires),
//     a 2-second timeout triggers the re-fetch anyway.
// ---------------------------------------------------------------------------
let lastHiddenAt = 0
let pendingRecovery = false
let recoveryTimer: ReturnType<typeof setTimeout> | null = null

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    lastHiddenAt = Date.now()
    return
  }

  const hiddenMs = lastHiddenAt > 0 ? Date.now() - lastHiddenAt : 0
  const hasErrors = !!feedStore.error || !!entryStore.error
  const staleEnough = hiddenMs > 5_000

  if (hasErrors || staleEnough) {
    scheduleRecovery()
  }
  lastHiddenAt = 0
}

function handleOnline() {
  scheduleRecovery()
}

function scheduleRecovery() {
  if (pendingRecovery) return
  pendingRecovery = true

  // Fallback: if TOKEN_REFRESHED doesn't fire within 2 s (token was still
  // valid), re-fetch anyway so the UI gets fresh data.
  recoveryTimer = setTimeout(() => {
    if (pendingRecovery) {
      pendingRecovery = false
      refetchAllData()
    }
  }, 2_000)
}

// When the Supabase library finishes refreshing the token it fires
// TOKEN_REFRESHED, which increments tokenRefreshCount.  React immediately
// instead of waiting for the timeout.
watch(
  () => authStore.tokenRefreshCount,
  () => {
    if (pendingRecovery) {
      pendingRecovery = false
      if (recoveryTimer) {
        clearTimeout(recoveryTimer)
        recoveryTimer = null
      }
      refetchAllData()
    }
  },
)

async function refetchAllData() {
  if (!authStore.session) return // session is dead — auth guard will redirect

  try {
    await Promise.all([
      feedStore.fetchFeeds(),
      groupStore.fetchGroups(),
      entryStore.silentRefresh(),
    ])
  } catch {
    // Recovery is best-effort; errors surface in individual stores
  }
}
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to content</a>
  <div class="flex h-screen overflow-hidden bg-bg-primary text-text-primary">
    <!-- Sidebar overlay on mobile -->
    <div
      v-if="ui.sidebarOpen && isMobile"
      class="fixed inset-0 z-30 bg-black/50 md:hidden"
      aria-hidden="true"
      @click="ui.toggleSidebar()"
    />

    <!-- Sidebar -->
    <Transition name="slide-left">
      <AppSidebar
        v-show="ui.sidebarOpen"
        class="fixed z-40 h-full md:static md:z-auto"
        :class="[ui.sidebarOpen ? 'w-64' : 'w-0']"
      />
    </Transition>

    <!-- Main content -->
    <main id="main-content" class="flex flex-1 flex-col min-w-0">
      <RouterView />
    </main>

    <!-- Mobile bottom nav -->
    <MobileNav class="md:hidden" />
  </div>
</template>
