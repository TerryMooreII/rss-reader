import type { Entry } from '@/types/models'
import type { Media } from './mediaDetect'
import { decodeXmlEntities } from './html'
import { sanitizeHtml } from './sanitize'

const YOUTUBE_IFRAME = /<iframe[^>]*youtube(?:-nocookie)?\.com\/embed\/[^>]*>[\s\S]*?<\/iframe>/gi

/**
 * The HTML the reader and expanded feed cards render for an entry: decoded,
 * minus any YouTube iframe we replace with our own player, and sanitized.
 */
export function renderEntryHtml(entry: Entry, media: Media | null, newTab: boolean): string {
  let html = entry.content_html || entry.summary || ''
  if (html.includes('&lt;') || html.includes('&gt;')) html = decodeXmlEntities(html)
  if (media?.type === 'youtube') html = html.replace(YOUTUBE_IFRAME, '')
  return sanitizeHtml(html, { newTab })
}

/** Shared typography classes for rendered article bodies. */
export const PROSE_CLASS =
  'prose prose-sm max-w-none prose-a:no-underline hover:prose-a:underline prose-code:bg-bg-secondary prose-code:rounded prose-code:px-1 prose-img:rounded-lg'
