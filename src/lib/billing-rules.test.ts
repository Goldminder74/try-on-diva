import { describe, expect, it } from "vitest";
import { planChangeError, paymentCanSync, subscriptionIdFromPayment } from "./billing-rules";
import { cronAuthorized } from "./cron-auth";
import { subscriptionIsValid } from "./entitlements";

describe("billing audit rules", () => {
  it("blocks 31 published wigs on Starter but allows 30", () => {
    expect(planChangeError("retailer_starter_monthly", "retailer", 31)).toContain("Unpublish 1");
    expect(planChangeError("retailer_starter_monthly", "retailer", 30)).toBeNull();
  });
  it("blocks 151 on Growth but permits unlimited on Scale", () => {
    expect(planChangeError("retailer_growth_yearly", "retailer", 151)).toContain("150");
    expect(planChangeError("retailer_scale_yearly", "retailer", 10000)).toBeNull();
  });
  it("rejects cross-account plan switches", () => {
    expect(planChangeError("consumer_pro_monthly", "retailer", 0)).not.toBeNull();
  });
  it("waits for delayed settlement and accepts zero-payment trials", () => {
    expect(paymentCanSync("checkout.session.completed", { payment_status: "unpaid" })).toBe(false);
    expect(paymentCanSync("checkout.session.completed", { payment_status: "no_payment_required" })).toBe(true);
    expect(paymentCanSync("checkout.session.async_payment_succeeded", {})).toBe(true);
    expect(paymentCanSync("invoice.paid", {})).toBe(true);
  });
  it("supports current invoice subscription references", () => {
    expect(subscriptionIdFromPayment({ parent: { subscription_details: { subscription: "sub_123" } } })).toBe("sub_123");
  });
  it("rejects public keys and missing cron secrets", () => {
    expect(cronAuthorized(new Request("https://example.test", { headers: { apikey: "public" } }), "private-test")).toBe(false);
    expect(cronAuthorized(new Request("https://example.test", { headers: { "x-cron-key": "private-test" } }), "private-test")).toBe(true);
    expect(cronAuthorized(new Request("https://example.test"), undefined)).toBe(false);
  });
  it("does not grant expired or open-ended past-due access", () => {
    expect(subscriptionIsValid({ status: "active", current_period_end: "2020-01-01" })).toBe(false);
    expect(subscriptionIsValid({ status: "past_due" })).toBe(false);
    expect(subscriptionIsValid({ status: "canceled", current_period_end: "2099-01-01" })).toBe(true);
  });
});