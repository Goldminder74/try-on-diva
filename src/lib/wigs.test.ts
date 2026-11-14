import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  filters: [] as ((row: Record<string, unknown>) => boolean)[],
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          mocks.filters.push((row) => row[key] === value);
          return query;
        },
        is: (key: string, value: unknown) => {
          mocks.filters.push((row) => row[key] === value);
          return query;
        },
        maybeSingle: async () => ({
          data: mocks.rows.find((row) => mocks.filters.every((filter) => filter(row))) ?? null,
          error: null,
        }),
      };
      return query;
    },
    rpc: async () => ({ data: [], error: null }),
  },
}));
import { fetchWigById } from "./wigs";

describe("public catalogue removal", () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.filters = [];
  });
  it("does not expose a removed wig through a direct link", async () => {
    mocks.rows = [{ id: "removed", is_published: true, deleted_at: "2026-11-05T22:55:00Z" }];
    expect(await fetchWigById("removed")).toBeNull();
  });
  it("does not expose an unpublished wig through a direct link", async () => {
    mocks.rows = [{ id: "unpublished", is_published: false, deleted_at: null }];
    expect(await fetchWigById("unpublished")).toBeNull();
  });
  it("keeps published undeleted retailer stock accessible", async () => {
    mocks.rows = [
      {
        id: "authorised",
        name: "Verified stock",
        is_published: true,
        deleted_at: null,
        retailer_id: "retailer",
        price: 159,
      },
    ];
    expect((await fetchWigById("authorised"))?.id).toBe("authorised");
  });
});
import { isAffiliateLink, affiliateDisclosure } from "./wigs";
describe("isAffiliateLink", () => {
  it("is true for an awin1.com link", () =>
    expect(isAffiliateLink("https://www.awin1.com/cread.php?a=1")).toBe(true));
  it("is false for a unice.com link", () =>
    expect(isAffiliateLink("https://www.unice.com/p/1")).toBe(false));
  it("is false for an empty value", () => {
    expect(isAffiliateLink("")).toBe(false);
    expect(isAffiliateLink(null)).toBe(false);
  });
  it("is false for a malformed value", () => expect(isAffiliateLink("not a url")).toBe(false));
  it("does not match lookalike hosts", () =>
    expect(isAffiliateLink("https://evilawin1.com/x")).toBe(false));
});
describe("affiliateDisclosure", () => {
  it("names one retailer", () =>
    expect(affiliateDisclosure(["UNice", "UNice"])).toBe(
      "Wigsmi earns a commission if you buy from UNice.",
    ));
  it("joins several with or", () =>
    expect(affiliateDisclosure(["UNice", "Luvme Hair"])).toBe(
      "Wigsmi earns a commission if you buy from UNice or Luvme Hair.",
    ));
});
