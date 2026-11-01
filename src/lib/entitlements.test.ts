import { describe, expect, it } from "vitest";
import { planFeatures } from "./entitlements";

describe("consumer monthly try-on allowances", () => {
  it("free accounts get 5", () => expect(planFeatures("free").monthlyTryOns).toBe(5));
  it("Plus gets 35", () => expect(planFeatures("plus").monthlyTryOns).toBe(35));
  it("Pro gets 100", () => expect(planFeatures("pro").monthlyTryOns).toBe(100));
});
