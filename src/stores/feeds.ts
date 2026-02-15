import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { SubscribedFeed } from '@/types/models'
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

  /** Map of group_id -> SubscribedFeed[] built from the group_feeds join. */
  const feedsByGroupId = computed(() => {
    const map = new Map<string, SubscribedFeed[]>()
    for (const feed of feeds.value) {
      // group_ids is assembled during fetchFeeds
      const gids = (feed as SubscribedFeed & { group_ids?: string[] }).group_ids
      if (gids) {
        for (const gid of gids) {
          const existing = map.get(gid) ?? []
          existing.push(feed)
          map.set(gid, existing)
        }
      }
    }
    return map
  })

  /** Feeds that don't belong to any group. */
  const ungroupedFeeds = computed(() => {
    return feeds.value.filter((feed) => {
      const gids = (feed as SubscribedFeed & { group_ids?: string[] }).group_ids
      return !gids || gids.length === 0
    })
  })

  /** Total unread count across all feeds. */
  const totalUnread = computed(() => {
    return feeds.value.reduce((sum, f) => sum + f.unread_count, 0)
  })

  /** Feeds marked as favorite. */
  const favoriteFeeds = computed(() => {
    return feeds.value.filter((f) => f.is_favorite)
  })

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

      // 4. Group associations
      const { data: groupFeeds, error: gfError } = await supabase
        .from('group_feeds')
        .select('group_id, feed_id')

      if (gfError) throw gfError

      const groupMap = new Map<string, string[]>()
      if (groupFeeds) {
        for (const gf of groupFeeds as { group_id: string; feed_id: string }[]) {
          const existing = groupMap.get(gf.feed_id) ?? []
          existing.push(gf.group_id)
          groupMap.set(gf.feed_id, existing)
        }
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
          group_ids: groupMap.get(feedId) ?? [],
        } as SubscribedFeed & { group_ids: string[] }
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

  return {
    // State
    feeds,
    loading,
    error,
    // Getters
    feedById,
    feedsByGroupId,
    ungroupedFeeds,
    totalUnread,
    favoriteFeeds,
    // Actions
    fetchFeeds,
    subscribeFeed,
    unsubscribeFeed,
    toggleFavorite,
    updateUnreadCount,
  }
})
