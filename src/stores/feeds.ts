import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { SubscribedFeed } from '@/types/models'
import { decodeHtml } from '@/utils/html'
import { useAuthStore } from './auth'
import { useGroupStore } from './groups'
import { useStarTagStore } from './starTags'

const FEED_COLUMNS =
  'id, url, title, description, site_url, favicon_url, category, status, last_fetched_at, last_error_message'

interface SidebarCounts {
  feeds: { feed_id: string; unread_count: number }[]
  star_tags: { star_tag_id: string; unread_count: number }[]
}

/**
 * The user's subscriptions and, importantly, the single source of truth for
 * per-feed unread counts. Group and category totals are derived from these.
 */
export const useFeedStore = defineStore('feeds', () => {
  const feeds = ref<SubscribedFeed[]>([])
  const loaded = ref(false)
  const error = ref<string | null>(null)

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  const feedMap = computed(() => new Map(feeds.value.map((f) => [f.id, f])))

  function feedById(id: string): SubscribedFeed | undefined {
    return feedMap.value.get(id)
  }

  function isSubscribed(id: string): boolean {
    return feedMap.value.has(id)
  }

  const totalUnread = computed(() => feeds.value.reduce((sum, f) => sum + f.unread_count, 0))

  const unreadByCategory = computed(() => {
    const map = new Map<string, number>()
    for (const f of feeds.value) {
      const cat = f.category || 'other'
      map.set(cat, (map.get(cat) ?? 0) + f.unread_count)
    }
    return map
  })

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  function _userId(): string {
    return useAuthStore().user!.id
  }

  async function _fetchCounts(): Promise<SidebarCounts> {
    const { data, error: rpcError } = await supabase.rpc('get_sidebar_counts', {
      p_user_id: _userId(),
    })
    if (rpcError) throw rpcError
    return (data ?? { feeds: [], star_tags: [] }) as SidebarCounts
  }

  function _applyCounts(counts: SidebarCounts): void {
    const unread = new Map(counts.feeds.map((r) => [r.feed_id, r.unread_count]))
    for (const f of feeds.value) f.unread_count = unread.get(f.id) ?? 0
    useStarTagStore().setUnreadCounts(counts.star_tags)
  }

  function _toSubscribedFeed(sub: Record<string, unknown>, unread: number): SubscribedFeed {
    const feed = sub.feeds as Record<string, unknown>
    return {
      ...(feed as Omit<SubscribedFeed, 'subscription_id' | 'custom_title' | 'notify' | 'unread_count'>),
      id: sub.feed_id as string,
      title: decodeHtml(feed.title as string | null),
      subscription_id: sub.id as string,
      custom_title: decodeHtml(sub.custom_title as string | null),
      notify: sub.notify as boolean,
      unread_count: unread,
    }
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Subscriptions and all sidebar unread counts, fetched in parallel. */
  async function fetchFeeds(): Promise<void> {
    error.value = null
    try {
      const [subsResult, counts] = await Promise.all([
        supabase
          .from('subscriptions')
          .select(`id, feed_id, custom_title, notify, feeds (${FEED_COLUMNS})`)
          .eq('user_id', _userId()),
        _fetchCounts(),
      ])
      if (subsResult.error) throw subsResult.error

      const unread = new Map(counts.feeds.map((r) => [r.feed_id, r.unread_count]))
      feeds.value = ((subsResult.data ?? []) as Record<string, unknown>[]).map((sub) =>
        _toSubscribedFeed(sub, unread.get(sub.feed_id as string) ?? 0),
      )
      useStarTagStore().setUnreadCounts(counts.star_tags)
      loaded.value = true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch feeds'
      throw err
    }
  }

  /** Re-pull unread counts only (cheap; one RPC). */
  async function refreshCounts(): Promise<void> {
    try {
      _applyCounts(await _fetchCounts())
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to refresh counts'
    }
  }

  async function subscribeFeed(feedId: string): Promise<void> {
    if (isSubscribed(feedId)) return
    const userId = _userId()

    const { data: sub, error: insertError } = await supabase
      .from('subscriptions')
      .insert({ user_id: userId, feed_id: feedId })
      .select(`id, feed_id, custom_title, notify, feeds (${FEED_COLUMNS})`)
      .single()
    if (insertError) throw insertError

    feeds.value.push(_toSubscribedFeed(sub as Record<string, unknown>, 0))
    // A newly subscribed feed usually has existing entries; pick up its count.
    void refreshCounts()
  }

  async function unsubscribeFeed(feedId: string): Promise<void> {
    const { error: deleteError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', _userId())
      .eq('feed_id', feedId)
    if (deleteError) throw deleteError

    feeds.value = feeds.value.filter((f) => f.id !== feedId)
    useGroupStore().removeFeedEverywhere(feedId)
  }

  function setUnreadCount(feedId: string, count: number): void {
    const feed = feedMap.value.get(feedId)
    if (feed) feed.unread_count = Math.max(0, count)
  }

  function adjustUnread(feedId: string, delta: number): void {
    const feed = feedMap.value.get(feedId)
    if (feed) feed.unread_count = Math.max(0, feed.unread_count + delta)
  }

  function reset(): void {
    feeds.value = []
    loaded.value = false
    error.value = null
  }

  return {
    feeds,
    loaded,
    error,
    feedMap,
    feedById,
    isSubscribed,
    totalUnread,
    unreadByCategory,
    fetchFeeds,
    refreshCounts,
    subscribeFeed,
    unsubscribeFeed,
    setUnreadCount,
    adjustUnread,
    reset,
  }
})
