export interface UserProfile {
  id: string
  email: string
  handle: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

/** Full `feeds` row, as used by Discover and Admin. */
export interface Feed {
  id: string
  url: string
  title: string | null
  description: string | null
  site_url: string | null
  favicon_url: string | null
  image_url: string | null
  language: string | null
  category: string
  is_private: boolean
  added_by: string | null
  status: 'active' | 'paused' | 'error' | 'dead'
  last_fetched_at: string | null
  last_successful_fetch: string | null
  fetch_interval_minutes: number
  consecutive_failures: number
  last_error_message: string | null
  subscriber_count: number
  created_at: string
  updated_at: string
}

/** The columns the sidebar needs, joined with the user's subscription row. */
export type SubscribedFeed = Pick<
  Feed,
  'id' | 'url' | 'title' | 'description' | 'site_url' | 'favicon_url' | 'category' | 'status' | 'last_fetched_at' | 'last_error_message'
> & {
  subscription_id: string
  custom_title: string | null
  notify: boolean
  unread_count: number
}

export interface Group {
  id: string
  user_id: string
  name: string
  icon: string | null
  position: number
  created_at: string
  updated_at: string
}

/** One row from the entry list RPCs plus fields the client derives once on arrival. */
export interface Entry {
  id: string
  feed_id: string
  url: string | null
  title: string | null
  author: string | null
  content_html: string | null
  summary: string | null
  image_url: string | null
  published_at: string
  read_at: string | null
  starred_at: string | null
  star_tag_id: string | null
  feed_title?: string | null
  feed_favicon_url?: string | null
  /** HTML-stripped body, computed client-side; used for excerpts and keyword filters. */
  plain_text: string
  /** Up to 500 chars of summary (or body) for list rows. */
  excerpt: string
}

export type EntryFilter =
  | { type: 'all'; unreadOnly: boolean }
  | { type: 'feed'; feedId: string; unreadOnly: boolean }
  | { type: 'group'; groupId: string; unreadOnly: boolean }
  | { type: 'category'; category: string; unreadOnly: boolean }
  | { type: 'starred'; unreadOnly: false }
  | { type: 'star_tag'; starTagId: string; unreadOnly: false }
  | { type: 'search'; query: string; scope: 'subscribed' | 'all'; unreadOnly: false }

export type EntryFilterType = EntryFilter['type']

export interface ContentFilter {
  id: string
  user_id: string
  keyword: string
  scope_type: 'global' | 'feed' | 'group'
  scope_id: string | null
  action: 'hide' | 'mark_read' | 'auto_star'
  star_tag_id: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface StarTag {
  id: string
  user_id: string
  name: string
  position: number
  created_at: string
  updated_at: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}
