import { describe, expect, it } from "vitest";
import { utmFromCookieHeader, utmFromSearch } from "./utm";

describe("utm", () => {
  it("reads the three tags from a landing URL", () => {
    expect(utmFromSearch("?utm_source=instagram&utm_medium=social&utm_campaign=launch&x=1")).toEqual({
      utm_source: "instagram", utm_medium: "social", utm_campaign: "launch",
    });
  });
  it("ignores URLs without tags", () => {
    expect(utmFromSearch("?sort=new")).toBeNull();
  });
  it("reads the stored cookie", () => {
    const v = encodeURIComponent(JSON.stringify({ utm_source: "tiktok" }));
    expect(utmFromCookieHeader(`a=1; wigsmi_utm=${v}`).utm_source).toBe("tiktok");
    expect(utmFromCookieHeader("a=1").utm_source).toBeNull();
  });
});
