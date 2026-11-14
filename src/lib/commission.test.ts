import { describe, expect, it } from "vitest";
import {
  CLICK_TTL_DAYS,
  COMMISSION_MAX_BPS,
  COMMISSION_MIN_BPS,
  commissionFor,
  isAllowedRateBps,
  isClickToken,
  rateLabel,
  safeRetailerTarget,
  withClickRef,
} from "./commission";

describe("commission rates", () => {
  it("accepts rates from 8% to 15% and nothing outside", () => {
    expect(isAllowedRateBps(COMMISSION_MIN_BPS)).toBe(true);
    expect(isAllowedRateBps(1000)).toBe(true);
    expect(isAllowedRateBps(COMMISSION_MAX_BPS)).toBe(true);
    expect(isAllowedRateBps(799)).toBe(false);
    expect(isAllowedRateBps(1501)).toBe(false);
    expect(isAllowedRateBps(1000.5)).toBe(false);
    expect(isAllowedRateBps("1000")).toBe(false);
  });

  it("labels basis points as a percentage", () => {
    expect(rateLabel(1000)).toBe("10%");
    expect(rateLabel(800)).toBe("8%");
    expect(rateLabel(1250)).toBe("12.5%");
  });
});

describe("commissionFor", () => {
  it("charges 10% of a £150 wig as £15.00", () => {
    expect(commissionFor(150, 1000)).toBe(15);
  });

  it("rounds to the nearest penny rather than truncating", () => {
    // 10% of £19.99 is £1.999 -> £2.00
    expect(commissionFor(19.99, 1000)).toBe(2);
    // 8% of £249.99 is £19.9992 -> £20.00
    expect(commissionFor(249.99, 800)).toBe(20);
  });

  it("never returns a fractional penny", () => {
    const value = commissionFor(123.45, 1200);
    expect(value).toBe(Math.round(value * 100) / 100);
    expect(value).toBe(14.81);
  });

  it("charges nothing when the rate is zero", () => {
    expect(commissionFor(500, 0)).toBe(0);
  });
});

describe("safeRetailerTarget", () => {
  it("allows a product page on the retailer's own domain", () => {
    expect(
      safeRetailerTarget("https://isacollective.co.uk/products/bob", "https://isacollective.co.uk"),
    ).toBe("https://isacollective.co.uk/products/bob");
  });

  it("allows a subdomain of the retailer's site", () => {
    expect(
      safeRetailerTarget("https://shop.destinationbty.com/wig/1", "https://destinationbty.com"),
    ).toBe("https://shop.destinationbty.com/wig/1");
  });

  it("refuses another company's domain", () => {
    expect(
      safeRetailerTarget("https://evil-example.com/collect-money", "https://isacollective.co.uk"),
    ).toBeNull();
  });

  it("refuses a look-alike domain that merely contains the retailer's name", () => {
    expect(
      safeRetailerTarget(
        "https://isacollective.co.uk.evil-example.com/x",
        "https://isacollective.co.uk",
      ),
    ).toBeNull();
  });

  it("refuses javascript: URLs, non-URLs and missing values", () => {
    expect(safeRetailerTarget("javascript:alert(1)", "https://isacollective.co.uk")).toBeNull();
    expect(safeRetailerTarget("not a url", "https://isacollective.co.uk")).toBeNull();
    expect(safeRetailerTarget(null, "https://isacollective.co.uk")).toBeNull();
    expect(safeRetailerTarget("https://isacollective.co.uk/x", null)).toBeNull();
  });
});

describe("click references", () => {
  it("attaches the reference the retailer quotes back to us", () => {
    expect(withClickRef("https://shop.example.com/wig/1", "abc")).toBe(
      "https://shop.example.com/wig/1?wigsmi_ref=abc",
    );
  });

  it("only accepts UUID-shaped references", () => {
    expect(isClickToken("2f1f4c1e-9d0b-4f4a-9f4a-1f2e3d4c5b6a")).toBe(true);
    expect(isClickToken("../../etc/passwd")).toBe(false);
    expect(isClickToken("abc")).toBe(false);
    expect(isClickToken(undefined)).toBe(false);
  });

  it("keeps a tracked visit matchable for 30 days", () => {
    expect(CLICK_TTL_DAYS).toBe(30);
  });
});
