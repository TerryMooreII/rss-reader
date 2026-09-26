import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json, safeFetch, validateUrl } from "../_shared/safe-fetch.ts";

/**
 * proxy-article Edge Function
 *
 * Fetches an article page server-side and returns a lightly extracted,
 * sanitized HTML body. verify_jwt is enabled on the platform.
 */

/** Prefer <article>, then <main>, then a known content class, then <body>. */
function extractArticleContent(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1].trim();

  const mainMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1].trim();

  const classMatch = cleaned.match(
    /class=["'][^"']*(?:article-body|post-content|entry-content|article-content|story-body)[^"']*["']/i,
  );
  if (classMatch) {
    const idx = cleaned.indexOf(classMatch[0]);
    const start = idx === -1 ? -1 : cleaned.lastIndexOf("<", idx);
    if (start !== -1) {
      const tagMatch = cleaned.substring(start).match(/^<(\w+)/);
      if (tagMatch) {
        const endTag = `</${tagMatch[1]}>`;
        const endIdx = cleaned.indexOf(endTag, start);
        if (endIdx !== -1) return cleaned.substring(start, endIdx + endTag.length);
      }
    }
  }

  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : cleaned;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?\/>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/javascript:/gi, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") return json({ error: "url is required" }, 400);

    const urlCheck = validateUrl(url);
    if (!urlCheck.valid) return json({ error: urlCheck.error }, 403);

    const response = await safeFetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Acta RSS Reader/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      timeoutMs: 10000,
    });
    if (!response.ok) return json({ error: `Failed to fetch article: ${response.status}` }, 502);

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

    return json({
      title: titleMatch ? titleMatch[1].trim() : null,
      content: sanitizeHtml(extractArticleContent(html)),
      url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
