import { describe, expect, it } from "vitest";
import { ANON_RETENTION_DAYS, isExpired, purgeAnonymousTryOns } from "./retention";

const now = new Date("2026-11-14T12:00:00Z");

describe("isExpired", () => {
  it("is false inside the window and true beyond it", () => {
    expect(isExpired("2026-11-01T12:00:00Z", now, ANON_RETENTION_DAYS)).toBe(false);
    expect(isExpired("2026-09-10T12:00:00Z", now, ANON_RETENTION_DAYS)).toBe(true);
  });

  it("never expires an object with no readable date", () => {
    expect(isExpired(null, now, ANON_RETENTION_DAYS)).toBe(false);
    expect(isExpired("not a date", now, ANON_RETENTION_DAYS)).toBe(false);
  });
});

describe("purgeAnonymousTryOns", () => {
  it("removes only images past the window, then old records and stale reservations", async () => {
    const removedPaths: string[] = [];
    const deletes: string[] = [];
    const sb = {
      storage: {
        from: () => ({
          list: async () =>
            removedPaths.length
              ? { data: [{ name: "new.png", created_at: "2026-11-10T00:00:00Z" }], error: null }
              : {
                  data: [
                    { name: "old.png", created_at: "2026-09-10T00:00:00Z" },
                    { name: "new.png", created_at: "2026-11-10T00:00:00Z" },
                  ],
                  error: null,
                },
          remove: async (paths: string[]) => {
            removedPaths.push(...paths);
            return { error: null };
          },
        }),
      },
      from: () => {
        const chain: any = {
          delete: () => chain,
          lt: () => chain,
          eq: (column: string) => {
            deletes.push(column);
            return chain;
          },
          select: async () => ({ data: [{ id: "1" }], error: null }),
        };
        return chain;
      },
    };

    const result = await purgeAnonymousTryOns(sb, now);
    expect(removedPaths).toEqual(["anon/old.png"]);
    expect(result).toMatchObject({
      images_removed: 1,
      records_removed: 1,
      stale_reservations_removed: 1,
    });
    expect(deletes).toEqual(["result_path"]);
    expect(result.error).toBeUndefined();
  });

  it("reports a failure instead of throwing, so the trial check still completes", async () => {
    const sb = {
      storage: { from: () => ({ list: async () => ({ data: null, error: new Error("down") }) }) },
    };
    const result = await purgeAnonymousTryOns(sb, now);
    expect(result.error).toBe("clean-up failed");
  });
});
