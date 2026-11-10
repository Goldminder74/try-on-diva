import { describe, expect, it } from "vitest";
import { getGuide, listGuides } from "./guides";

describe("guides", () => {
  it("loads the lace guide from its markdown file", () => {
    const g = getGuide("lace-front-vs-closure-vs-glueless-wigs");
    expect(g?.datePublished).toBe("2026-11-10");
    expect(g?.faq).toHaveLength(5);
    expect(listGuides().some((x) => x.slug === g?.slug)).toBe(true);
  });
  it("opens external sources in a new tab and keeps internal links relative", () => {
    const html = getGuide("lace-front-vs-closure-vs-glueless-wigs")!.html;
    expect(html).toContain('href="/try-on"');
    expect(html).toMatch(/href="https:\/\/www\.aad\.org[^"]*" target="_blank" rel="noopener"/);
  });
});
