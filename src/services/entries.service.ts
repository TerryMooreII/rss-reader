import { supabase } from '@/config/supabase'
import type { Entry } from '@/types/models'
import { PAGE_SIZE } from '@/config/constants'

interface PaginatedEntries {
  entries: Entry[]
  hasMore: boolean
}

export async function getAllEntries(
  userId: string,
  cursor?: { published_at: string; id: string },
  unreadOnly = false,
): Promise<PaginatedEntries> {
  const params: Record<string, unknown> = {
    p_user_id: userId,
    p_limit: PAGE_SIZE,
    p_unread_only: unreadOnly,
  }

  if (cursor) {
    params.p_cursor_published_at = cursor.published_at
    params.p_cursor_id = cursor.id
  }

  const { data, error } = await supabase.rpc('get_all_entries', params)
  if (error) throw error

  const entries = (data ?? []) as Entry[]
  return {
    entries,
    hasMore: entries.length === PAGE_SIZE,
  }
}

export async function getFeedEntries(
  userId: string,
  feedId: string,
  cursor?: { published_at: string; id: string },
  unreadOnly = false,
): Promise<PaginatedEntries> {
  const params: Record<string, unknown> = {
    p_user_id: userId,
    p_feed_id: feedId,
    p_limit: PAGE_SIZE,
    p_unread_only: unreadOnly,
  }

  if (cursor) {
    params.p_cursor_published_at = cursor.published_at
    params.p_cursor_id = cursor.id
  }

  const { data, error } = await supabase.rpc('get_feed_entries', params)
  if (error) throw error

  const entries = (data ?? []) as Entry[]
  return {
    entries,
    hasMore: entries.length === PAGE_SIZE,
  }
}

export async function getGroupEntries(
  userId: string,
  groupId: string,
  cursor?: { published_at: string; id: string },
  unreadOnly = false,
): Promise<PaginatedEntries> {
  const params: Record<string, unknown> = {
    p_user_id: userId,
    p_group_id: groupId,
    p_limit: PAGE_SIZE,
    p_unread_only: unreadOnly,
  }

  if (cursor) {
    params.p_cursor_published_at = cursor.published_at
    params.p_cursor_id = cursor.id
  }

  const { data, error } = await supabase.rpc('get_group_entries', params)
  if (error) throw error

  const entries = (data ?? []) as Entry[]
  return {
    entries,
    hasMore: entries.length === PAGE_SIZE,
  }
}

export async function getStarredEntries(
  userId: string,
  cursor?: { published_at: string; id: string },
): Promise<PaginatedEntries> {
  const params: Record<string, unknown> = {
    p_user_id: userId,
    p_limit: PAGE_SIZE,
  }

  if (cursor) {
    params.p_cursor_published_at = cursor.published_at
    params.p_cursor_id = cursor.id
  }

  const { data, error } = await supabase.rpc('get_starred_entries', params)
  if (error) throw error

  const entries = (data ?? []) as Entry[]
  return {
    entries,
    hasMore: entries.length === PAGE_SIZE,
  }
}

export async function searchEntries(
  userId: string,
  query: string,
  limit = PAGE_SIZE,
  offset = 0,
): Promise<Entry[]> {
  const { data, error } = await supabase.rpc('search_entries', {
    p_user_id: userId,
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  return (data ?? []) as Entry[]
}

export async function markRead(userId: string, entryId: string) {
  const { error } = await supabase
    .from('user_entry_status')
    .upsert(
      {
        user_id: userId,
        entry_id: entryId,
        read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,entry_id' },
    )
  if (error) throw error
}

export async function markUnread(userId: string, entryId: string) {
  const { error } = await supabase
    .from('user_entry_status')
    .update({ read_at: null })
    .eq('user_id', userId)
    .eq('entry_id', entryId)
  if (error) throw error
}

export async function toggleStar(
  userId: string,
  entryId: string,
  starred: boolean,
) {
  const { error } = await supabase
    .from('user_entry_status')
    .upsert(
      {
        user_id: userId,
        entry_id: entryId,
        starred_at: starred ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,entry_id' },
    )
  if (error) throw error
}

export async function markFeedAsRead(userId: string, feedId: string) {
  const { error } = await supabase.rpc('mark_feed_as_read', {
    p_user_id: userId,
    p_feed_id: feedId,
  })
  if (error) throw error
}

export async function markGroupAsRead(userId: string, groupId: string) {
  const { error } = await supabase.rpc('mark_group_as_read', {
    p_user_id: userId,
    p_group_id: groupId,
  })
  if (error) throw error
}

export async function markAllAsRead(userId: string) {
  const { error } = await supabase.rpc('mark_all_as_read', {
    p_user_id: userId,
  })
  if (error) throw error
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_total_unread_count', {
    p_user_id: userId,
  })
  if (error) throw error
  return (data as number) ?? 0
}
