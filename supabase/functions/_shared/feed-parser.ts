/**
 * Shared RSS / Atom / RDF parsing used by poll-feeds, add-feed and
 * fetch-feed-entries. Regex based because the edge runtime has no DOMParser.
 */

export const MAX_ENTRIES_PER_FEED = 50;
const FUTURE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export interface ParsedEntry {
  guid: string | null;
  url: string | null;
  title: string | null;
  author: string | null;
  content_html: string | null;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
}

export interface FeedMeta {
  title: string | null;
  description: string | null;
  site_url: string | null;
  favicon_url: string | null;
}

export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return null;
  let val = match[1].trim();
  if (val.startsWith("<![CDATA[")) {
    val = val.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
  } else {
    val = decodeXmlEntities(val);
  }
  return val || null;
}

/** First tag (in order) that yields a value. */
function extractFirst(xml: string, tags: string[]): string | null {
  for (const tag of tags) {
    const v = extractTag(xml, tag);
    if (v) return v;
  }
  return null;
}

/** Parse any date string Date.parse understands; null instead of throwing. */
export function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw.trim());
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Clamp future-dated entries to now. */
export function clampPublishedAt(publishedAt: string | null): string | null {
  if (!publishedAt) return null;
  const entryDate = new Date(publishedAt).getTime();
  const now = Date.now();
  if (entryDate > now + FUTURE_THRESHOLD_MS) return new Date(now).toISOString();
  return publishedAt;
}

export function isAtom(xml: string): boolean {
  return xml.includes("<feed") && xml.includes('xmlns="http://www.w3.org/2005/Atom"');
}

export function looksLikeFeed(xml: string): boolean {
  return xml.includes("<rss") || xml.includes("<feed") || xml.includes("<RDF") || xml.includes("<rdf:RDF");
}

export function faviconFor(siteUrl: string | null): string | null {
  if (!siteUrl) return null;
  try {
    return `${new URL(siteUrl).origin}/favicon.ico`;
  } catch {
    return null;
  }
}

export function parseFeedMeta(xml: string): FeedMeta {
  let title: string | null = null;
  let description: string | null = null;
  let site_url: string | null = null;

  if (isAtom(xml)) {
    // Only look at the feed header, not the first entry.
    const headerEnd = xml.search(/<entry[\s>]/i);
    const header = headerEnd === -1 ? xml : xml.slice(0, headerEnd);
    title = extractTag(header, "title");
    description = extractTag(header, "subtitle");
    const linkMatch =
      header.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
      header.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i) ||
      header.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    site_url = linkMatch ? linkMatch[1] : null;
  } else {
    const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<item/i);
    const channelBlock = channelMatch ? channelMatch[1] : xml;
    title = extractTag(channelBlock, "title");
    description = extractTag(channelBlock, "description");
    site_url = extractTag(channelBlock, "link");
  }

  return { title, description, site_url, favicon_url: faviconFor(site_url) };
}

function parseRSSItems(xml: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && entries.length < MAX_ENTRIES_PER_FEED) {
    const item = match[1];
    const guid = extractTag(item, "guid");
    const link = extractTag(item, "link");
    const title = extractTag(item, "title");
    const author = extractFirst(item, ["author", "dc:creator"]);
    const contentEncoded = extractTag(item, "content:encoded");
    const description = extractTag(item, "description");
    // RSS 2.0 uses pubDate; RSS 1.0 / RDF and many others use dc:date.
    const rawDate = extractFirst(item, ["pubDate", "dc:date", "published", "updated", "dc:created"]);

    let imageUrl: string | null = null;
    const enclosureMatch =
      item.match(/<enclosure[^>]*type=["']image\/[^"']*["'][^>]*url=["']([^"']*)["']/i) ||
      item.match(/<enclosure[^>]*url=["']([^"']*)["'][^>]*type=["']image/i);
    if (enclosureMatch) {
      imageUrl = enclosureMatch[1];
    } else {
      const mediaMatch =
        item.match(/<media:content[^>]*url=["']([^"']*)["']/i) ||
        item.match(/<media:thumbnail[^>]*url=["']([^"']*)["']/i);
      if (mediaMatch) imageUrl = mediaMatch[1];
    }

    entries.push({
      guid: guid || link,
      url: link,
      title,
      author,
      content_html: contentEncoded || description,
      summary: description && contentEncoded ? description : null,
      image_url: imageUrl,
      published_at: parseDate(rawDate),
    });
  }

  return entries;
}

function parseAtomEntries(xml: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null && entries.length < MAX_ENTRIES_PER_FEED) {
    const entry = match[1];
    const id = extractTag(entry, "id");
    const title = extractTag(entry, "title");
    const authorName = extractTag(entry, "name");
    const summary = extractTag(entry, "summary");
    const content = extractTag(entry, "content");
    const rawDate = extractFirst(entry, ["published", "updated"]);

    const linkMatch =
      entry.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']*)["']/i) ||
      entry.match(/<link[^>]*href=["']([^"']*)["']/i);
    const link = linkMatch ? linkMatch[1] : null;

    let imageUrl: string | null = null;
    const mediaMatch =
      entry.match(/<media:thumbnail[^>]*url=["']([^"']*)["']/i) ||
      entry.match(/<media:content[^>]*url=["']([^"']*)["']/i);
    if (mediaMatch) imageUrl = mediaMatch[1];

    entries.push({
      guid: id || link,
      url: link,
      title,
      author: authorName,
      content_html: content || summary,
      summary: summary && content ? summary : null,
      image_url: imageUrl,
      published_at: parseDate(rawDate),
    });
  }

  return entries;
}

export function parseFeedEntries(xml: string): ParsedEntry[] {
  return isAtom(xml) ? parseAtomEntries(xml) : parseRSSItems(xml);
}

/** Rows ready for the bulk_insert_entries RPC. */
export function toEntryRows(feedId: string, entries: ParsedEntry[]) {
  return entries.map((entry) => ({
    feed_id: feedId,
    guid: entry.guid,
    url: entry.url,
    title: entry.title,
    author: entry.author,
    content_html: entry.content_html,
    summary: entry.summary,
    image_url: entry.image_url,
    published_at: clampPublishedAt(entry.published_at),
  }));
}
