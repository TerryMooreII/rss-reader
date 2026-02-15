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

export interface UserSettings {
  user_id: string
  theme: 'light' | 'dark' | 'system'
  custom_theme: string
  display_mode: 'comfortable' | 'compact' | 'feed'
  entries_per_page: number
  mark_read_on_scroll: boolean
  show_images: boolean
  open_links_in_new_tab: boolean
  notify_new_entries: boolean
  notify_email: boolean
  default_sort_order: 'newest_first' | 'oldest_first'
}

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

export interface Subscription {
  id: string
  user_id: string
  feed_id: string
  custom_title: string | null
  notify: boolean
  created_at: string
}

export interface SubscribedFeed extends Feed {
  subscription_id: string
  custom_title: string | null
  notify: boolean
  unread_count: number
  is_favorite: boolean
}

export interface Group {
  id: string
  user_id: string
  name: string
  icon: string | null
  position: number
  created_at: string
  updated_at: string
  unread_count?: number
}

export interface GroupFeed {
  id: string
  group_id: string
  feed_id: string
  position: number
  created_at: string
}

export interface Entry {
  id: string
  feed_id: string
  guid: string | null
  url: string | null
  title: string | null
  author: string | null
  content_html: string | null
  content_text: string | null
  summary: string | null
  image_url: string | null
  published_at: string | null
  created_at: string
  read_at: string | null
  starred_at: string | null
  feed_title?: string | null
  feed_favicon_url?: string | null
}

export interface EntryFilter {
  type: 'all' | 'starred' | 'feed' | 'group' | 'category' | 'search'
  feedId?: string
  groupId?: string
  category?: string
  query?: string
  unreadOnly: boolean
}

export interface DiscoverFeed {
  id: string
  url: string
  title: string | null
  description: string | null
  site_url: string | null
  favicon_url: string | null
  category: string
  subscriber_count: number
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}
