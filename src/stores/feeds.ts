import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { SubscribedFeed } from '@/types/models'
import { FEED_CATEGORIES } from '@/config/constants'
import { useAuthStore } from './auth'

const _ta = document.createElement('textarea')
function decodeHtml(s: string | null | undefined): string | null {
  if (!s) return s as null
  _ta.innerHTML = s
  return _ta.value
}

export const useFeedStore = defineStore('feeds', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const feeds = ref<SubscribedFeed[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /** Return a feed by its id. */
  const feedById = computed(() => {
    return (id: string): SubscribedFeed | undefined =>
      feeds.value.find((f) => f.id === id)
  })

  /** Map of category value -> SubscribedFeed[] grouped by the feed's category. */
  const feedsByCategory = computed(() => {
    const map = new Map<string, SubscribedFeed[]>()
    for (const feed of feeds.value) {
      const cat = feed.category || 'other'
      const existing = map.get(cat) ?? []
      existing.push(feed)
      map.set(cat, existing)
    }
    return map
  })

  /** Sorted list of category values that have at least one subscribed feed. */
  const usedCategories = computed(() => {
    const used = new Set(feeds.value.map((f) => f.category || 'other'))
    return FEED_CATEGORIES.filter((c) => used.has(c.value)).map((c) => c.value)
  })

  /** Total unread count across all feeds. */
  const totalUnread = computed(() => {
    return feeds.value.reduce((sum, f) => sum + f.unread_count, 0)
  })

  /** Feeds marked as favorite. */
  const favoriteFeeds = computed(() => {
    return feeds.value.filter((f) => f.is_favorite)
  })

  /** Category unread counts from RPC. */
  const categoryUnreadCounts = ref<Map<string, number>>(new Map())

  /** Which categories are expanded in the sidebar. */
  const expandedCategories = ref<Set<string>>(new Set())

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Fetch the user's subscribed feeds with unread counts, favorites, and group
   * associations assembled into SubscribedFeed objects.
   */
  async function fetchFeeds(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // 1. Subscriptions joined with feed data
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('id, feed_id, custom_title, notify, feeds (*)')

      if (subError) throw subError

      // 2. Unread counts via RPC
      const authStore = useAuthStore()
      const userId = authStore.user!.id

      const { data: unreadCounts, error: unreadError } = await supabase.rpc(
        'get_unread_counts',
        { p_user_id: userId },
      )

      if (unreadError) throw unreadError

      const unreadMap = new Map<string, number>()
      if (unreadCounts) {
        for (const row of unreadCounts as { feed_id: string; unread_count: number }[]) {
          unreadMap.set(row.feed_id, row.unread_count)
        }
      }

      // 3. Favorites
      const { data: favorites, error: favError } = await supabase
        .from('favorite_feeds')
        .select('feed_id')

      if (favError) throw favError

      const favoriteSet = new Set<string>(
        (favorites ?? []).map((f: { feed_id: string }) => f.feed_id),
      )

      // 4. Category unread counts
      const { data: catCounts, error: catError } = await supabase.rpc(
        'get_category_unread_counts',
        { p_user_id: userId },
      )

      if (!catError && catCounts) {
        const catMap = new Map<string, number>()
        for (const row of catCounts as { category: string; unread_count: number }[]) {
          catMap.set(row.category, row.unread_count)
        }
        categoryUnreadCounts.value = catMap
      }

      // 5. Assemble SubscribedFeed[]
      feeds.value = (subscriptions ?? []).map((sub: Record<string, unknown>) => {
        const feed = sub.feeds as Record<string, unknown>
        const feedId = sub.feed_id as string
        return {
          ...(feed as object),
          id: feedId,
          title: decodeHtml(feed.title as string | null) ?? feed.title,
          subscription_id: sub.id as string,
          custom_title: decodeHtml(sub.custom_title as string | null),
          notify: sub.notify as boolean,
          unread_count: unreadMap.get(feedId) ?? 0,
          is_favorite: favoriteSet.has(feedId),
        } as SubscribedFeed
      })
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch feeds'
    } finally {
      loading.value = false
    }
  }

  /**
   * Subscribe to a feed and refresh the local list.
   */
  async function subscribeFeed(feedId: string): Promise<void> {
    error.value = null

    try {
      const authStore = useAuthStore()
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({ user_id: authStore.user!.id, feed_id: feedId })

      if (insertError) throw insertError

      await fetchFeeds()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to subscribe'
      throw err
    }
  }

  /**
   * Unsubscribe from a feed and refresh the local list.
   */
  async function unsubscribeFeed(feedId: string): Promise<void> {
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('feed_id', feedId)

      if (deleteError) throw deleteError

      await fetchFeeds()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to unsubscribe'
      throw err
    }
  }

  /**
   * Toggle a feed's favorite status. If currently a favorite, remove it;
   * otherwise add it.
   */
  async function toggleFavorite(feedId: string): Promise<void> {
    error.value = null

    const feed = feeds.value.find((f) => f.id === feedId)
    if (!feed) return

    try {
      if (feed.is_favorite) {
        const { error: deleteError } = await supabase
          .from('favorite_feeds')
          .delete()
          .eq('feed_id', feedId)

        if (deleteError) throw deleteError
      } else {
        const { error: insertError } = await supabase
          .from('favorite_feeds')
          .insert({ feed_id: feedId })

        if (insertError) throw insertError
      }

      // Optimistic local update
      feed.is_favorite = !feed.is_favorite
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to toggle favorite'
      throw err
    }
  }

  /**
   * Optimistically update the local unread count for a feed by a given delta.
   */
  function updateUnreadCount(feedId: string, delta: number): void {
    const feed = feeds.value.find((f) => f.id === feedId)
    if (feed) {
      feed.unread_count = Math.max(0, feed.unread_count + delta)
    }
  }

  /**
   * Optimistically update the category unread count for the category that
   * the given feed belongs to.
   */
  function updateCategoryUnreadCount(feedId: string, delta: number): void {
    const feed = feeds.value.find((f) => f.id === feedId)
    if (!feed) return
    const cat = feed.category || 'other'
    const current = categoryUnreadCounts.value.get(cat) ?? 0
    categoryUnreadCounts.value.set(cat, Math.max(0, current + delta))
  }

  /**
   * Toggle a category's expanded/collapsed state in the sidebar.
   */
  function toggleCategory(category: string): void {
    if (expandedCategories.value.has(category)) {
      expandedCategories.value.delete(category)
    } else {
      expandedCategories.value.add(category)
    }
  }

  /**
   * Fetch category unread counts from the RPC.
   */
  async function fetchCategoryUnreadCounts(): Promise<void> {
    try {
      const authStore = useAuthStore()
      const { data, error: rpcError } = await supabase.rpc(
        'get_category_unread_counts',
        { p_user_id: authStore.user!.id },
      )

      if (rpcError) throw rpcError

      const catMap = new Map<string, number>()
      if (data) {
        for (const row of data as { category: string; unread_count: number }[]) {
          catMap.set(row.category, row.unread_count)
        }
      }
      categoryUnreadCounts.value = catMap
    } catch (err: unknown) {
      console.error('Failed to fetch category unread counts:', err)
    }
  }

  return {
    // State
    feeds,
    loading,
    error,
    categoryUnreadCounts,
    expandedCategories,
    // Getters
    feedById,
    feedsByCategory,
    usedCategories,
    totalUnread,
    favoriteFeeds,
    // Actions
    fetchFeeds,
    subscribeFeed,
    unsubscribeFeed,
    toggleFavorite,
    updateUnreadCount,
    updateCategoryUnreadCount,
    toggleCategory,
    fetchCategoryUnreadCounts,
  }
})
