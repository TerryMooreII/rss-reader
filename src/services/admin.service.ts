import { supabase } from '@/config/supabase'
import type { Feed, UserProfile } from '@/types/models'
import { PAGE_SIZE } from '@/config/constants'

export async function getAllFeeds(
  limit = PAGE_SIZE,
  offset = 0,
): Promise<{ feeds: Feed[]; total: number }> {
  const { data, error, count } = await supabase
    .from('feeds')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    feeds: (data ?? []) as Feed[],
    total: count ?? 0,
  }
}

export async function getAllUsers(
  limit = PAGE_SIZE,
  offset = 0,
): Promise<{ users: UserProfile[]; total: number }> {
  const { data, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    users: (data ?? []) as UserProfile[],
    total: count ?? 0,
  }
}

export async function updateUserRole(
  targetUserId: string,
  newRole: 'user' | 'admin',
) {
  const { error } = await supabase.rpc('admin_update_user_role', {
    p_target_user_id: targetUserId,
    p_new_role: newRole,
  })
  if (error) throw error
}

export async function updateFeedStatus(
  feedId: string,
  status: Feed['status'],
) {
  const { error } = await supabase
    .from('feeds')
    .update({ status })
    .eq('id', feedId)
  if (error) throw error
}

export async function deleteFeed(feedId: string) {
  const { error } = await supabase
    .from('feeds')
    .delete()
    .eq('id', feedId)
  if (error) throw error
}

export async function getFeedStats(): Promise<
  { status: string; count: number }[]
> {
  const { data, error } = await supabase
    .from('feeds')
    .select('status')

  if (error) throw error

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const s = row.status as string
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }

  return Array.from(counts.entries()).map(([status, count]) => ({
    status,
    count,
  }))
}

export async function getUserStats(): Promise<{
  totalUsers: number
  activeUsers: number
}> {
  const { count: totalUsers, error: totalError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  if (totalError) throw totalError

  // Active users: users who have a subscription (i.e. at least one feed)
  const { data: activeData, error: activeError } = await supabase
    .from('subscriptions')
    .select('user_id')

  if (activeError) throw activeError

  const uniqueActiveUsers = new Set(
    (activeData ?? []).map((row: { user_id: string }) => row.user_id),
  )

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers: uniqueActiveUsers.size,
  }
}
