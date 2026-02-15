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
    .select('id, url, title, description, site_url, favicon_url, category, subscriber_count')
    .eq('is_private', false)
    .eq('category', category)
    .eq('status', 'active')
    .order('subscriber_count', { ascending: false })
    .order('title', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return (data ?? []) as DiscoverFeed[]
}

export async function getPopularFeeds(
  limit = PAGE_SIZE,
): Promise<DiscoverFeed[]> {
  const { data, error } = await supabase
    .from('feeds')
    .select('id, url, title, description, site_url, favicon_url, category, subscriber_count')
    .eq('is_private', false)
    .eq('status', 'active')
    .order('subscriber_count', { ascending: false })
    .order('title', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as DiscoverFeed[]
}

export async function searchGlobalFeeds(
  query: string,
): Promise<DiscoverFeed[]> {
  const { data, error } = await supabase
    .from('feeds')
    .select('id, url, title, description, site_url, favicon_url, category, subscriber_count')
    .eq('is_private', false)
    .eq('status', 'active')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('subscriber_count', { ascending: false })
    .limit(30)

  if (error) throw error
  return (data ?? []) as DiscoverFeed[]
}
