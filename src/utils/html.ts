/**
 * Small HTML/text helpers shared by stores and components.
 * All of these are pure and cheap enough to run once per entry when rows arrive.
 */

const _textarea = typeof document !== 'undefined' ? document.createElement('textarea') : null

/** Decode HTML entities (`&amp;`, `&#8217;`, ...) in a plain-text string such as a title. */
export function decodeHtml<T extends string | null | undefined>(s: T): T {
  if (!s || !_textarea) return s
  _textarea.innerHTML = s
  return _textarea.value as T
}

/** Decode the XML entities some feeds use to wrap their HTML body. */
export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Replace tags with spaces and collapse whitespace. */
export function stripHtml(s: string | null | undefined): string {
  if (!s) return ''
  let text = s
  if (text.includes('&lt;')) text = decodeXmlEntities(text)
  return decodeHtml(text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/** First `max` characters of `text` with an ellipsis when truncated. */
export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trimEnd() + '...' : text
}

/** Strip XML/HTML tags from author names, e.g. `<author id="817">Sportsnet Video`. */
export function cleanAuthor(author: string): string {
  return author.replace(/<[^>]*>/g, '').trim()
}
