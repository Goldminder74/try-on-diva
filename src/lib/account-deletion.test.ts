import { describe, expect, it } from "vitest";
import { isDeleteConfirmed, isOwnStoragePath, shouldCancelOnDelete } from "./account-deletion";

describe("account deletion rules", () => {
  it("requires the exact word DELETE", () => {
    expect(isDeleteConfirmed("DELETE")).toBe(true);
    expect(isDeleteConfirmed("delete")).toBe(false);
    expect(isDeleteConfirmed("")).toBe(false);
  });
  it("only treats files in the user's own folder as theirs", () => {
    expect(isOwnStoragePath("u1/a.png", "u1")).toBe(true);
    expect(isOwnStoragePath("u2/a.png", "u1")).toBe(false);
    expect(isOwnStoragePath("anon/a.png", "u1")).toBe(false);
    expect(isOwnStoragePath("u1/../u2/a.png", "u1")).toBe(false);
  });
  it("cancels live subscriptions but not already cancelled ones", () => {
    expect(shouldCancelOnDelete("active")).toBe(true);
    expect(shouldCancelOnDelete("trialing")).toBe(true);
    expect(shouldCancelOnDelete("canceled")).toBe(false);
  });
});
