import { describe, expect, it } from "vitest";
import { currencyForCountry, formatPlanPrice } from "./plan-prices";
import { formatPackPrice, TRYON_PACKS } from "./topup";

describe("plan currency", () => {
  it("shows USD to visitors in the United States and Nigeria", () => {
    expect(currencyForCountry("US")).toBe("USD");
    expect(currencyForCountry("NG")).toBe("USD");
  });
  it("shows GBP to everyone else", () => {
    expect(currencyForCountry("GB")).toBe("GBP");
    expect(currencyForCountry("FR")).toBe("GBP");
    expect(currencyForCountry(null)).toBe("GBP");
  });
});

describe("USD amounts match the approved list", () => {
  const usd: Record<string, string> = {
    consumer_plus_monthly: "$6.66",
    consumer_plus_yearly: "$51.96",
    consumer_pro_monthly: "$13.34",
    consumer_pro_yearly: "$104.02",
    retailer_starter_monthly: "$65.42",
    retailer_starter_yearly: "$510.24",
    retailer_growth_monthly: "$198.92",
    retailer_growth_yearly: "$1,551.54",
    retailer_scale_monthly: "$532.67",
    retailer_scale_yearly: "$4,154.79",
  };
  for (const [id, text] of Object.entries(usd)) {
    it(id, () => expect(formatPlanPrice(id, "USD")).toBe(text));
  }
  it("top-up pack is $3.99 in USD and still £2.99 in GBP", () => {
    expect(formatPackPrice(TRYON_PACKS[0], "USD")).toBe("$3.99");
    expect(formatPackPrice(TRYON_PACKS[0])).toBe("£2.99");
  });
  it("GBP amounts are unchanged", () => {
    expect(formatPlanPrice("retailer_starter_monthly", "GBP")).toBe("£49");
    expect(formatPlanPrice("retailer_scale_yearly", "GBP")).toBe("£3,112.20");
    expect(formatPlanPrice("consumer_plus_monthly", "GBP")).toBe("£4.99");
  });
});
