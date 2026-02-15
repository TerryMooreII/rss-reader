import { supabase } from '@/config/supabase'
import { FEED_CATEGORIES, PAGE_SIZE } from '@/config/constants'
import type { DiscoverFeed } from '@/types/models'

export function getCategories() {
  return FEED_CATEGORIES
}

export async function getFeedsByCategory(
  category: string,
  limit = PAGE_SIZE,
  offset = 0,
): Promise<DiscoverFeed[]> {
  const { data, error } = await supabase
    .from('feeds')
    .select(`
      id,
      url,
      title,
      description,
      site_url,
      favicon_url,
      category,
      subscriptions(count)
    `)
    .eq('is_private', false)
    .eq('category', category)
    .eq('status', 'active')
    .range(offset, offset + limit - 1)

  if (error) throw error

  return (data ?? []).map((feed: any) => ({
    id: feed.id,
    url: feed.url,
    title: feed.title,
    description: feed.description,
    site_url: feed.site_url,
    favicon_url: feed.favicon_url,
    category: feed.category,
    subscriber_count: feed.subscriptions?.[0]?.count ?? 0,
  }))
}

export async function getPopularFeeds(
  limit = PAGE_SIZE,
): Promise<DiscoverFeed[]> {
  const { data, error } = await supabase
    .from('feeds')
    .select(`
      id,
      url,
      title,
      description,
      site_url,
      favicon_url,
      category,
      subscriptions(count)
    `)
    .eq('is_private', false)
    .eq('status', 'active')
    .limit(limit)

  if (error) throw error

  // Map and sort by subscriber count descending (client-side sort since
  // Supabase doesn't support ordering by aggregated relation counts directly)
  return (data ?? [])
    .map((feed: any) => ({
      id: feed.id,
      url: feed.url,
      title: feed.title,
      description: feed.description,
      site_url: feed.site_url,
      favicon_url: feed.favicon_url,
      category: feed.category,
      subscriber_count: feed.subscriptions?.[0]?.count ?? 0,
    }))
    .sort(
      (a: DiscoverFeed, b: DiscoverFeed) =>
        b.subscriber_count - a.subscriber_count,
    )
}

export async function searchGlobalFeeds(
  query: string,
): Promise<DiscoverFeed[]> {
  const { data, error } = await supabase
    .from('feeds')
    .select(`
      id,
      url,
      title,
      description,
      site_url,
      favicon_url,
      category,
      subscriptions(count)
    `)
    .eq('is_private', false)
    .eq('status', 'active')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(30)

  if (error) throw error

  return (data ?? []).map((feed: any) => ({
    id: feed.id,
    url: feed.url,
    title: feed.title,
    description: feed.description,
    site_url: feed.site_url,
    favicon_url: feed.favicon_url,
    category: feed.category,
    subscriber_count: feed.subscriptions?.[0]?.count ?? 0,
  }))
}
