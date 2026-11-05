import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], filters: [] as ((row: Record<string, unknown>) => boolean)[] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { mocks.filters.push(row => row[key] === value); return query; },
        is: (key: string, value: unknown) => { mocks.filters.push(row => row[key] === value); return query; },
        maybeSingle: async () => ({ data: mocks.rows.find(row => mocks.filters.every(filter => filter(row))) ?? null, error: null }),
      };
      return query;
    },
    rpc: async () => ({ data: [], error: null }),
  },
}));
import { fetchWigById } from "./wigs";

describe("public catalogue removal", () => {
  beforeEach(() => { mocks.rows = []; mocks.filters = []; });
  it("does not expose a removed wig through a direct link", async () => {
    mocks.rows = [{ id: "removed", is_published: true, deleted_at: "2026-11-05T22:55:00Z" }];
    expect(await fetchWigById("removed")).toBeNull();
  });
  it("does not expose an unpublished wig through a direct link", async () => {
    mocks.rows = [{ id: "unpublished", is_published: false, deleted_at: null }];
    expect(await fetchWigById("unpublished")).toBeNull();
  });
  it("keeps published undeleted retailer stock accessible", async () => {
    mocks.rows = [{ id: "authorised", name: "Verified stock", is_published: true, deleted_at: null, retailer_id: "retailer", price: 159 }];
    expect((await fetchWigById("authorised"))?.id).toBe("authorised");
  });
});