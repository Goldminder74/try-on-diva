import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";
import { collectPublishedWigEntries } from "@/lib/sitemap-content";
import { listGuides } from "@/lib/guides";

const BASE_URL = "https://wigsmi.com";

// Real content-change dates from each page's source history. Product dates
// come from the catalogue rows below instead of a deploy-time fallback.
const PAGE_LASTMOD: Record<string, string> = {
  "/": "2026-11-18",
  "/catalog": "2026-11-18",
  "/faq": "2026-11-18",
  "/guides": "2026-11-14",
  "/guides/lace-front-vs-closure-vs-glueless-wigs": "2026-11-12",
  "/pricing": "2026-11-18",
  "/privacy": "2026-11-15",
  "/retailer": "2026-11-18",
  "/terms": "2026-11-15",
  "/try-on": "2026-11-18",
};

function pageLastmod(path: string): string {
  const lastmod = PAGE_LASTMOD[path];
  if (!lastmod) throw new Error(`No page-specific sitemap timestamp for ${path}`);
  return lastmod;
}

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        try {
          const router = await getRouterInstance();
          const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({
            path,
            lastmod: pageLastmod(path),
          }));
          const guideRouteId = "/guides/$slug";
          if (isSitemapRouteIncluded(router.routesById[guideRouteId])) {
            for (const g of listGuides()) {
              const location = router.buildLocation({
                to: "/guides/$slug",
                params: { slug: g.slug },
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, guideRouteId);
              if (path) entries.push({ path, lastmod: pageLastmod(path) });
            }
          }
          const routeId = "/wig/$id";
          if (isSitemapRouteIncluded(router.routesById[routeId])) {
            const { createClient } = await import("@supabase/supabase-js");
            const key = process.env.SUPABASE_PUBLISHABLE_KEY;
            const url = process.env.SUPABASE_URL;
            if (!key || !url) throw new Error("Public sitemap credentials unavailable");
            const client = createClient(url, key, {
              auth: { persistSession: false, autoRefreshToken: false },
              global: {
                fetch: (input, init) => {
                  const headers = new Headers(init?.headers);
                  if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
                    headers.delete("Authorization");
                  headers.set("apikey", key);
                  return fetch(input, { ...init, headers });
                },
              },
            });
            const wigs = await collectPublishedWigEntries((offset, pageSize) =>
              client
                .from("wigs")
                .select("id, updated_at, created_at")
                .eq("is_published", true)
                .is("deleted_at", null)
                .order("id")
                .range(offset, offset + pageSize - 1),
            );
            for (const { id, lastmod } of wigs) {
              const location = router.buildLocation({
                to: "/wig/$id",
                params: { id },
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, routeId);
              if (path) entries.push({ path, lastmod });
            }
          }
          return new Response(sitemapXML(BASE_URL, entries), {
            headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
          });
        } catch (error) {
          console.error("Sitemap generation failed", error);
          return new Response("Sitemap temporarily unavailable", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
