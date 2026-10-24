import { describe, expect, it } from "vitest";
import { collectPublishedWigIds } from "./sitemap-content";

describe("public sitemap pagination", () => {
  it("includes every batch and stops only at the end", async () => {
    const offsets: number[] = [];
    const ids = await collectPublishedWigIds(async (offset) => {
      offsets.push(offset);
      return { data: [{ id: "a" }, { id: "b" }, { id: "c" }].slice(offset, offset + 2), error: null };
    }, 2);
    expect(ids).toEqual(["a", "b", "c"]);
    expect(offsets).toEqual([0, 2, 3]);
  });
  it("rejects a later-batch failure rather than returning partial entries", async () => {
    await expect(collectPublishedWigIds(async (offset) => offset === 0
      ? { data: [{ id: "a" }], error: null }
      : { data: null, error: new Error("Source unavailable") })).rejects.toThrow("Source unavailable");
  });
});