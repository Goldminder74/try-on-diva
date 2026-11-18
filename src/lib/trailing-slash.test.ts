import { describe, expect, it } from "vitest";
import { trailingSlashTarget as t } from "./trailing-slash";
const B = "https://wigsmi.com";
describe("trailingSlashTarget", () => {
  it("strips the slash on pages", () => expect(t(`${B}/catalog/`)).toBe("/catalog"));
  it("keeps the query string", () => expect(t(`${B}/pricing/?a=1`)).toBe("/pricing?a=1"));
  it("leaves the root alone", () => expect(t(`${B}/`)).toBeNull());
  it("leaves API paths alone", () => expect(t(`${B}/api/public/x/`)).toBeNull());
  it("leaves assets alone", () => expect(t(`${B}/files/a.pdf/`)).toBeNull());
  it("ignores POST", () => expect(t(`${B}/faq/`, "POST")).toBeNull());
});
