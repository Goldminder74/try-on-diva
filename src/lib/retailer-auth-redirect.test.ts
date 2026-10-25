import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { retailerAuthRedirect } from "./retailer-auth-redirect";

describe("retailer login return destination", () => {
  it("returns to the protected page requested before login", () => {
    expect(retailerAuthRedirect("?redirect=%2Fportal%2Fcatalog")).toBe("/portal/catalog");
  });
  it("preserves plan checkout selection", () => {
    expect(retailerAuthRedirect("?plan=growth&interval=yearly&redirect=%2Fportal")).toBe("/portal/billing?plan=growth&interval=yearly");
  });
  it("passes the selected plan and interval through actual router URL parsing", () => {
    const root = createRootRoute();
    const billing = createRoute({ getParentRoute: () => root, path: "/portal/billing", staticData: { sitemap: false } });
    const router = createRouter({
      routeTree: root.addChildren([billing]),
      history: createMemoryHistory({ initialEntries: ["/retailer/login"] }),
    });
    const destination = {
      href: retailerAuthRedirect("?plan=growth&interval=yearly"),
      to: "/portal/billing",
    };
    const location = router.buildLocation(destination);
    expect(location.pathname).toBe("/portal/billing");
    expect(location.search).toEqual({ plan: "growth", interval: "yearly" });
    expect(location.href).toBe("/portal/billing?plan=growth&interval=yearly");
  });
  it("preserves query strings and hashes on protected return destinations", () => {
    const root = createRootRoute();
    const catalog = createRoute({ getParentRoute: () => root, path: "/portal/catalog", staticData: { sitemap: false } });
    const router = createRouter({
      routeTree: root.addChildren([catalog]),
      history: createMemoryHistory({ initialEntries: ["/retailer/login"] }),
    });
    const destination = {
      href: retailerAuthRedirect(`?redirect=${encodeURIComponent("/portal/catalog?filter=published#styles")}`),
      to: "/portal/catalog",
    };
    const location = router.buildLocation(destination);
    expect(location.pathname).toBe("/portal/catalog");
    expect(location.search).toEqual({ filter: "published" });
    expect(location.hash).toBe("styles");
  });
  it("defaults to the portal", () => {
    expect(retailerAuthRedirect("")).toBe("/portal");
  });
  it("does not navigate to an external website", () => {
    for (const target of ["https://example.com", "//example.com", "/\\example.com"]) {
      expect(retailerAuthRedirect(`?redirect=${encodeURIComponent(target)}`)).toBe("/portal");
    }
  });
});