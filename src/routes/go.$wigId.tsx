import { createFileRoute, Link } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { CLICK_TTL_DAYS, safeRetailerTarget, withClickRef } from "@/lib/commission";

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
 * Tracked hand-off to a shop's own product page.
 *
 * A shopper clicking "Buy from ..." leaves Wigsmi for the retailer's store.
 * When that retailer runs commission, the visit is recorded with a reference
 * code that rides along on the shop URL, so the retailer can tell us later
 * which order came from us. Nothing here is stored for shops that do not run
 * commission - they simply get a straight redirect.
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

          // Only ever send the shopper to the retailer's own site; anything
          // else (missing, off-domain, unsafe) falls back to the Wigsmi page.
          const destination = safeRetailerTarget(row.product_url, row.retailer_website);
          if (!destination) {
            return Response.redirect(new URL(`/wig/${wigId}`, request.url), 302);
          }

          if (row.commission_enabled !== true) {
            return Response.redirect(destination, 302);
          }

          const token = crypto.randomUUID();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("affiliate_clicks").insert({
            retailer_id: row.retailer_id,
            wig_id: wigId,
            token,
            referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
            user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
            expires_at: new Date(Date.now() + CLICK_TTL_DAYS * 86400000).toISOString(),
          });
          await supabaseAdmin.rpc("increment_wig_click", { _wig_id: wigId });

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
