import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseFeedEntries, parseFeedMeta, toEntryRows } from "../_shared/feed-parser.ts";
import { corsHeaders, json, safeFetch } from "../_shared/safe-fetch.ts";

/**
 * fetch-feed-entries Edge Function
 *
 * Called from Discover when a user subscribes to a feed that has never been
 * polled, so they see entries immediately instead of waiting for the cron.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { feed_id } = await req.json();
    if (!feed_id) return json({ error: "feed_id is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid or expired token" }, 401);

    const { count: subCount } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feed_id", feed_id);
    if (!subCount) return json({ error: "Not subscribed to this feed" }, 403);

    const { data: feed, error: feedError } = await supabase
      .from("feeds")
      .select("id, url, etag, last_modified_header, site_url, favicon_url")
      .eq("id", feed_id)
      .single();
    if (feedError || !feed) return json({ error: "Feed not found" }, 404);

    const { count } = await supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("feed_id", feed_id);
    if (count && count > 0) return json({ message: "Entries already exist", entries_added: 0 });

    const response = await safeFetch(feed.url);
    if (!response.ok) return json({ error: `Failed to fetch feed: HTTP ${response.status}` }, 502);

    const xml = await response.text();
    const parsedEntries = parseFeedEntries(xml);

    let entriesAdded = 0;
    if (parsedEntries.length > 0) {
      const { data: inserted, error: insertError } = await supabase.rpc("bulk_insert_entries", {
        p_entries: toEntryRows(feed.id, parsedEntries),
      });
      if (insertError) throw insertError;
      entriesAdded = inserted ?? 0;
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, unknown> = {
      last_fetched_at: nowIso,
      last_successful_fetch: nowIso,
      etag: response.headers.get("ETag") || feed.etag,
      last_modified_header: response.headers.get("Last-Modified") || feed.last_modified_header,
      consecutive_failures: 0,
    };
    if (!feed.site_url || !feed.favicon_url) {
      const meta = parseFeedMeta(xml);
      if (!feed.site_url && meta.site_url) updates.site_url = meta.site_url;
      if (!feed.favicon_url && meta.favicon_url) updates.favicon_url = meta.favicon_url;
    }
    await supabase.from("feeds").update(updates).eq("id", feed.id);

    return json({ entries_added: entriesAdded });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
