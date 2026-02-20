import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { Entry, EntryFilter } from '@/types/models'
import { useFeedStore } from './feeds'
import { useGroupStore } from './groups'
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

  // Page-based pagination state
  const currentPage = ref(1)
  // Stores the cursor needed to fetch each page (index 0 = page 1 = no cursor)
  const pageCursors: Array<{ published_at: string; starred_at?: string | null; id: string } | null> = [null]

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

  const hasPrevious = computed(() => currentPage.value > 1)

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
    const ui = useUIStore()
    const limit = ui.entriesPerPage

    let rpcName: string
    const params: Record<string, unknown> = { p_user_id: userId, p_limit: limit }

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

      case 'category':
        rpcName = 'get_category_entries'
        params.p_category = f.category
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
    const ui = useUIStore()
    loading.value = true
    error.value = null
    filter.value = newFilter
    entries.value = []
    selectedEntryId.value = null
    searchOffset = 0
    currentPage.value = 1
    pageCursors.length = 1
    pageCursors[0] = null

    try {
      const rows = await _callRpc(newFilter)
      entries.value = rows
      hasMore.value = rows.length >= ui.entriesPerPage
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

      const ui = useUIStore()
      entries.value.push(...rows)
      hasMore.value = rows.length >= ui.entriesPerPage
      if (filter.value.type === 'search') {
        searchOffset += rows.length
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load more entries'
    } finally {
      loadingMore.value = false
    }
  }

  async function fetchPage(direction: 'next' | 'prev'): Promise<void> {
    const ui = useUIStore()

    if (direction === 'next' && !hasMore.value) return
    if (direction === 'prev' && currentPage.value <= 1) return

    loading.value = true
    error.value = null
    selectedEntryId.value = null

    try {
      if (direction === 'next') {
        // Save the cursor for the next page
        const lastEntry = entries.value[entries.value.length - 1]!
        const nextCursor = {
          published_at: lastEntry.published_at ?? lastEntry.created_at,
          starred_at: lastEntry.starred_at,
          id: lastEntry.id,
        }
        currentPage.value++
        pageCursors[currentPage.value - 1] = nextCursor

        if (filter.value.type === 'search') {
          searchOffset = (currentPage.value - 1) * ui.entriesPerPage
          const rows = await _callRpc(filter.value)
          entries.value = rows
          hasMore.value = rows.length >= ui.entriesPerPage
        } else {
          const rows = await _callRpc(filter.value, nextCursor)
          entries.value = rows
          hasMore.value = rows.length >= ui.entriesPerPage
        }
      } else {
        // Go to previous page using saved cursor
        currentPage.value--
        const cursor = pageCursors[currentPage.value - 1] ?? undefined

        if (filter.value.type === 'search') {
          searchOffset = (currentPage.value - 1) * ui.entriesPerPage
          const rows = await _callRpc(filter.value)
          entries.value = rows
          hasMore.value = rows.length >= ui.entriesPerPage
        } else {
          const rows = await _callRpc(filter.value, cursor ?? undefined)
          entries.value = rows
          hasMore.value = rows.length >= ui.entriesPerPage
        }
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load page'
    } finally {
      loading.value = false
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
      feedStore.updateCategoryUnreadCount(entry.feed_id, -1)
      const groupStore = useGroupStore()
      groupStore.updateUnreadCountForFeed(entry.feed_id, -1)
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
      feedStore.updateCategoryUnreadCount(entry.feed_id, delta)
      const groupStore = useGroupStore()
      groupStore.updateUnreadCountForFeed(entry.feed_id, delta)
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
        case 'category':
          rpcName = 'mark_category_as_read'
          params.p_category = filter.value.category
          break
        default:
          rpcName = 'mark_all_as_read'
          break
      }

      const { error: rpcError } = await supabase.rpc(rpcName, params)
      if (rpcError) throw rpcError

      const now = new Date().toISOString()
      const feedStore = useFeedStore()
      const groupStore = useGroupStore()

      for (const entry of entries.value) {
        if (!entry.read_at) {
          feedStore.updateUnreadCount(entry.feed_id, -1)
          feedStore.updateCategoryUnreadCount(entry.feed_id, -1)
          groupStore.updateUnreadCountForFeed(entry.feed_id, -1)
          entry.read_at = now
        }
      }
    } catch (err: unknown) {
      error.value =
        err instanceof Error ? err.message : 'Failed to mark all entries as read'
    }
  }

  async function markFeedAsRead(feedId: string): Promise<void> {
    try {
      const userId = _getUserId()
      const { error: rpcError } = await supabase.rpc('mark_feed_as_read', {
        p_user_id: userId,
        p_feed_id: feedId,
      })
      if (rpcError) throw rpcError

      const feedStore = useFeedStore()
      const oldCount = feedStore.feedById(feedId)?.unread_count ?? 0
      feedStore.updateUnreadCount(feedId, -oldCount)
      feedStore.updateCategoryUnreadCount(feedId, -oldCount)
      const groupStore = useGroupStore()
      groupStore.updateUnreadCountForFeed(feedId, -oldCount)

      // Update any visible entries belonging to this feed
      const now = new Date().toISOString()
      for (const entry of entries.value) {
        if (entry.feed_id === feedId && !entry.read_at) entry.read_at = now
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to mark feed as read'
    }
  }

  async function markGroupAsRead(groupId: string): Promise<void> {
    try {
      const userId = _getUserId()
      const { error: rpcError } = await supabase.rpc('mark_group_as_read', {
        p_user_id: userId,
        p_group_id: groupId,
      })
      if (rpcError) throw rpcError

      const feedStore = useFeedStore()
      const groupStore = useGroupStore()
      const feedIds = groupStore.feedsByGroup(groupId)
      for (const fid of feedIds) {
        const oldCount = feedStore.feedById(fid)?.unread_count ?? 0
        feedStore.updateUnreadCount(fid, -oldCount)
        feedStore.updateCategoryUnreadCount(fid, -oldCount)
      }

      // Update group unread count locally
      const group = groupStore.groups.find((g) => g.id === groupId)
      if (group) group.unread_count = 0

      // Update any visible entries belonging to feeds in this group
      const feedIdSet = new Set(feedIds)
      const now = new Date().toISOString()
      for (const entry of entries.value) {
        if (feedIdSet.has(entry.feed_id) && !entry.read_at) entry.read_at = now
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to mark group as read'
    }
  }

  async function markCategoryAsRead(category: string): Promise<void> {
    try {
      const userId = _getUserId()
      const { error: rpcError } = await supabase.rpc('mark_category_as_read', {
        p_user_id: userId,
        p_category: category,
      })
      if (rpcError) throw rpcError

      const feedStore = useFeedStore()
      const groupStore = useGroupStore()
      const feedsInCat = feedStore.feedsByCategory.get(category) ?? []
      for (const feed of feedsInCat) {
        groupStore.updateUnreadCountForFeed(feed.id, -feed.unread_count)
        feedStore.updateUnreadCount(feed.id, -feed.unread_count)
      }
      feedStore.categoryUnreadCounts.set(category, 0)

      // Update any visible entries belonging to feeds in this category
      const feedIdSet = new Set(feedsInCat.map((f) => f.id))
      const now = new Date().toISOString()
      for (const entry of entries.value) {
        if (feedIdSet.has(entry.feed_id) && !entry.read_at) entry.read_at = now
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to mark category as read'
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

  /**
   * Re-fetches the current page of entries without clearing the list or
   * resetting scroll position. Used for background refresh (e.g. tab return).
   */
  async function silentRefresh(): Promise<void> {
    if (loading.value || loadingMore.value) return

    const ui = useUIStore()

    // Skip when reader is open — mutating entries risks orphaning the selected article
    if (ui.readerOpen && selectedEntryId.value) return

    try {
      const isInfinite = ui.paginationMode === 'infinite'
      const isSearch = filter.value.type === 'search'

      if (isInfinite && !isSearch && entries.value.length > 0) {
        // Merge page-1 results into the existing infinite-scroll array
        const rows = await _callRpc(filter.value, undefined)
        const existing = new Map(entries.value.map((e) => [e.id, e]))

        const newEntries: Entry[] = []
        for (const row of rows) {
          const old = existing.get(row.id)
          if (old) {
            old.read_at = row.read_at
            old.starred_at = row.starred_at
          } else {
            newEntries.push(row)
          }
        }

        if (newEntries.length > 0) {
          entries.value.unshift(...newEntries)
        }
        // Leave hasMore unchanged — the tail of the array hasn't changed
      } else {
        // Paginated mode, search, or empty array — replace entirely (current behavior)
        const cursor = pageCursors[currentPage.value - 1] ?? undefined

        if (isSearch) {
          searchOffset = (currentPage.value - 1) * ui.entriesPerPage
        }

        const rows = await _callRpc(filter.value, cursor)
        entries.value = rows
        hasMore.value = rows.length >= ui.entriesPerPage

        if (isSearch) {
          searchOffset = (currentPage.value - 1) * ui.entriesPerPage + rows.length
        }
      }
    } catch {
      // Silent refresh is best-effort; don't overwrite existing error state
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
    currentPage,
    // Getters
    selectedEntry,
    selectedIndex,
    hasPrevious,
    // Actions
    fetchEntries,
    fetchMore,
    fetchPage,
    markRead,
    toggleRead,
    toggleStar,
    markAllRead,
    markFeedAsRead,
    markGroupAsRead,
    markCategoryAsRead,
    silentRefresh,
    selectEntry,
    selectNext,
    selectPrevious,
  }
})
