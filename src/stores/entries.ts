import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { Entry, EntryFilter, ContentFilter } from '@/types/models'
import { decodeHtml, stripHtml, truncate } from '@/utils/html'
import { compileWebSearchQuery } from '@/utils/webSearchMatch'
import { useFeedStore } from './feeds'
import { useGroupStore } from './groups'
import { useStarTagStore } from './starTags'
import { useAuthStore } from './auth'
import { useUIStore } from './ui'
import { useFilterStore } from './filters'

type Cursor = { published_at: string; id: string }

const STATUS_FLUSH_DELAY = 400
const MARK_READ_DELAY = 1000

/** RPC name and extra params for each filter type. */
function rpcFor(f: EntryFilter): { name: string; params: Record<string, unknown>; paged: 'cursor' | 'offset' } {
  switch (f.type) {
    case 'feed':
      return { name: 'get_feed_entries', params: { p_feed_id: f.feedId, p_unread_only: f.unreadOnly }, paged: 'cursor' }
    case 'group':
      return { name: 'get_group_entries', params: { p_group_id: f.groupId, p_unread_only: f.unreadOnly }, paged: 'cursor' }
    case 'category':
      return { name: 'get_category_entries', params: { p_category: f.category, p_unread_only: f.unreadOnly }, paged: 'cursor' }
    case 'starred':
      return { name: 'get_starred_entries', params: {}, paged: 'cursor' }
    case 'star_tag':
      return { name: 'get_starred_entries_by_tag', params: { p_star_tag_id: f.starTagId }, paged: 'cursor' }
    case 'search':
      return { name: f.scope === 'all' ? 'search_all_entries' : 'search_entries', params: { p_query: f.query }, paged: 'offset' }
    case 'all':
    default:
      return { name: 'get_all_entries', params: { p_unread_only: f.unreadOnly }, paged: 'cursor' }
  }
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
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
  const markingAllRead = ref(false)
  const currentPage = ref(1)

  /** Incremented by every list-replacing fetch; stale responses compare against it and bail. */
  let fetchSeq = 0
  let searchOffset = 0
  /** Cursor that produced each page (index 0 = page 1 = no cursor). */
  const pageCursors: Array<Cursor | null> = [null]
  let markReadTimer: ReturnType<typeof setTimeout> | null = null

  // ---------------------------------------------------------------------------
  // Keyword filters
  // ---------------------------------------------------------------------------
  const _predicates = new Map<string, (text: string) => boolean>()

  function _predicate(keyword: string): (text: string) => boolean {
    let pred = _predicates.get(keyword)
    if (!pred) {
      pred = compileWebSearchQuery(keyword)
      _predicates.set(keyword, pred)
    }
    return pred
  }

  function _ruleMatches(rule: ContentFilter, entry: Entry): boolean {
    if (rule.scope_type === 'feed' && rule.scope_id !== entry.feed_id) return false
    if (rule.scope_type === 'group' && !useGroupStore().isFeedInGroup(rule.scope_id!, entry.feed_id)) return false
    const pred = _predicate(rule.keyword)
    return pred(entry.title ?? '') || pred(entry.plain_text)
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  const filteredEntries = computed(() => {
    const rules = useFilterStore().hideRules
    if (rules.length === 0) return entries.value
    return entries.value.filter((e) => e.starred_at || !rules.some((r) => _ruleMatches(r, e)))
  })

  const entryMap = computed(() => new Map(entries.value.map((e) => [e.id, e])))

  const selectedEntry = computed(() =>
    selectedEntryId.value ? (filteredEntries.value.find((e) => e.id === selectedEntryId.value) ?? null) : null,
  )

  const selectedIndex = computed(() =>
    selectedEntryId.value ? filteredEntries.value.findIndex((e) => e.id === selectedEntryId.value) : -1,
  )

  const hasPrevious = computed(() => currentPage.value > 1)
  const searchQuery = computed(() => (filter.value.type === 'search' ? filter.value.query : ''))
  const supportsUnreadToggle = computed(() =>
    filter.value.type === 'all' || filter.value.type === 'feed' || filter.value.type === 'group' || filter.value.type === 'category',
  )
  const supportsMarkAllRead = supportsUnreadToggle

  // ---------------------------------------------------------------------------
  // Fetching
  // ---------------------------------------------------------------------------
  function _userId(): string {
    return useAuthStore().user!.id
  }

  function _pageSize(): number {
    return useUIStore().entriesPerPage
  }

  async function _callRpc(f: EntryFilter, cursor?: Cursor): Promise<Entry[]> {
    const { name, params, paged } = rpcFor(f)
    const body: Record<string, unknown> = { p_user_id: _userId(), p_limit: _pageSize(), ...params }
    if (paged === 'offset') body.p_offset = searchOffset
    else if (cursor) {
      body.p_cursor_published_at = cursor.published_at
      body.p_cursor_id = cursor.id
    }

    const { data, error: rpcError } = await supabase.rpc(name, body)
    if (rpcError) throw rpcError

    const rows = (data ?? []) as Entry[]
    for (const row of rows) {
      row.title = decodeHtml(row.title)
      row.feed_title = decodeHtml(row.feed_title)
      row.plain_text = stripHtml(row.content_html)
      row.excerpt = truncate(stripHtml(row.summary) || row.plain_text, 500)
    }
    return rows
  }

  function _cursorAfter(list: Entry[]): Cursor | undefined {
    const last = list[list.length - 1]
    return last ? { published_at: last.published_at, id: last.id } : undefined
  }

  async function fetchEntries(newFilter: EntryFilter): Promise<void> {
    const seq = ++fetchSeq
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
      if (seq !== fetchSeq) return
      entries.value = rows
      hasMore.value = rows.length >= _pageSize()
      if (newFilter.type === 'search') searchOffset = rows.length
      _autoApplyFilters(rows)
    } catch (err: unknown) {
      if (seq === fetchSeq) error.value = errorText(err, 'Failed to fetch entries')
    } finally {
      if (seq === fetchSeq) loading.value = false
    }
  }

  /** Re-run the current filter with a different unread setting (list-type permitting). */
  async function setUnreadOnly(unreadOnly: boolean): Promise<void> {
    const f = filter.value
    if (f.type === 'all' || f.type === 'feed' || f.type === 'group' || f.type === 'category') {
      await fetchEntries({ ...f, unreadOnly })
    }
  }

  async function refresh(): Promise<void> {
    await fetchEntries(filter.value)
  }

  async function fetchMore(): Promise<void> {
    if (loadingMore.value || !hasMore.value || entries.value.length === 0) return
    const seq = fetchSeq
    loadingMore.value = true
    error.value = null

    try {
      const rows = await _callRpc(filter.value, _cursorAfter(entries.value))
      if (seq !== fetchSeq) return
      entries.value.push(...rows)
      hasMore.value = rows.length >= _pageSize()
      if (filter.value.type === 'search') searchOffset += rows.length
      _autoApplyFilters(rows)
    } catch (err: unknown) {
      if (seq === fetchSeq) error.value = errorText(err, 'Failed to load more entries')
    } finally {
      if (seq === fetchSeq) loadingMore.value = false
    }
  }

  async function fetchPage(direction: 'next' | 'prev'): Promise<void> {
    if (direction === 'next' && !hasMore.value) return
    if (direction === 'prev' && currentPage.value <= 1) return

    const seq = ++fetchSeq
    loading.value = true
    error.value = null
    selectedEntryId.value = null

    try {
      let cursor: Cursor | undefined
      if (direction === 'next') {
        cursor = _cursorAfter(entries.value)
        currentPage.value++
        pageCursors[currentPage.value - 1] = cursor ?? null
      } else {
        currentPage.value--
        cursor = pageCursors[currentPage.value - 1] ?? undefined
      }
      if (filter.value.type === 'search') searchOffset = (currentPage.value - 1) * _pageSize()

      const rows = await _callRpc(filter.value, cursor)
      if (seq !== fetchSeq) return
      entries.value = rows
      hasMore.value = rows.length >= _pageSize()
      _autoApplyFilters(rows)
    } catch (err: unknown) {
      if (seq === fetchSeq) error.value = errorText(err, 'Failed to load page')
    } finally {
      if (seq === fetchSeq) loading.value = false
    }
  }

  /**
   * Re-fetch the current page without clearing the list or scroll position
   * (tab return, reconnect). In infinite mode new rows are merged in at the top.
   */
  async function silentRefresh(): Promise<void> {
    if (loading.value || loadingMore.value) return
    const ui = useUIStore()
    if (ui.readerOpen && selectedEntryId.value) return

    const seq = fetchSeq
    try {
      const isInfinite = ui.paginationMode === 'infinite'
      const isSearch = filter.value.type === 'search'

      if (isInfinite && !isSearch && entries.value.length > 0) {
        const rows = await _callRpc(filter.value)
        if (seq !== fetchSeq) return
        const fresh: Entry[] = []
        for (const row of rows) {
          const existing = entryMap.value.get(row.id)
          if (existing) {
            existing.read_at = row.read_at
            existing.starred_at = row.starred_at
            existing.star_tag_id = row.star_tag_id
          } else {
            fresh.push(row)
          }
        }
        if (fresh.length > 0) {
          entries.value.unshift(...fresh)
          _autoApplyFilters(fresh)
        }
      } else {
        if (isSearch) searchOffset = (currentPage.value - 1) * _pageSize()
        const rows = await _callRpc(filter.value, pageCursors[currentPage.value - 1] ?? undefined)
        if (seq !== fetchSeq) return
        entries.value = rows
        hasMore.value = rows.length >= _pageSize()
        if (isSearch) searchOffset += rows.length
      }
    } catch {
      // Best effort; keep whatever is on screen.
    }
  }

  // ---------------------------------------------------------------------------
  // Read / star state: optimistic local updates, batched writes
  // ---------------------------------------------------------------------------
  const pendingRead = new Map<string, string | null>()
  const pendingStar = new Map<string, { starred_at: string | null; star_tag_id: string | null }>()
  /** First-seen values for rollback if the batched write fails. */
  const rollback = new Map<string, Pick<Entry, 'read_at' | 'starred_at' | 'star_tag_id'>>()
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  function _remember(entry: Entry): void {
    if (!rollback.has(entry.id)) {
      rollback.set(entry.id, { read_at: entry.read_at, starred_at: entry.starred_at, star_tag_id: entry.star_tag_id })
    }
  }

  /** Mutate read state locally and keep every derived count in step. */
  function _setRead(entry: Entry, readAt: string | null): void {
    if (!!entry.read_at === !!readAt) {
      entry.read_at = readAt
      return
    }
    const delta = readAt ? -1 : 1
    entry.read_at = readAt
    useFeedStore().adjustUnread(entry.feed_id, delta)
    if (entry.starred_at && entry.star_tag_id) useStarTagStore().adjustUnread(entry.star_tag_id, delta)
  }

  /** Mutate star state locally and keep tag unread counts in step. */
  function _setStar(entry: Entry, starredAt: string | null, tagId: string | null): void {
    const tags = useStarTagStore()
    const wasCounted = !entry.read_at && !!entry.starred_at && !!entry.star_tag_id
    const willBeCounted = !entry.read_at && !!starredAt && !!tagId
    if (wasCounted && entry.star_tag_id !== tagId) tags.adjustUnread(entry.star_tag_id!, -1)
    if (willBeCounted && entry.star_tag_id !== tagId) tags.adjustUnread(tagId!, 1)
    entry.starred_at = starredAt
    entry.star_tag_id = tagId
  }

  function _scheduleFlush(): void {
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = setTimeout(() => void flushStatus(), STATUS_FLUSH_DELAY)
  }

  /** Send every queued read/star change in at most two upserts. */
  async function flushStatus(): Promise<void> {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    if (pendingRead.size === 0 && pendingStar.size === 0) return

    const userId = _userId()
    const reads = [...pendingRead].map(([entry_id, read_at]) => ({ user_id: userId, entry_id, read_at }))
    const stars = [...pendingStar].map(([entry_id, s]) => ({ user_id: userId, entry_id, ...s }))
    const touched = new Set([...pendingRead.keys(), ...pendingStar.keys()])
    pendingRead.clear()
    pendingStar.clear()

    const ops = []
    if (reads.length) ops.push(supabase.from('user_entry_status').upsert(reads, { onConflict: 'user_id,entry_id' }))
    if (stars.length) ops.push(supabase.from('user_entry_status').upsert(stars, { onConflict: 'user_id,entry_id' }))

    const results = await Promise.all(ops)
    const failure = results.find((r) => r.error)?.error

    if (failure) {
      error.value = failure.message || 'Failed to save read/star state'
      for (const id of touched) {
        const prev = rollback.get(id)
        const entry = entryMap.value.get(id)
        if (prev && entry) {
          _setRead(entry, prev.read_at)
          _setStar(entry, prev.starred_at, prev.star_tag_id)
        }
      }
    }
    for (const id of touched) rollback.delete(id)
  }

  function markRead(entryId: string): void {
    const entry = entryMap.value.get(entryId)
    if (!entry || entry.read_at) return
    _remember(entry)
    const now = new Date().toISOString()
    _setRead(entry, now)
    pendingRead.set(entryId, now)
    _scheduleFlush()
  }

  function toggleRead(entryId: string): void {
    const entry = entryMap.value.get(entryId)
    if (!entry) return
    _remember(entry)
    const readAt = entry.read_at ? null : new Date().toISOString()
    _setRead(entry, readAt)
    pendingRead.set(entryId, readAt)
    _scheduleFlush()
  }

  function toggleStar(entryId: string, starTagId?: string | null): void {
    const entry = entryMap.value.get(entryId)
    if (!entry) return
    _remember(entry)
    const unstar = !!entry.starred_at
    const starredAt = unstar ? null : new Date().toISOString()
    const tagId = unstar ? null : (starTagId ?? null)
    _setStar(entry, starredAt, tagId)
    pendingStar.set(entryId, { starred_at: starredAt, star_tag_id: tagId })
    _scheduleFlush()
  }

  async function unstarByTag(starTagId: string): Promise<void> {
    await flushStatus()
    const { error: updateError } = await supabase
      .from('user_entry_status')
      .update({ starred_at: null, star_tag_id: null })
      .eq('user_id', _userId())
      .eq('star_tag_id', starTagId)
      .not('starred_at', 'is', null)
    if (updateError) throw updateError

    for (const entry of entries.value) {
      if (entry.star_tag_id === starTagId && entry.starred_at) {
        entry.starred_at = null
        entry.star_tag_id = null
      }
    }
    useStarTagStore().setUnreadCount(starTagId, 0)
  }

  // ---------------------------------------------------------------------------
  // Scope-wide mark as read
  // ---------------------------------------------------------------------------

  /** Mark visible entries matching `predicate` read locally and zero the given feeds' counts. */
  function _applyScopeRead(feedIds: Iterable<string> | 'all', predicate: (e: Entry) => boolean): void {
    const feedStore = useFeedStore()
    const now = new Date().toISOString()
    for (const entry of entries.value) {
      if (!entry.read_at && predicate(entry)) {
        entry.read_at = now
        if (entry.starred_at && entry.star_tag_id) useStarTagStore().adjustUnread(entry.star_tag_id, -1)
      }
    }
    if (feedIds === 'all') for (const f of feedStore.feeds) f.unread_count = 0
    else for (const id of feedIds) feedStore.setUnreadCount(id, 0)
  }

  async function _markScope(rpc: string, params: Record<string, unknown>, feedIds: Iterable<string> | 'all', predicate: (e: Entry) => boolean): Promise<void> {
    await flushStatus()
    const { error: rpcError } = await supabase.rpc(rpc, { p_user_id: _userId(), ...params })
    if (rpcError) throw rpcError
    _applyScopeRead(feedIds, predicate)
    // Tag counts for entries not on screen can only be corrected by the server.
    void useFeedStore().refreshCounts()
  }

  async function markFeedAsRead(feedId: string): Promise<void> {
    await _markScope('mark_feed_as_read', { p_feed_id: feedId }, [feedId], (e) => e.feed_id === feedId)
  }

  async function markGroupAsRead(groupId: string): Promise<void> {
    const set = useGroupStore().groupFeedSets.get(groupId) ?? new Set<string>()
    await _markScope('mark_group_as_read', { p_group_id: groupId }, set, (e) => set.has(e.feed_id))
  }

  async function markCategoryAsRead(category: string): Promise<void> {
    const ids = new Set(useFeedStore().feeds.filter((f) => (f.category || 'other') === category).map((f) => f.id))
    await _markScope('mark_category_as_read', { p_category: category }, ids, (e) => ids.has(e.feed_id))
  }

  async function markEverythingAsRead(): Promise<void> {
    await _markScope('mark_all_as_read', {}, 'all', () => true)
  }

  /** "Mark all read" for whatever list is on screen. */
  async function markAllRead(): Promise<void> {
    const f = filter.value
    if (!supportsMarkAllRead.value) return
    markingAllRead.value = true
    error.value = null
    try {
      if (f.type === 'feed') await markFeedAsRead(f.feedId)
      else if (f.type === 'group') await markGroupAsRead(f.groupId)
      else if (f.type === 'category') await markCategoryAsRead(f.category)
      else await markEverythingAsRead()
    } catch (err: unknown) {
      error.value = errorText(err, 'Failed to mark entries as read')
      throw err
    } finally {
      markingAllRead.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Auto rules for entries that arrive on the client
  // ---------------------------------------------------------------------------
  function _autoApplyFilters(rows: Entry[]): void {
    const { markReadRules, autoStarRules } = useFilterStore()
    if (markReadRules.length === 0 && autoStarRules.length === 0) return

    for (const entry of rows) {
      if (!entry.read_at && markReadRules.some((r) => _ruleMatches(r, entry))) markRead(entry.id)
      if (!entry.starred_at) {
        const rule = autoStarRules.find((r) => _ruleMatches(r, entry))
        if (rule) toggleStar(entry.id, rule.star_tag_id)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------
  function selectEntry(id: string | null): void {
    selectedEntryId.value = id
    if (markReadTimer) {
      clearTimeout(markReadTimer)
      markReadTimer = null
    }
    const ui = useUIStore()
    if (id) {
      ui.openReader()
      markReadTimer = setTimeout(() => markRead(id), MARK_READ_DELAY)
    } else {
      ui.closeReader()
    }
  }

  function selectNext(): void {
    const list = filteredEntries.value
    if (list.length === 0) return
    const i = selectedIndex.value
    if (i < 0) selectEntry(list[0]!.id)
    else if (i < list.length - 1) selectEntry(list[i + 1]!.id)
  }

  function selectPrevious(): void {
    const i = selectedIndex.value
    if (i > 0) selectEntry(filteredEntries.value[i - 1]!.id)
  }

  function reset(): void {
    fetchSeq++
    entries.value = []
    selectedEntryId.value = null
    filter.value = { type: 'all', unreadOnly: false }
    error.value = null
    pendingRead.clear()
    pendingStar.clear()
    rollback.clear()
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
    markingAllRead,
    currentPage,
    // Getters
    filteredEntries,
    selectedEntry,
    selectedIndex,
    hasPrevious,
    searchQuery,
    supportsUnreadToggle,
    supportsMarkAllRead,
    // Actions
    fetchEntries,
    setUnreadOnly,
    refresh,
    fetchMore,
    fetchPage,
    silentRefresh,
    markRead,
    toggleRead,
    toggleStar,
    flushStatus,
    unstarByTag,
    markAllRead,
    markFeedAsRead,
    markGroupAsRead,
    markCategoryAsRead,
    selectEntry,
    selectNext,
    selectPrevious,
    reset,
  }
})
