import { supabase } from '@/config/supabase'
import type { Feed } from '@/types/models'

export interface AddFeedResult extends Pick<
  Feed,
  'id' | 'title' | 'description' | 'site_url' | 'favicon_url' | 'category' | 'status'
> {
  created: boolean
  platform?: string
  resolved_from?: string
  entries_added?: number
}

/** Resolve, validate and create a feed through the `add-feed` edge function. */
export async function addFeed(
  url: string,
  category: string,
  isPrivate = false,
): Promise<AddFeedResult> {
  const { data, error } = await supabase.functions.invoke('add-feed', {
    body: { url, category, is_private: isPrivate },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return {
    ...data.feed,
    created: data.created ?? false,
    platform: data.platform ?? undefined,
    resolved_from: data.resolved_from ?? undefined,
    entries_added: data.entries_added ?? undefined,
  }
}

export async function importOPML(file: File, skipSubscribe = false) {
  const opml_xml = await file.text()

  const { data, error } = await supabase.functions.invoke('import-opml', {
    body: { opml_xml, skip_subscribe: skipSubscribe },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as { feeds_added: number; feeds_skipped: number; groups_created: number }
}
