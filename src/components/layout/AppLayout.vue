<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useFeedStore } from '@/stores/feeds'
import { useEntryStore } from '@/stores/entries'
import { useAuthStore } from '@/stores/auth'
import { useGroupStore } from '@/stores/groups'
import { useFilterStore } from '@/stores/filters'
import { useStarTagStore } from '@/stores/starTags'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useSwipe } from '@/composables/useSwipe'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useAppReady } from '@/composables/useAppReady'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import MobileNav from '@/components/layout/MobileNav.vue'
import ShortcutsDialog from '@/components/common/ShortcutsDialog.vue'

const route = useRoute()
const router = useRouter()
const ui = useUIStore()
const feedStore = useFeedStore()
const entryStore = useEntryStore()
const authStore = useAuthStore()
const groupStore = useGroupStore()
const filterStore = useFilterStore()
const starTagStore = useStarTagStore()
const { isMobile } = useBreakpoint()
const { markReady, resetReady } = useAppReady()

const sidebarRef = ref<InstanceType<typeof AppSidebar> | null>(null)
const sidebarEl = ref<HTMLElement | null>(null)
watch(sidebarRef, (comp) => (sidebarEl.value = comp?.$el ?? null), { immediate: true })

useSwipe({
  target: sidebarEl,
  direction: 'left',
  onSwipe: () => {
    if (isMobile.value) ui.closeSidebar()
  },
})

// Auto-open the sidebar when the viewport grows past the mobile breakpoint.
watch(isMobile, (mobile, wasMobile) => {
  if (wasMobile && !mobile && !ui.sidebarOpen) ui.toggleSidebar()
})

// Close the sidebar on mobile when the route changes.
watch(
  () => route.fullPath,
  () => {
    if (isMobile.value && ui.sidebarOpen) ui.closeSidebar()
  },
)

function focusSelectedEntry() {
  const id = entryStore.selectedEntryId
  if (!id) return
  const el = document.querySelector(`[data-entry-id="${id}"]`) as HTMLElement | null
  el?.focus({ preventScroll: true })
}

function openSelectedExternally() {
  const url = entryStore.selectedEntry?.url
  if (!url) return
  if (ui.openLinksInNewTab) window.open(url, '_blank')
  else window.location.href = url
}

useKeyboardShortcuts([
  { key: 'j', handler: () => { entryStore.selectNext(); requestAnimationFrame(focusSelectedEntry) }, description: 'Next entry' },
  { key: 'k', handler: () => { entryStore.selectPrevious(); requestAnimationFrame(focusSelectedEntry) }, description: 'Previous entry' },
  { key: 's', handler: () => { if (entryStore.selectedEntryId) entryStore.toggleStar(entryStore.selectedEntryId) }, description: 'Star/unstar' },
  { key: 'm', handler: () => { if (entryStore.selectedEntryId) entryStore.toggleRead(entryStore.selectedEntryId) }, description: 'Toggle read' },
  { key: 'o', handler: openSelectedExternally, description: 'Open in browser' },
  { key: 'Enter', handler: () => { if (entryStore.selectedEntryId) ui.openReader() }, description: 'Open reader' },
  { key: 'Escape', handler: () => { if (ui.searchOpen) ui.closeSearch(); else ui.closeReader() }, description: 'Close reader / search' },
  { key: '/', handler: () => ui.toggleSearch(), description: 'Focus search' },
  { key: '?', shift: true, handler: () => ui.toggleShortcutsDialog(), description: 'Show shortcuts' },
])

/** Everything the sidebar and entry pages depend on, in parallel. */
async function loadAppData() {
  const results = await Promise.allSettled([
    feedStore.fetchFeeds(),
    groupStore.fetchGroups(),
    filterStore.fetchFilters(),
    starTagStore.fetchTags(),
    ui.loadSettingsFromDB(authStore.user!.id),
  ])
  for (const r of results) {
    if (r.status === 'rejected') console.error('App data load failed:', r.reason)
  }
}

onMounted(async () => {
  await loadAppData()
  markReady()

  // New users with no feeds: send them to Discover instead of a blank "All" page
  if (feedStore.loaded && feedStore.feeds.length === 0 && route.name === 'all-entries') {
    router.replace({ name: 'discover' })
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('online', handleOnline)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('online', handleOnline)
  if (recoveryTimer) clearTimeout(recoveryTimer)
  resetReady()
})

// ---------------------------------------------------------------------------
// Tab-return recovery
// ---------------------------------------------------------------------------
// The Supabase JS client refreshes the access token itself when a backgrounded
// tab becomes visible. We never call refreshSession() (it races the library's
// handler). Instead: note when the tab hid; on return, wait for the library's
// TOKEN_REFRESHED (tokenRefreshCount) or a 2 s fallback, then re-fetch.
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
  if (hasErrors || hiddenMs > 5_000) scheduleRecovery()
  lastHiddenAt = 0
}

function handleOnline() {
  scheduleRecovery()
}

function scheduleRecovery() {
  if (pendingRecovery) return
  pendingRecovery = true
  recoveryTimer = setTimeout(() => {
    if (pendingRecovery) {
      pendingRecovery = false
      refetchAllData()
    }
  }, 2_000)
}

watch(
  () => authStore.tokenRefreshCount,
  () => {
    if (!pendingRecovery) return
    pendingRecovery = false
    if (recoveryTimer) {
      clearTimeout(recoveryTimer)
      recoveryTimer = null
    }
    refetchAllData()
  },
)

async function refetchAllData() {
  if (!authStore.session) return // session is dead; the auth guard will redirect
  await Promise.allSettled([
    feedStore.fetchFeeds(),
    groupStore.fetchGroups(),
    filterStore.fetchFilters(),
    starTagStore.fetchTags(),
    entryStore.silentRefresh(),
  ])
}
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to content</a>
  <div class="flex h-dvh overflow-hidden bg-bg-primary text-text-primary">
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
        ref="sidebarRef"
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

    <ShortcutsDialog />
  </div>
</template>
