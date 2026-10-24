import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { isSitemapRouteIncluded, sitemapPathForLocation, sitemapStaticPaths, sitemapXML, type SitemapEntry } from "@/lib/sitemap";
import { collectPublishedWigIds } from "@/lib/sitemap-content";

const BASE_URL = "https://wigsmi.com";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        try {
          const router = await getRouterInstance();
          const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));
          const routeId = "/wig/$id";
          if (isSitemapRouteIncluded(router.routesById[routeId])) {
            const { createClient } = await import("@supabase/supabase-js");
            const key = process.env.SUPABASE_PUBLISHABLE_KEY;
            const url = process.env.SUPABASE_URL;
            if (!key || !url) throw new Error("Public sitemap credentials unavailable");
            const client = createClient(url, key, {
              auth: { persistSession: false, autoRefreshToken: false },
              global: { fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
                headers.set("apikey", key);
                return fetch(input, { ...init, headers });
              } },
            });
            const ids = await collectPublishedWigIds((offset, pageSize) => client.from("wigs")
              .select("id").eq("is_published", true).is("deleted_at", null)
              .order("id").range(offset, offset + pageSize - 1));
            for (const id of ids) {
              const location = router.buildLocation({ to: "/wig/$id", params: { id }, search: () => ({}), hash: "" });
              const path = sitemapPathForLocation(router, location, routeId);
              if (path) entries.push({ path });
            }
          }
          return new Response(sitemapXML(BASE_URL, entries), {
            headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
          });
        } catch (error) {
          console.error("Sitemap generation failed", error);
          return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
        }
      },
    },
  },
});