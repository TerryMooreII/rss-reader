/** SSRF-guarded fetch shared by add-feed and proxy-article. */

export function isPrivateOrReservedHost(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return true;
  }

  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 127) return true; // loopback
  }

  return false;
}

export function validateUrl(url: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTP and HTTPS URLs are allowed" };
  }
  if (isPrivateOrReservedHost(parsed.hostname)) {
    return { valid: false, error: "Private or reserved addresses are not allowed" };
  }
  return { valid: true };
}

export async function safeFetch(
  url: string,
  init: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<Response> {
  const check = validateUrl(url);
  if (!check.valid) throw new Error(check.error || "Invalid URL");

  const response = await fetch(url, {
    headers: { "User-Agent": "Acta RSS Reader/1.0", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(init.timeoutMs ?? 15000),
    redirect: "follow",
  });

  if (response.redirected && response.url !== url) {
    const redirectCheck = validateUrl(response.url);
    if (!redirectCheck.valid) throw new Error("Redirect to private address blocked");
  }

  return response;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
