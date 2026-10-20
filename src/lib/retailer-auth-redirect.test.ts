import { describe, expect, it } from "vitest";
import { retailerAuthRedirect } from "./retailer-auth-redirect";

describe("retailer login return destination", () => {
  it("returns to the protected page requested before login", () => {
    expect(retailerAuthRedirect("?redirect=%2Fportal%2Fcatalog")).toBe("/portal/catalog");
  });
  it("preserves plan checkout selection", () => {
    expect(retailerAuthRedirect("?plan=growth&interval=yearly&redirect=%2Fportal")).toBe("/portal/billing?plan=growth&interval=yearly");
  });
  it("defaults to the portal", () => {
    expect(retailerAuthRedirect("")).toBe("/portal");
  });
  it("does not navigate to an external website", () => {
    for (const target of ["https://example.com", "//example.com", "/\\example.com"]) {
      expect(retailerAuthRedirect(`?redirect=${encodeURIComponent(target)}`)).toBe("/portal");
    }
  });
});