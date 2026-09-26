import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  faviconFor,
  looksLikeFeed,
  parseFeedEntries,
  parseFeedMeta,
  toEntryRows,
} from "../_shared/feed-parser.ts";
import { corsHeaders, json, safeFetch, validateUrl } from "../_shared/safe-fetch.ts";

/**
 * add-feed Edge Function
 *
 * Resolves a user-supplied URL (platform shortcuts, HTML autodiscovery),
 * validates it is a feed, inserts the feed row and its first page of entries.
 * verify_jwt is off; the bearer token is validated explicitly below.
 */

const FEED_COLUMNS = "id, title, description, site_url, favicon_url, category, status";

interface PlatformResult {
  platform: string;
  feedUrl: string;
  category?: string;
}

function detectPlatform(url: string): { platform: string; match: RegExpMatchArray } | null {
  const patterns: Array<{ platform: string; regex: RegExp }> = [
    { platform: "youtube_channel_id", regex: /youtube\.com\/channel\/(UC[\w-]+)/i },
    { platform: "youtube_handle", regex: /youtube\.com\/@([\w-]+)/i },
    { platform: "youtube_playlist", regex: /youtube\.com\/playlist\?.*list=(PL[\w-]+)/i },
    { platform: "reddit_subreddit", regex: /reddit\.com\/r\/([\w]+)/i },
    { platform: "reddit_user", regex: /reddit\.com\/user\/([\w]+)/i },
    { platform: "github_commits", regex: /github\.com\/([\w.-]+\/[\w.-]+)\/commits/i },
    { platform: "github_repo", regex: /github\.com\/([\w.-]+\/[\w.-]+)\/?$/i },
    { platform: "bluesky", regex: /bsky\.app\/profile\/([\w.-]+)/i },
    { platform: "mastodon", regex: /(https?:\/\/[\w.-]+\.[\w]+)\/@([\w]+)\/?$/i },
  ];
  for (const p of patterns) {
    const match = url.match(p.regex);
    if (match) return { platform: p.platform, match };
  }
  return null;
}

async function resolveYouTubeChannelId(handle: string): Promise<string | null> {
  try {
    const resp = await safeFetch(`https://www.youtube.com/@${handle}`);
    if (!resp.ok) return null;
    const html = await resp.text();
    for (const regex of [
      /itemprop="channelId"\s+content="(UC[\w-]+)"/i,
      /"channelId":"(UC[\w-]+)"/i,
      /\/channel\/(UC[\w-]+)/i,
    ]) {
      const m = html.match(regex);
      if (m) return m[1];
    }
  } catch { /* ignore */ }
  return null;
}

async function resolvePlatformUrl(url: string): Promise<PlatformResult | null> {
  const detected = detectPlatform(url);
  if (!detected) return null;
  const { platform, match } = detected;

  switch (platform) {
    case "youtube_channel_id":
      return { platform: "youtube", feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${match[1]}`, category: "videos" };
    case "youtube_handle": {
      const channelId = await resolveYouTubeChannelId(match[1]);
      if (!channelId) return null;
      return { platform: "youtube", feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, category: "videos" };
    }
    case "youtube_playlist":
      return { platform: "youtube", feedUrl: `https://www.youtube.com/feeds/videos.xml?playlist_id=${match[1]}`, category: "videos" };
    case "reddit_subreddit":
      return { platform: "reddit", feedUrl: `https://www.reddit.com/r/${match[1]}/.rss` };
    case "reddit_user":
      return { platform: "reddit", feedUrl: `https://www.reddit.com/user/${match[1]}/.rss` };
    case "github_commits":
      return { platform: "github", feedUrl: `https://github.com/${match[1]}/commits.atom`, category: "open_source" };
    case "github_repo":
      return { platform: "github", feedUrl: `https://github.com/${match[1]}/releases.atom`, category: "open_source" };
    case "bluesky":
      return { platform: "bluesky", feedUrl: `https://bluestream.deno.dev/rss/${match[1]}`, category: "personal_blog" };
    case "mastodon":
      return { platform: "mastodon", feedUrl: `${match[1]}/@${match[2]}.rss`, category: "personal_blog" };
  }
  return null;
}

async function discoverFeedFromHtml(url: string, html: string): Promise<string | null> {
  const linkRegex = /<link[^>]*rel=["']alternate["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0];
    if (!/type=["']application\/(?:rss|atom)\+xml["']/i.test(tag)) continue;
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    let feedUrl: string;
    try {
      feedUrl = new URL(hrefMatch[1], url).href;
    } catch {
      continue;
    }
    if (!validateUrl(feedUrl).valid) continue;

    try {
      const resp = await safeFetch(feedUrl);
      if (!resp.ok) continue;
      if (looksLikeFeed(await resp.text())) return feedUrl;
    } catch {
      continue;
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, category, is_private } = await req.json();
    if (!url || typeof url !== "string") return json({ error: "url is required" }, 400);

    const inputUrl = url.trim();
    const urlCheck = validateUrl(inputUrl);
    if (!urlCheck.valid) return json({ error: urlCheck.error }, 403);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid or expired token" }, 401);

    // ---- Platform detection & URL resolution ----
    let resolvedUrl = inputUrl;
    let platform: string | null = null;
    let resolvedFrom: string | null = null;

    const platformResult = await resolvePlatformUrl(inputUrl);
    if (platformResult) {
      platform = platformResult.platform;
      resolvedFrom = inputUrl;
      resolvedUrl = platformResult.feedUrl;
    }

    const effectiveCategory =
      category === "other" && platformResult?.category ? platformResult.category : category || "other";

    const findExisting = async (feedUrl: string) => {
      const { data } = await supabase
        .from("feeds")
        .select(FEED_COLUMNS)
        .ilike("url", feedUrl.toLowerCase())
        .maybeSingle();
      return data;
    };

    const existing = (await findExisting(resolvedUrl)) ?? (resolvedUrl !== inputUrl ? await findExisting(inputUrl) : null);
    if (existing) return json({ feed: existing, created: false, platform, resolved_from: resolvedFrom });

    const feedResponse = await safeFetch(resolvedUrl);
    if (!feedResponse.ok) return json({ error: `Failed to fetch feed: ${feedResponse.status}` }, 400);

    let xml = await feedResponse.text();

    // Not a feed: try HTML autodiscovery unless a platform shortcut already resolved it.
    if (!looksLikeFeed(xml)) {
      if (platform) return json({ error: `Resolved ${platform} URL does not appear to be a valid RSS/Atom feed` }, 400);

      const discoveredUrl = await discoverFeedFromHtml(resolvedUrl, xml);
      if (!discoveredUrl) {
        return json({ error: "URL does not appear to be a valid RSS/Atom feed and no feed link was discovered" }, 400);
      }

      platform = "website";
      resolvedFrom = inputUrl;
      resolvedUrl = discoveredUrl;

      const discoveredResponse = await safeFetch(discoveredUrl);
      if (!discoveredResponse.ok) return json({ error: `Failed to fetch discovered feed: ${discoveredResponse.status}` }, 400);
      xml = await discoveredResponse.text();
      if (!looksLikeFeed(xml)) return json({ error: "Discovered URL does not appear to be a valid RSS/Atom feed" }, 400);

      const existingDiscovered = await findExisting(discoveredUrl);
      if (existingDiscovered) return json({ feed: existingDiscovered, created: false, platform, resolved_from: resolvedFrom });
    }

    const meta = parseFeedMeta(xml);
    const nowIso = new Date().toISOString();

    const { data: feed, error: insertError } = await supabase
      .from("feeds")
      .insert({
        url: resolvedUrl,
        title: meta.title,
        description: meta.description,
        site_url: meta.site_url,
        favicon_url: meta.favicon_url ?? faviconFor(resolvedUrl),
        category: effectiveCategory,
        is_private: is_private || false,
        added_by: user.id,
        status: "active",
        etag: feedResponse.headers.get("ETag"),
        last_modified_header: feedResponse.headers.get("Last-Modified"),
        last_fetched_at: nowIso,
        last_successful_fetch: nowIso,
        fetch_interval_minutes: 60,
        consecutive_failures: 0,
      })
      .select(FEED_COLUMNS)
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const raced = await findExisting(resolvedUrl);
        return json({ feed: raced, created: false, platform, resolved_from: resolvedFrom });
      }
      throw insertError;
    }

    const parsedEntries = parseFeedEntries(xml);
    let entriesAdded = 0;
    if (parsedEntries.length > 0) {
      const { data: inserted, error: entriesError } = await supabase.rpc("bulk_insert_entries", {
        p_entries: toEntryRows(feed.id, parsedEntries),
      });
      if (entriesError) console.error(`bulk_insert_entries failed for ${feed.id}:`, entriesError.message);
      else entriesAdded = inserted ?? 0;
    }

    return json({ feed, created: true, entries_added: entriesAdded, platform, resolved_from: resolvedFrom });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
