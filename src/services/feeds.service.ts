import { supabase } from '@/config/supabase'
import type { Feed, SubscribedFeed } from '@/types/models'

export async function getUserFeeds(userId: string): Promise<SubscribedFeed[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      custom_title,
      notify,
      feeds (
        id,
        url,
        title,
        description,
        site_url,
        favicon_url,
        image_url,
        language,
        category,
        is_private,
        added_by,
        status,
        last_fetched_at,
        last_successful_fetch,
        fetch_interval_minutes,
        consecutive_failures,
        last_error_message,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)

  if (error) throw error

  return (data ?? []).map((sub: any) => ({
    ...sub.feeds,
    subscription_id: sub.id,
    custom_title: sub.custom_title,
    notify: sub.notify,
    unread_count: 0,
    is_favorite: false,
  }))
}

export async function getUnreadCounts(
  userId: string,
): Promise<{ feed_id: string; unread_count: number }[]> {
  const { data, error } = await supabase.rpc('get_unread_counts', {
    p_user_id: userId,
  })
  if (error) throw error
  return data ?? []
}

export async function getFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorite_feeds')
    .select('feed_id')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((row: { feed_id: string }) => row.feed_id)
}

export async function subscribeFeed(userId: string, feedId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({ user_id: userId, feed_id: feedId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function unsubscribeFeed(userId: string, feedId: string) {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('feed_id', feedId)
  if (error) throw error
}

export async function addFeed(
  url: string,
  category: string,
  isPrivate: boolean,
): Promise<Feed & { created: boolean }> {
  const { data, error } = await supabase.functions.invoke('add-feed', {
    body: { url, category, is_private: isPrivate },
  })

  if (error) throw error
  return { ...data.feed, created: data.created } as Feed & { created: boolean }
}

export async function toggleFavorite(
  userId: string,
  feedId: string,
  isFavorite: boolean,
) {
  if (isFavorite) {
    const { error } = await supabase
      .from('favorite_feeds')
      .insert({ user_id: userId, feed_id: feedId })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('favorite_feeds')
      .delete()
      .eq('user_id', userId)
      .eq('feed_id', feedId)
    if (error) throw error
  }
}

export async function searchFeeds(query: string): Promise<Feed[]> {
  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .ilike('title', `%${query}%`)
    .limit(20)

  if (error) throw error
  return (data ?? []) as Feed[]
}

export async function importOPML(file: File, skipSubscribe = false) {
  const opml_xml = await file.text()

  const { data, error } = await supabase.functions.invoke('import-opml', {
    body: { opml_xml, skip_subscribe: skipSubscribe },
  })

  if (error) throw error
  return data as { feeds_added: number; feeds_skipped: number; groups_created: number }
}

export async function exportOPML(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc('export_opml_data', {
    p_user_id: userId,
  })
  if (error) throw error
  return buildOPMLString(data ?? [], 'All Feeds')
}

export async function exportGroupOPML(
  userId: string,
  groupId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('export_opml_data', {
    p_user_id: userId,
  })
  if (error) throw error

  // Filter to only feeds in the specified group
  const groupFeeds = (data ?? []).filter(
    (item: any) => item.group_id === groupId,
  )
  return buildOPMLString(groupFeeds, 'Group Feeds')
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildOPMLString(
  feeds: Array<{
    title?: string
    xml_url?: string
    html_url?: string
    category?: string
  }>,
  title: string,
): string {
  const grouped = new Map<string, typeof feeds>()
  for (const feed of feeds) {
    const cat = feed.category || 'Uncategorized'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(feed)
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<opml version="2.0">\n'
  xml += '  <head>\n'
  xml += `    <title>${escapeXml(title)}</title>\n`
  xml += `    <dateCreated>${new Date().toUTCString()}</dateCreated>\n`
  xml += '  </head>\n'
  xml += '  <body>\n'

  for (const [category, categoryFeeds] of grouped) {
    xml += `    <outline text="${escapeXml(category)}" title="${escapeXml(category)}">\n`
    for (const feed of categoryFeeds) {
      const feedTitle = escapeXml(feed.title || '')
      const xmlUrl = escapeXml(feed.xml_url || '')
      const htmlUrl = escapeXml(feed.html_url || '')
      xml += `      <outline type="rss" text="${feedTitle}" title="${feedTitle}" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}" />\n`
    }
    xml += '    </outline>\n'
  }

  xml += '  </body>\n'
  xml += '</opml>\n'

  return xml
}
