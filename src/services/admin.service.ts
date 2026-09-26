import { supabase } from '@/config/supabase'
import type { Feed } from '@/types/models'

/** Google's favicon service URL for a feed's site (or feed) domain. */
export function faviconServiceUrl(feed: Pick<Feed, 'site_url' | 'url'>): string {
  const domain = new URL(feed.site_url || feed.url).hostname
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

export async function updateFeed(id: string, patch: Partial<Feed>): Promise<void> {
  const { error } = await supabase.from('feeds').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteFeed(id: string): Promise<void> {
  const { error } = await supabase.from('feeds').delete().eq('id', id)
  if (error) throw error
}

export interface CronRun {
  run_id: number
  job_name: string
  status: string
  return_message: string | null
  start_time: string
  end_time: string
  duration_ms: number
  response_content: string | null
}

export async function getCronHistory(limit = 10): Promise<CronRun[]> {
  const { data, error } = await supabase.rpc('get_cron_run_history', { p_limit: limit })
  if (error) throw error
  return (data ?? []) as CronRun[]
}

export interface DbStats {
  total_size: string
  total_size_bytes: number
  free_plan_limit_bytes: number
  tables: { name: string; rows: number; size: string; size_bytes: number }[]
  entry_growth: { day: string; count: number }[]
}

export async function getDatabaseStats(): Promise<DbStats> {
  const { data, error } = await supabase.rpc('get_database_stats')
  if (error) throw error
  return data as DbStats
}

export interface RetentionSettings {
  days: number
  preserve_starred: boolean
}

export async function getRetentionSettings(): Promise<RetentionSettings> {
  const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'entry_retention').maybeSingle()
  if (error) throw error
  return { days: data?.value?.days ?? 30, preserve_starred: data?.value?.preserve_starred ?? true }
}

export async function saveRetentionSettings(settings: RetentionSettings): Promise<void> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: 'entry_retention', value: settings, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function runCleanup(): Promise<{ deleted: number; cutoff: string }> {
  const { data, error } = await supabase.rpc('cleanup_old_entries')
  if (error) throw error
  return data as { deleted: number; cutoff: string }
}
