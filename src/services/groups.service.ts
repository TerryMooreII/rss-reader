import { supabase } from '@/config/supabase'
import type { Group, GroupFeed } from '@/types/models'

export async function getGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data ?? []) as Group[]
}

export async function getGroupFeeds(userId: string): Promise<GroupFeed[]> {
  const { data, error } = await supabase
    .from('group_feeds')
    .select(`
      id,
      group_id,
      feed_id,
      position,
      created_at,
      groups!inner (user_id)
    `)
    .eq('groups.user_id', userId)

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    group_id: row.group_id,
    feed_id: row.feed_id,
    position: row.position,
    created_at: row.created_at,
  }))
}

export async function getGroupUnreadCounts(
  userId: string,
): Promise<{ group_id: string; unread_count: number }[]> {
  const { data, error } = await supabase.rpc('get_group_unread_counts', {
    p_user_id: userId,
  })
  if (error) throw error
  return data ?? []
}

export async function createGroup(
  userId: string,
  name: string,
): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ user_id: userId, name })
    .select()
    .single()
  if (error) throw error
  return data as Group
}

export async function renameGroup(groupId: string, name: string): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .update({ name })
    .eq('id', groupId)
    .select()
    .single()
  if (error) throw error
  return data as Group
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)
  if (error) throw error
}

export async function reorderGroups(
  groups: { id: string; position: number }[],
) {
  // Batch update positions using individual updates within a loop.
  // Each update is small and Supabase handles them efficiently.
  const promises = groups.map(({ id, position }) =>
    supabase
      .from('groups')
      .update({ position })
      .eq('id', id),
  )

  const results = await Promise.all(promises)
  for (const result of results) {
    if (result.error) throw result.error
  }
}

export async function addFeedToGroup(groupId: string, feedId: string) {
  const { data, error } = await supabase
    .from('group_feeds')
    .insert({ group_id: groupId, feed_id: feedId })
    .select()
    .single()
  if (error) throw error
  return data as GroupFeed
}

export async function removeFeedFromGroup(groupId: string, feedId: string) {
  const { error } = await supabase
    .from('group_feeds')
    .delete()
    .eq('group_id', groupId)
    .eq('feed_id', feedId)
  if (error) throw error
}
