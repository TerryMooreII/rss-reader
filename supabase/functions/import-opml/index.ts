import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeXmlEntities, faviconFor } from "../_shared/feed-parser.ts";
import { corsHeaders, json } from "../_shared/safe-fetch.ts";

/**
 * import-opml Edge Function
 *
 * Parses an OPML document, creates missing feeds, and (unless skip_subscribe)
 * subscribes the caller and recreates their groups. verify_jwt is enabled.
 */

interface OPMLOutline {
  text: string;
  xmlUrl?: string;
  htmlUrl?: string;
  type?: string;
  children?: OPMLOutline[];
}

function parseAttributes(attrStr: string): OPMLOutline {
  const getText = (name: string): string | undefined => {
    const match = attrStr.match(new RegExp(`${name}=["']([^"']*)["']`, "i"));
    return match ? decodeXmlEntities(match[1]) : undefined;
  };
  return {
    text: getText("text") || getText("title") || "Untitled",
    xmlUrl: getText("xmlUrl"),
    htmlUrl: getText("htmlUrl"),
    type: getText("type"),
  };
}

function parseOPML(xml: string): OPMLOutline[] {
  const results: OPMLOutline[] = [];
  const bodyMatch = xml.match(/<body>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return results;

  const topOutlineRegex = /<outline\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/outline>)/gi;
  let match: RegExpExecArray | null;
  while ((match = topOutlineRegex.exec(bodyMatch[1])) !== null) {
    const outline = parseAttributes(match[1]);
    if (outline.xmlUrl) {
      results.push(outline);
      continue;
    }
    outline.children = [];
    const childRegex = /<outline\s+([^>]*?)\/?>/gi;
    let childMatch: RegExpExecArray | null;
    while ((childMatch = childRegex.exec(match[2] || "")) !== null) {
      const child = parseAttributes(childMatch[1]);
      if (child.xmlUrl) outline.children.push(child);
    }
    results.push(outline);
  }
  return results;
}

type Client = ReturnType<typeof createClient>;

async function findFeedByUrl(supabase: Client, url: string): Promise<string | null> {
  const { data } = await supabase.from("feeds").select("id").ilike("url", url.toLowerCase()).maybeSingle();
  return data?.id ?? null;
}

async function upsertFeed(supabase: Client, outline: OPMLOutline, userId: string): Promise<string | null> {
  const url = outline.xmlUrl!.trim();
  const existingId = await findFeedByUrl(supabase, url);
  if (existingId) return existingId;

  const { data: newFeed, error } = await supabase
    .from("feeds")
    .insert({
      url,
      title: outline.text || null,
      site_url: outline.htmlUrl || null,
      favicon_url: faviconFor(outline.htmlUrl ?? null),
      category: "other",
      is_private: false,
      added_by: userId,
      status: "active",
      fetch_interval_minutes: 60,
      consecutive_failures: 0,
    })
    .select("id")
    .single();

  if (error) {
    // Unique violation: a concurrent import inserted it first.
    if (error.code === "23505") return findFeedByUrl(supabase, url);
    return null;
  }
  return newFeed.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { opml_xml, skip_subscribe } = await req.json();
    if (!opml_xml || typeof opml_xml !== "string") return json({ error: "opml_xml is required" }, 400);
    const skipSubscribe = skip_subscribe === true;

    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const outlines = parseOPML(opml_xml);
    let feedsAdded = 0;
    let feedsSkipped = 0;
    let groupsCreated = 0;

    // Collect subscription / group membership rows and write them in bulk.
    const subscriptionRows: { user_id: string; feed_id: string }[] = [];
    const groupFeedRows: { group_id: string; feed_id: string; position: number }[] = [];

    for (const outline of outlines) {
      if (outline.xmlUrl) {
        const feedId = await upsertFeed(supabase, outline, user.id);
        if (!feedId) { feedsSkipped++; continue; }
        feedsAdded++;
        if (!skipSubscribe) subscriptionRows.push({ user_id: user.id, feed_id: feedId });
        continue;
      }

      if (!outline.children || outline.children.length === 0) continue;

      let groupId: string | null = null;
      if (!skipSubscribe) {
        const { data: existingGroup } = await supabase
          .from("groups")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", outline.text)
          .maybeSingle();
        if (existingGroup) {
          groupId = existingGroup.id;
        } else {
          const { data: newGroup } = await supabase
            .from("groups")
            .insert({ user_id: user.id, name: outline.text, position: groupsCreated })
            .select("id")
            .single();
          if (newGroup) { groupId = newGroup.id; groupsCreated++; }
        }
      }

      for (const child of outline.children) {
        const feedId = await upsertFeed(supabase, child, user.id);
        if (!feedId) { feedsSkipped++; continue; }
        feedsAdded++;
        if (!skipSubscribe) {
          subscriptionRows.push({ user_id: user.id, feed_id: feedId });
          if (groupId) groupFeedRows.push({ group_id: groupId, feed_id: feedId, position: 0 });
        }
      }
    }

    if (subscriptionRows.length > 0) {
      await supabase.from("subscriptions").upsert(subscriptionRows, { onConflict: "user_id,feed_id", ignoreDuplicates: true });
    }
    if (groupFeedRows.length > 0) {
      await supabase.from("group_feeds").upsert(groupFeedRows, { onConflict: "group_id,feed_id", ignoreDuplicates: true });
    }

    return json({ feeds_added: feedsAdded, feeds_skipped: feedsSkipped, groups_created: groupsCreated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
