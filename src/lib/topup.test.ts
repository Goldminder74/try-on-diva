import { describe, expect, it } from "vitest";
import {
  TRYON_PACKS,
  formatPackPrice,
  getPackByPriceId,
  isCheckoutPriceId,
  isPackPriceId,
  packExpiresAt,
} from "./topup";
import { grantPackCredits } from "./topup.grant";

/** Minimal stand-in for the Supabase client grantPackCredits talks to. */
function fakeClient(options: { existing?: { id: string } | null; insertError?: any } = {}) {
  const inserted: any[] = [];
  return {
    inserted,
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: options.existing ?? null }),
              };
            },
          };
        },
        insert: async (row: any) => {
          inserted.push(row);
          return { error: options.insertError ?? null };
        },
      };
    },
  };
}

describe("try-on pack config", () => {
  it("offers exactly one pack: 10 try-ons for £2.99", () => {
    expect(TRYON_PACKS).toHaveLength(1);
    const pack = TRYON_PACKS[0];
    expect(pack.credits).toBe(10);
    expect(pack.amountGbp).toBe(2.99);
    expect(pack.currency).toBe("GBP");
    expect(pack.priceId).toBe("tryon_pack_10");
  });

  it("keeps a purchased pack usable for 12 months", () => {
    const bought = new Date("2026-11-01T12:00:00.000Z");
    expect(packExpiresAt(bought, 12).toISOString()).toBe("2027-11-01T12:00:00.000Z");
  });

  it("shows the price as £2.99", () => {
    expect(formatPackPrice(TRYON_PACKS[0])).toBe("£2.99");
  });
});

describe("checkout price ids", () => {
  it("accepts plans and the pack", () => {
    expect(isCheckoutPriceId("consumer_plus_monthly")).toBe(true);
    expect(isCheckoutPriceId("retailer_scale_yearly")).toBe(true);
    expect(isCheckoutPriceId("tryon_pack_10")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isCheckoutPriceId("tryon_pack_999")).toBe(false);
    expect(isCheckoutPriceId("consumer_hacker_monthly")).toBe(false);
    expect(isCheckoutPriceId("")).toBe(false);
    expect(isCheckoutPriceId(null)).toBe(false);
  });

  it("recognises the pack price id on its own", () => {
    expect(isPackPriceId("tryon_pack_10")).toBe(true);
    expect(isPackPriceId("consumer_plus_monthly")).toBe(false);
    expect(getPackByPriceId("nope")).toBeUndefined();
  });
});

describe("grantPackCredits", () => {
  it("refuses an unknown pack", async () => {
    const client = fakeClient();
    const result = await grantPackCredits(client, {
      userId: "u1",
      priceId: "tryon_pack_999",
      sessionId: "cs_1",
    });
    expect(result).toEqual({ error: "Unknown try-on pack: tryon_pack_999" });
    expect(client.inserted).toHaveLength(0);
  });

  it("adds 10 try-ons with a 12-month expiry", async () => {
    const client = fakeClient();
    const result = await grantPackCredits(client, {
      userId: "u1",
      priceId: "tryon_pack_10",
      sessionId: "cs_1",
      purchasedAt: new Date("2026-11-01T00:00:00.000Z"),
    });
    expect(result).toEqual({ ok: true, granted: true, credits: 10 });
    expect(client.inserted[0]).toMatchObject({
      user_id: "u1",
      credits_purchased: 10,
      credits_used: 0,
      price_id: "tryon_pack_10",
      stripe_checkout_session_id: "cs_1",
      status: "active",
    });
    expect(client.inserted[0].expires_at).toBe("2027-11-01T00:00:00.000Z");
  });

  it("never grants the same payment twice", async () => {
    const client = fakeClient({ existing: { id: "already" } });
    const result = await grantPackCredits(client, {
      userId: "u1",
      priceId: "tryon_pack_10",
      sessionId: "cs_1",
    });
    expect(result).toEqual({ ok: true, granted: false, credits: 0 });
    expect(client.inserted).toHaveLength(0);
  });

  it("treats a simultaneous duplicate delivery as already granted", async () => {
    const client = fakeClient({ insertError: { code: "23505", message: "duplicate" } });
    const result = await grantPackCredits(client, {
      userId: "u1",
      priceId: "tryon_pack_10",
      sessionId: "cs_1",
    });
    expect(result).toEqual({ ok: true, granted: false, credits: 0 });
  });

  it("reports a real database failure instead of pretending", async () => {
    const client = fakeClient({ insertError: { code: "42P10", message: "no index" } });
    const result = await grantPackCredits(client, {
      userId: "u1",
      priceId: "tryon_pack_10",
      sessionId: "cs_1",
    });
    expect(result).toEqual({ error: "no index" });
  });
});
