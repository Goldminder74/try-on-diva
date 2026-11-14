// Response headers that decide who may put a Wigsmi page inside a frame.
//
// Every page may be framed by Wigsmi itself and by the Lovable editor preview.
// The embeddable widget is the one page meant for other sites: it may be
// framed anywhere unless the retailer listed allowed domains, in which case
// only those sites (and their subdomains) may show it.

const EDITOR_ANCESTORS = "https://lovable.dev https://*.lovable.dev https://*.lovable.app";
const WIDGET_PATH = /^\/embed\/widget\/([0-9a-f-]{36})\/?$/i;

/** Turn a stored domain entry into a bare hostname, or null if it is not one. */
export function normaliseAllowedDomain(entry: unknown): string | null {
  const host = String(entry ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^\*\./, "")
    .replace(/^www\./, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}

/** The frame-ancestors value for a widget with this allowed-domain list. */
export function widgetFrameAncestors(allowedDomains: unknown): string | null {
  const hosts = (Array.isArray(allowedDomains) ? allowedDomains : [])
    .map(normaliseAllowedDomain)
    .filter((h): h is string => !!h);
  if (hosts.length === 0) return null;
  const sources = hosts.flatMap((h) => [`https://${h}`, `https://*.${h}`]);
  return `frame-ancestors 'self' ${EDITOR_ANCESTORS} ${sources.join(" ")}`;
}

async function widgetAllowedDomains(token: string): Promise<unknown> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("widget_embeds")
      .select("allowed_domains")
      .eq("embed_token", token)
      .maybeSingle();
    return data?.allowed_domains ?? null;
  } catch {
    // A lookup failure must not take a retailer's widget down.
    return null;
  }
}

/** Add framing rules to an HTML response. Other responses pass through. */
export async function withSecurityHeaders(request: Request, response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  let policy: string | null = `frame-ancestors 'self' ${EDITOR_ANCESTORS}`;
  const widget = WIDGET_PATH.exec(new URL(request.url).pathname);
  if (widget) policy = widgetFrameAncestors(await widgetAllowedDomains(widget[1]));

  const headers = new Headers(response.headers);
  if (policy) headers.set("content-security-policy", policy);
  headers.set("permissions-policy", "geolocation=(), microphone=(), usb=(), bluetooth=()");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
