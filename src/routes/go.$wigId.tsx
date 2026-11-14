import { createFileRoute, Link } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { CLICK_TTL_DAYS, safeRetailerTarget, withClickRef } from "@/lib/commission";
import { utmFromCookieHeader } from "@/lib/utm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public read of a listing's own checkout target. Runs on the publishable key:
 * the underlying function only ever returns the shop's product page, its
 * website host and whether that shop runs commission.
 */
function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/**
 * A listing's own product page, if it is a plain web address.
 *
 * The retailer wrote this link themselves and the shopper sees it labelled
 * with the shop's name, so we follow it as long as it is a real page - never
 * a `javascript:` or other trick address.
 */
/**
 * Counts every Buy click (wig click total + a buy_click event with the
 * shopper's first-visit campaign tags). Never throws: logging must not block
 * the redirect.
 */
// Crawlers, link checkers and preview fetchers follow Buy links too. They are
// sent on like anyone else, but they are not shoppers and are not counted.
const BOT_AGENT =
  /bot|crawl|spider|slurp|preview|fetch|monitor|scan|headless|lighthouse|python|curl|wget|httpclient|go-http|okhttp|axios|node|facebookexternalhit|whatsapp|telegram|discord|embedly|pinterest|bingpreview|gptbot|claude|perplexity|ccbot|bytespider|ahrefs|semrush/i;

function isAutomatedVisit(request: Request): boolean {
  const agent = request.headers.get("user-agent") ?? "";
  if (!agent || BOT_AGENT.test(agent)) return true;
  // Browsers mark a page fetched ahead of a click; that is not a click.
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`;
  return /prefetch|prerender|preview/i.test(purpose);
}

async function logBuyClick(request: Request, wigId: string, retailerId: string | null) {
  if (isAutomatedVisit(request)) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("increment_wig_click", { _wig_id: wigId });
    await supabaseAdmin.from("analytics_events").insert({
      event_type: "buy_click",
      retailer_id: retailerId,
      payload: {
        wig_id: wigId,
        retailer_id: retailerId,
        referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
        ...utmFromCookieHeader(request.headers.get("cookie")),
      },
    });
  } catch (err) {
    console.error("buy click logging failed:", err);
  }
}

function plainHttpsTarget(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Tracked hand-off to a shop's own product page.
 *
 * A shopper clicking "Buy from ..." leaves Wigsmi for the retailer's store.
 * When that retailer runs commission, the visit is recorded with a reference
 * code that rides along on the shop URL, so the retailer can tell us later
 * which order came from us. Every click is also counted, for all
 * shops, before the redirect.
 */
export const Route = createFileRoute("/go/$wigId")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Opening the shop - Wigsmi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  server: {
    handlers: {
      GET: async ({ request }) => {
        const wigId = decodeURIComponent(
          new URL(request.url).pathname.replace(/^\/go\//, ""),
        );
        const backToCatalog = Response.redirect(new URL("/catalog", request.url), 302);

        if (!UUID_RE.test(wigId)) return backToCatalog;

        try {
          const { data: target } = await publicClient().rpc("get_wig_checkout_target", {
            _wig_id: wigId,
          });
          const row = Array.isArray(target) ? target[0] : target;
          if (!row || row.is_published !== true || row.deleted_at !== null) {
            return backToCatalog;
          }

          // Where the shopper is going: the listing's own product page. A
          // reference code is only ever attached when the address is on the
          // shop's own site, which is what the commission agreement covers.
          const tracked = safeRetailerTarget(row.product_url, row.retailer_website);
          const destination = tracked ?? plainHttpsTarget(row.product_url);
          if (!destination) {
            return Response.redirect(new URL(`/wig/${wigId}`, request.url), 302);
          }

          if (row.commission_enabled !== true || !tracked || isAutomatedVisit(request)) {
            await logBuyClick(request, wigId, row.retailer_id ?? null);
            return Response.redirect(destination, 302);
          }

          // A tracking hiccup must never cost a retailer a sale: if the visit
          // cannot be recorded, the shopper still goes to the shop, without a
          // reference code.
          const token = crypto.randomUUID();
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { error: clickErr } = await supabaseAdmin.from("affiliate_clicks").insert({
              retailer_id: row.retailer_id,
              wig_id: wigId,
              token,
              referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
              user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
              expires_at: new Date(Date.now() + CLICK_TTL_DAYS * 86400000).toISOString(),
            });
            if (clickErr) throw clickErr;
          } catch (err) {
            console.error("tracked click failed:", err);
            return Response.redirect(destination, 302);
          }
          await logBuyClick(request, wigId, row.retailer_id ?? null);

          return Response.redirect(withClickRef(destination, token), 302);
        } catch (err) {
          // A tracking hiccup must never cost a retailer a sale: send the
          // shopper to the shop anyway when we know the address is safe.
          console.error("go/$wigId redirect failed:", err);
          return Response.redirect(new URL(`/wig/${wigId}`, request.url), 302);
        }
      },
    },
  },
  component: GoFallback,
});

/**
 * Fallback for a client-side visit to this address (no server round trip).
 * Sends the shopper back to the listing so they can use the normal button.
 */
function GoFallback() {
  const { wigId } = Route.useParams();
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-3xl text-mahogany">Opening the shop…</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          If nothing happens, use the button below.
        </p>
        <Link
          to="/wig/$id"
          params={{ id: wigId }}
          className="mt-6 inline-flex rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
        >
          Back to this wig
        </Link>
      </div>
    </div>
  );
}
