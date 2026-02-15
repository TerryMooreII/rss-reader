import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import { PAGE_SIZE } from '@/config/constants'
import type { Entry, EntryFilter } from '@/types/models'
import { useFeedStore } from './feeds'
import { useAuthStore } from './auth'
import { useUIStore } from './ui'

const _ta = document.createElement('textarea')
function decodeHtml(s: string | null | undefined): string | null {
  if (!s) return s as null
  _ta.innerHTML = s
  return _ta.value
}

export const useEntryStore = defineStore('entries', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const entries = ref<Entry[]>([])
  const selectedEntryId = ref<string | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(false)
  const filter = ref<EntryFilter>({ type: 'all', unreadOnly: false })
  const error = ref<string | null>(null)

  // For search offset-based pagination
  let searchOffset = 0

  // Auto-mark-read timer handle
  let markReadTimer: ReturnType<typeof setTimeout> | null = null

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  const selectedEntry = computed(() => {
    if (!selectedEntryId.value) return null
    return entries.value.find((e) => e.id === selectedEntryId.value) ?? null
  })

  const selectedIndex = computed(() => {
    if (!selectedEntryId.value) return -1
    return entries.value.findIndex((e) => e.id === selectedEntryId.value)
  })

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function _getUserId(): string {
    const authStore = useAuthStore()
    return authStore.user!.id
  }

  /**
   * Calls the appropriate Supabase RPC based on the current filter.
   * Handles the different pagination styles per RPC.
   */
  async function _callRpc(
    f: EntryFilter,
    cursor?: { published_at: string; starred_at?: string | null; id: string },
  ): Promise<Entry[]> {
    const userId = _getUserId()

    let rpcName: string
    const params: Record<string, unknown> = { p_user_id: userId, p_limit: PAGE_SIZE }

    switch (f.type) {
      case 'feed':
        rpcName = 'get_feed_entries'
        params.p_feed_id = f.feedId
        params.p_unread_only = f.unreadOnly
        if (cursor) {
          params.p_cursor_published_at = cursor.published_at
          params.p_cursor_id = cursor.id
        }
        break

      case 'group':
        rpcName = 'get_group_entries'
        params.p_group_id = f.groupId
        params.p_unread_only = f.unreadOnly
        if (cursor) {
          params.p_cursor_published_at = cursor.published_at
          params.p_cursor_id = cursor.id
        }
        break

      case 'starred':
        rpcName = 'get_starred_entries'
        // starred uses p_cursor_starred_at, no p_unread_only
        if (cursor && cursor.starred_at) {
          params.p_cursor_starred_at = cursor.starred_at
          params.p_cursor_id = cursor.id
        }
        break

      case 'search':
        rpcName = 'search_entries'
        params.p_query = f.query
        // search uses offset-based pagination, no p_unread_only
        params.p_offset = searchOffset
        break

      case 'all':
      default:
        rpcName = 'get_all_entries'
        params.p_unread_only = f.unreadOnly
        if (cursor) {
          params.p_cursor_published_at = cursor.published_at
          params.p_cursor_id = cursor.id
        }
        break
    }

    const { data, error: rpcError } = await supabase.rpc(rpcName, params)

    if (rpcError) throw rpcError

    const rows = (data ?? []) as Entry[]
    for (const row of rows) {
      row.title = decodeHtml(row.title)
      row.feed_title = decodeHtml(row.feed_title)
    }
    return rows
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function fetchEntries(newFilter: EntryFilter): Promise<void> {
    loading.value = true
    error.value = null
    filter.value = newFilter
    entries.value = []
    selectedEntryId.value = null
    searchOffset = 0

    try {
      const rows = await _callRpc(newFilter)
      entries.value = rows
      hasMore.value = rows.length >= PAGE_SIZE
      if (newFilter.type === 'search') {
        searchOffset = rows.length
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch entries'
    } finally {
      loading.value = false
    }
  }

  async function fetchMore(): Promise<void> {
    if (loadingMore.value || !hasMore.value || entries.value.length === 0) return

    loadingMore.value = true
    error.value = null

    try {
      let rows: Entry[]

      if (filter.value.type === 'search') {
        // Offset-based for search
        rows = await _callRpc(filter.value)
      } else {
        // Cursor-based for everything else
        const lastEntry = entries.value[entries.value.length - 1]!
        const cursor = {
          published_at: lastEntry.published_at ?? lastEntry.created_at,
          starred_at: lastEntry.starred_at,
          id: lastEntry.id,
        }
        rows = await _callRpc(filter.value, cursor)
      }

      entries.value.push(...rows)
      hasMore.value = rows.length >= PAGE_SIZE
      if (filter.value.type === 'search') {
        searchOffset += rows.length
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load more entries'
    } finally {
      loadingMore.value = false
    }
  }

  async function markRead(entryId: string): Promise<void> {
    const entry = entries.value.find((e) => e.id === entryId)
    if (!entry || entry.read_at) return

    error.value = null

    try {
      const now = new Date().toISOString()
      const userId = _getUserId()

      const { error: upsertError } = await supabase
        .from('user_entry_status')
        .upsert(
          { user_id: userId, entry_id: entryId, read_at: now },
          { onConflict: 'user_id,entry_id' },
        )

      if (upsertError) throw upsertError

      entry.read_at = now

      const feedStore = useFeedStore()
      feedStore.updateUnreadCount(entry.feed_id, -1)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to mark entry as read'
    }
  }

  async function toggleRead(entryId: string): Promise<void> {
    const entry = entries.value.find((e) => e.id === entryId)
    if (!entry) return

    error.value = null

    try {
      const newReadAt = entry.read_at ? null : new Date().toISOString()
      const userId = _getUserId()

      const { error: upsertError } = await supabase
        .from('user_entry_status')
        .upsert(
          { user_id: userId, entry_id: entryId, read_at: newReadAt },
          { onConflict: 'user_id,entry_id' },
        )

      if (upsertError) throw upsertError

      const delta = entry.read_at ? 1 : -1
      entry.read_at = newReadAt

      const feedStore = useFeedStore()
      feedStore.updateUnreadCount(entry.feed_id, delta)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to toggle read status'
    }
  }

  async function toggleStar(entryId: string): Promise<void> {
    const entry = entries.value.find((e) => e.id === entryId)
    if (!entry) return

    error.value = null

    try {
      const newStarredAt = entry.starred_at ? null : new Date().toISOString()
      const userId = _getUserId()

      const { error: upsertError } = await supabase
        .from('user_entry_status')
        .upsert(
          { user_id: userId, entry_id: entryId, starred_at: newStarredAt },
          { onConflict: 'user_id,entry_id' },
        )

      if (upsertError) throw upsertError

      entry.starred_at = newStarredAt
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to toggle star'
    }
  }

  async function markAllRead(): Promise<void> {
    error.value = null

    try {
      const userId = _getUserId()
      const params: Record<string, unknown> = { p_user_id: userId }

      let rpcName: string

      switch (filter.value.type) {
        case 'feed':
          rpcName = 'mark_feed_as_read'
          params.p_feed_id = filter.value.feedId
          break
        case 'group':
          rpcName = 'mark_group_as_read'
          params.p_group_id = filter.value.groupId
          break
        default:
          rpcName = 'mark_all_as_read'
          break
      }

      const { error: rpcError } = await supabase.rpc(rpcName, params)
      if (rpcError) throw rpcError

      const now = new Date().toISOString()
      const feedStore = useFeedStore()

      for (const entry of entries.value) {
        if (!entry.read_at) {
          feedStore.updateUnreadCount(entry.feed_id, -1)
          entry.read_at = now
        }
      }
    } catch (err: unknown) {
      error.value =
        err instanceof Error ? err.message : 'Failed to mark all entries as read'
    }
  }

  function selectEntry(id: string | null): void {
    selectedEntryId.value = id

    if (markReadTimer) {
      clearTimeout(markReadTimer)
      markReadTimer = null
    }

    const ui = useUIStore()
    if (id) {
      ui.openReader()
      markReadTimer = setTimeout(() => {
        markRead(id)
      }, 1000)
    } else {
      ui.closeReader()
    }
  }

  function selectNext(): void {
    if (entries.value.length === 0) return

    const currentIndex = selectedIndex.value
    if (currentIndex < 0) {
      selectEntry(entries.value[0]!.id)
    } else if (currentIndex < entries.value.length - 1) {
      selectEntry(entries.value[currentIndex + 1]!.id)
    }
  }

  function selectPrevious(): void {
    if (entries.value.length === 0) return

    const currentIndex = selectedIndex.value
    if (currentIndex > 0) {
      selectEntry(entries.value[currentIndex - 1]!.id)
    }
  }

  return {
    // State
    entries,
    selectedEntryId,
    loading,
    loadingMore,
    hasMore,
    filter,
    error,
    // Getters
    selectedEntry,
    selectedIndex,
    // Actions
    fetchEntries,
    fetchMore,
    markRead,
    toggleRead,
    toggleStar,
    markAllRead,
    selectEntry,
    selectNext,
    selectPrevious,
  }
})
