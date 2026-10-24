import { describe, expect, it } from "vitest";
import type { AnyRoute } from "@tanstack/react-router";
import { isSitemapRouteIncluded, sitemapXML } from "./sitemap";

function route(sitemap: boolean | "exclude-subtree", parentRoute?: AnyRoute) {
  return { isRoot: false, options: { staticData: { sitemap } }, parentRoute } as AnyRoute;
}

describe("sitemap discovery boundaries", () => {
  it("cannot include a private descendant even when marked true", () => {
    expect(isSitemapRouteIncluded(route(true, route("exclude-subtree")))).toBe(false);
  });
  it("includes an explicitly public page below a non-page layout", () => {
    expect(isSitemapRouteIncluded(route(true, route(false)))).toBe(true);
  });
  it("omits non-discoverable pages", () => {
    expect(isSitemapRouteIncluded(route(false))).toBe(false);
  });
  it("rejects off-origin and query-bearing paths", () => {
    for (const path of ["//elsewhere.example/page", "/catalog?private=1", "/catalog#section"]) {
      expect(() => sitemapXML("https://wigsmi.com", [{ path }])).toThrow("Invalid sitemap path");
    }
  });
  it("deduplicates URLs and does not invent content timestamps", () => {
    const xml = sitemapXML("https://wigsmi.com", [{ path: "/catalog" }, { path: "/catalog" }]);
    expect(xml.match(/<loc>/g)).toHaveLength(1);
    expect(xml).not.toContain("lastmod");
  });
});