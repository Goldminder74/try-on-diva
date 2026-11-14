import { describe, expect, it } from "vitest";
import { normaliseAllowedDomain, widgetFrameAncestors, withSecurityHeaders } from "./security-headers";

describe("normaliseAllowedDomain", () => {
  it("reduces an address to its hostname", () => {
    expect(normaliseAllowedDomain("https://www.Shop.example/wigs")).toBe("shop.example");
    expect(normaliseAllowedDomain("*.shop.example")).toBe("shop.example");
    expect(normaliseAllowedDomain("shop.example:8443")).toBe("shop.example");
  });

  it("rejects anything that could inject a policy source", () => {
    expect(normaliseAllowedDomain("shop.example; script-src *")).toBeNull();
    expect(normaliseAllowedDomain("*")).toBeNull();
    expect(normaliseAllowedDomain("")).toBeNull();
  });
});

describe("widgetFrameAncestors", () => {
  it("leaves a widget with no list frameable anywhere", () => {
    expect(widgetFrameAncestors([])).toBeNull();
    expect(widgetFrameAncestors(null)).toBeNull();
  });

  it("limits a widget to the listed sites and their subdomains", () => {
    const policy = widgetFrameAncestors(["shop.example"]);
    expect(policy).toContain("https://shop.example");
    expect(policy).toContain("https://*.shop.example");
    expect(policy).toContain("'self'");
  });
});

describe("withSecurityHeaders", () => {
  it("stops other sites framing an ordinary page", async () => {
    const response = await withSecurityHeaders(
      new Request("https://wigsmi.com/portal"),
      new Response("<html></html>", { headers: { "content-type": "text/html; charset=utf-8" } }),
    );
    expect(response.headers.get("content-security-policy")).toMatch(/^frame-ancestors 'self' /);
  });

  it("leaves non-HTML responses alone", async () => {
    const original = new Response("{}", { headers: { "content-type": "application/json" } });
    const response = await withSecurityHeaders(new Request("https://wigsmi.com/api"), original);
    expect(response).toBe(original);
  });
});
