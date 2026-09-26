import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseFeedEntries, parseFeedMeta, toEntryRows } from "../_shared/feed-parser.ts";

/**
 * poll-feeds Edge Function
 *
 * Triggered by pg_cron every 5 minutes. Pulls the feeds whose adaptive
 * interval has elapsed (get_feeds_due_for_poll), fetches and parses them,
 * bulk-inserts new entries and updates polling metadata.
 *
 * JWT verification is disabled because pg_cron calls it; authentication is a
 * shared secret stored in Supabase Vault.
 */

const BATCH_SIZE = 20;
const CONCURRENCY = 5;

interface DueFeed {
  id: string;
  url: string;
  etag: string | null;
  last_modified_header: string | null;
  fetch_interval_minutes: number;
  consecutive_failures: number;
  site_url: string | null;
  favicon_url: string | null;
}

function computeInterval(newEntryCount: number, currentInterval: number): number {
  if (newEntryCount >= 5) return 15;
  if (newEntryCount >= 2) return 30;
  if (newEntryCount === 1) return 60;
  return Math.round(Math.min(Math.max(currentInterval, 15) * 1.5, 1440));
}

function computeBackoffInterval(failures: number): number {
  return Math.min(60 * Math.pow(2, failures), 1440);
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify cron secret
    const { data: secretData } = await supabase
      .rpc("get_vault_secret", { secret_name: "cron_secret" })
      .maybeSingle();
    const expectedSecret = secretData?.decrypted_secret;
    const providedSecret = req.headers.get("x-cron-secret");

    if (!expectedSecret || !providedSecret || expectedSecret !== providedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: feeds, error: feedsError } = await supabase.rpc("get_feeds_due_for_poll", {
      p_limit: BATCH_SIZE,
    });

    if (feedsError) throw feedsError;
    if (!feeds || feeds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No feeds to poll", duration_ms: Date.now() - startTime }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const results: { feed_id: string; new_entries: number; error?: string }[] = [];
    const dueFeeds = feeds as DueFeed[];

    for (let i = 0; i < dueFeeds.length; i += CONCURRENCY) {
      const chunk = dueFeeds.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map((feed) => pollFeed(supabase, feed, results)));
    }

    const totalNew = results.reduce((sum, r) => sum + r.new_entries, 0);
    const errors = results.filter((r) => r.error).length;

    return new Response(
      JSON.stringify({
        feeds_polled: results.length,
        new_entries: totalNew,
        errors,
        duration_ms: Date.now() - startTime,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function pollFeed(
  supabase: ReturnType<typeof createClient>,
  feed: DueFeed,
  results: { feed_id: string; new_entries: number; error?: string }[],
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const headers: Record<string, string> = { "User-Agent": "Acta RSS Reader/1.0" };
    if (feed.etag) headers["If-None-Match"] = feed.etag;
    if (feed.last_modified_header) headers["If-Modified-Since"] = feed.last_modified_header;

    const response = await fetch(feed.url, { headers, signal: AbortSignal.timeout(15000) });

    if (response.status === 304) {
      // Nothing changed: back off like a zero-entry fetch would.
      await supabase
        .from("feeds")
        .update({
          last_fetched_at: nowIso,
          last_successful_fetch: nowIso,
          consecutive_failures: 0,
          fetch_interval_minutes: computeInterval(0, feed.fetch_interval_minutes),
        })
        .eq("id", feed.id);
      results.push({ feed_id: feed.id, new_entries: 0 });
      return;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const xml = await response.text();
    const parsedEntries = parseFeedEntries(xml);

    let newCount = 0;
    if (parsedEntries.length > 0) {
      const { data: count, error: rpcError } = await supabase.rpc("bulk_insert_entries", {
        p_entries: toEntryRows(feed.id, parsedEntries),
      });
      if (rpcError) {
        console.error(`RPC error for feed ${feed.id}:`, rpcError.message);
      } else {
        newCount = count ?? 0;
      }
    }

    const updates: Record<string, unknown> = {
      last_fetched_at: nowIso,
      last_successful_fetch: nowIso,
      etag: response.headers.get("ETag") || feed.etag,
      last_modified_header: response.headers.get("Last-Modified") || feed.last_modified_header,
      fetch_interval_minutes: computeInterval(newCount, feed.fetch_interval_minutes),
      consecutive_failures: 0,
    };

    if (!feed.site_url || !feed.favicon_url) {
      const meta = parseFeedMeta(xml);
      if (!feed.site_url && meta.site_url) updates.site_url = meta.site_url;
      if (!feed.favicon_url && meta.favicon_url) updates.favicon_url = meta.favicon_url;
    }

    await supabase.from("feeds").update(updates).eq("id", feed.id);
    results.push({ feed_id: feed.id, new_entries: newCount });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    const newFailures = (feed.consecutive_failures || 0) + 1;

    const updates: Record<string, unknown> = {
      last_fetched_at: nowIso,
      consecutive_failures: newFailures,
      fetch_interval_minutes: computeBackoffInterval(newFailures),
      last_error_message: errorMsg,
    };
    if (newFailures >= 10) updates.status = "dead";

    await supabase.from("feeds").update(updates).eq("id", feed.id);
    results.push({ feed_id: feed.id, new_entries: 0, error: errorMsg });
  }
}
