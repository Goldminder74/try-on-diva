import { describe, expect, it } from "vitest";
import { collectPublishedWigEntries } from "./sitemap-content";

const rows = [
  { id: "a", updated_at: "2026-11-12T10:30:00Z", created_at: "2026-11-01T09:00:00Z" },
  { id: "b", updated_at: "2026-11-13T11:30:00Z", created_at: "2026-11-02T09:00:00Z" },
  { id: "c", updated_at: "", created_at: "2026-11-03T09:00:00Z" },
];

describe("public sitemap pagination", () => {
  it("includes every batch with real product modification dates", async () => {
    const offsets: number[] = [];
    const entries = await collectPublishedWigEntries(async (offset) => {
      offsets.push(offset);
      return {
        data: rows.slice(offset, offset + 2),
        error: null,
      };
    }, 2);
    expect(entries).toEqual([
      { id: "a", lastmod: "2026-11-12" },
      { id: "b", lastmod: "2026-11-13" },
      { id: "c", lastmod: "2026-11-03" },
    ]);
    expect(offsets).toEqual([0, 2, 3]);
  });

  it("rejects a later-batch failure rather than returning partial entries", async () => {
    await expect(
      collectPublishedWigEntries(async (offset) =>
        offset === 0
          ? { data: [rows[0]], error: null }
          : { data: null, error: new Error("Source unavailable") },
      ),
    ).rejects.toThrow("Source unavailable");
  });

  it("rejects an invalid product timestamp instead of inventing a date", async () => {
    await expect(
      collectPublishedWigEntries(async () => ({
        data: [{ id: "bad", updated_at: "not-a-date", created_at: "2026-11-01" }],
        error: null,
      })),
    ).rejects.toThrow("Invalid sitemap timestamp for wig bad");
  });
});
